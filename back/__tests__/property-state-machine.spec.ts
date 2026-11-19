import request from "supertest";
import {
  OperationType,
  PropertyStatus,
  VisitRequestStatus,
} from "../src/entities/enums";
import { HttpError } from "../src/errors/http-error";
import { assertValidTransition } from "../src/services/property-transitions";
import { assertValidVisitTransition } from "../src/services/visit-request-transitions";
import {
  app,
  bearer,
  changeStatus,
  closeDatabase,
  createProperty,
  createPublished,
  createSeller,
  moveThrough,
  propertyBody,
  setupDatabase,
  TestSeller,
} from "./helpers";

const { DRAFT, PUBLISHED, RESERVED, PAUSED, SOLD, RENTED, CANCELLED } =
  PropertyStatus;
const ALL_STATUSES = Object.values(PropertyStatus);

// ---------- Reglas puras (sin base de datos) ----------

// Tabla escrita a mano a partir del enunciado, independiente de la del codigo: si alguien toca la maquina, este test avisa.
const VALID: Array<[PropertyStatus, PropertyStatus]> = [
  [DRAFT, PUBLISHED],
  [PUBLISHED, RESERVED],
  [PUBLISHED, PAUSED],
  [PUBLISHED, CANCELLED],
  [RESERVED, PUBLISHED],
  [RESERVED, SOLD], // solo SALE (ver mas abajo)
  [RESERVED, CANCELLED],
  [PAUSED, PUBLISHED],
  [PAUSED, CANCELLED],
];

describe("assertValidTransition (Property)", () => {
  it.each(VALID)("permite %s -> %s", (from, to) => {
    expect(() =>
      assertValidTransition(from, to, OperationType.SALE),
    ).not.toThrow();
  });

  it("RESERVED -> RENTED es valida para un alquiler", () => {
    expect(() =>
      assertValidTransition(RESERVED, RENTED, OperationType.RENT),
    ).not.toThrow();
  });

  it("rechaza con 400 TODAS las demas combinaciones", () => {
    const validKeys = new Set(
      [...VALID, [RESERVED, RENTED]].map(([from, to]) => `${from}>${to}`),
    );
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        if (validKeys.has(`${from}>${to}`)) continue;
        try {
          assertValidTransition(from, to, OperationType.SALE);
          throw new Error(`Se permitio ${from} -> ${to}`);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpError);
          expect((error as HttpError).status).toBe(400);
        }
      }
    }
  });

  it("SOLD, RENTED y CANCELLED son finales: no salen a ningun estado", () => {
    for (const final of [SOLD, RENTED, CANCELLED]) {
      for (const to of ALL_STATUSES) {
        expect(() =>
          assertValidTransition(final, to, OperationType.SALE),
        ).toThrow(HttpError);
      }
    }
  });

  it("SOLD solo para ventas y RENTED solo para alquileres", () => {
    expect(() =>
      assertValidTransition(RESERVED, SOLD, OperationType.RENT),
    ).toThrow(HttpError);
    expect(() =>
      assertValidTransition(RESERVED, RENTED, OperationType.SALE),
    ).toThrow(HttpError);
  });
});

describe("assertValidVisitTransition (VisitRequest)", () => {
  const {
    PENDING,
    CONFIRMED,
    COMPLETED,
    CANCELLED: V_CANCELLED,
    REJECTED,
  } = VisitRequestStatus;
  const validVisit: Array<[VisitRequestStatus, VisitRequestStatus]> = [
    [PENDING, CONFIRMED],
    [PENDING, REJECTED],
    [PENDING, V_CANCELLED],
    [CONFIRMED, COMPLETED],
    [CONFIRMED, REJECTED],
    [CONFIRMED, V_CANCELLED],
  ];

  it.each(validVisit)("permite %s -> %s", (from, to) => {
    expect(() => assertValidVisitTransition(from, to)).not.toThrow();
  });

  it("rechaza el resto, incluida PENDING -> COMPLETED (hay que confirmar primero)", () => {
    const validKeys = new Set(validVisit.map(([from, to]) => `${from}>${to}`));
    for (const from of Object.values(VisitRequestStatus)) {
      for (const to of Object.values(VisitRequestStatus)) {
        if (validKeys.has(`${from}>${to}`)) continue;
        expect(() => assertValidVisitTransition(from, to)).toThrow(HttpError);
      }
    }
  });
});

// ---------- A traves de la API (con base de datos) ----------

let seller: TestSeller;

beforeAll(async () => {
  await setupDatabase();
  seller = await createSeller();
});
afterAll(closeDatabase);

describe("PATCH /properties/:id/status", () => {
  it("el camino feliz de una venta: DRAFT -> PUBLISHED -> RESERVED -> SOLD", async () => {
    const property = await createProperty(seller);

    const published = await changeStatus(seller, property.id, PUBLISHED).expect(
      200,
    );
    expect(published.body.status).toBe(PUBLISHED);
    expect(published.body.publishedAt).not.toBeNull();

    await changeStatus(seller, property.id, RESERVED).expect(200);
    const sold = await changeStatus(seller, property.id, SOLD).expect(200);
    expect(sold.body.status).toBe(SOLD);
  });

  it("el camino feliz de un alquiler termina en RENTED", async () => {
    const property = await createProperty(seller, {
      operation: OperationType.RENT,
    });
    await moveThrough(seller, property.id, PUBLISHED, RESERVED);
    const rented = await changeStatus(seller, property.id, RENTED).expect(200);
    expect(rented.body.status).toBe(RENTED);
  });

  it("rechaza con 400 saltear estados: DRAFT -> SOLD, DRAFT -> RESERVED y PUBLISHED -> SOLD", async () => {
    const property = await createProperty(seller);
    await changeStatus(seller, property.id, SOLD).expect(400);
    await changeStatus(seller, property.id, RESERVED).expect(400);

    await moveThrough(seller, property.id, PUBLISHED);
    const response = await changeStatus(seller, property.id, SOLD).expect(400);
    expect(response.body.error).toMatch(/Transición no permitida/);
  });

  it("un borrador no se puede cancelar (se elimina)", async () => {
    const property = await createProperty(seller);
    await changeStatus(seller, property.id, CANCELLED).expect(400);
  });

  it("una venta no puede pasar a RENTED ni un alquiler a SOLD", async () => {
    const sale = await createProperty(seller);
    await moveThrough(seller, sale.id, PUBLISHED, RESERVED);
    await changeStatus(seller, sale.id, RENTED).expect(400);

    const rent = await createProperty(seller, {
      operation: OperationType.RENT,
    });
    await moveThrough(seller, rent.id, PUBLISHED, RESERVED);
    await changeStatus(seller, rent.id, SOLD).expect(400);
  });

  it("PUBLISHED <-> PAUSED y RESERVED -> PUBLISHED se pueden", async () => {
    const property = await createPublished(seller);
    await moveThrough(
      seller,
      property.id,
      PAUSED,
      PUBLISHED,
      RESERVED,
      PUBLISHED,
    );
  });

  it("pausar y republicar no cambia la fecha de primera publicacion", async () => {
    const property = await createProperty(seller);
    const first = await changeStatus(seller, property.id, PUBLISHED).expect(
      200,
    );
    await moveThrough(seller, property.id, PAUSED);
    const again = await changeStatus(seller, property.id, PUBLISHED).expect(
      200,
    );
    expect(again.body.publishedAt).toBe(first.body.publishedAt);
  });

  it.each([SOLD, CANCELLED])(
    "%s es un estado final: no se sale de ahi",
    async (finalStatus) => {
      const property = await createProperty(seller);
      if (finalStatus === SOLD) {
        await moveThrough(seller, property.id, PUBLISHED, RESERVED, SOLD);
      } else {
        await moveThrough(seller, property.id, PUBLISHED, CANCELLED);
      }

      for (const to of ALL_STATUSES) {
        await changeStatus(seller, property.id, to).expect(400);
      }
    },
  );

  it("un estado que no existe da 400 con detalle", async () => {
    const property = await createProperty(seller);
    const response = await changeStatus(
      seller,
      property.id,
      "INVENTADO",
    ).expect(400);
    expect(response.body.details[0].field).toBe("status");
  });

  it("una transicion rechazada no cambia el estado", async () => {
    const property = await createProperty(seller);
    await changeStatus(seller, property.id, SOLD).expect(400);
    const mine = await request(app)
      .get("/agencies/me/properties")
      .query({ status: DRAFT, limit: 50 })
      .set(bearer(seller.token))
      .expect(200);
    expect(mine.body.items.map((item: { id: number }) => item.id)).toContain(
      property.id,
    );
  });

  it("solo el dueño: otra inmobiliaria recibe 403, sin token 401 y un id inexistente 404", async () => {
    const property = await createProperty(seller);
    const other = await createSeller();

    await changeStatus(other, property.id, PUBLISHED).expect(403);
    await request(app)
      .patch(`/properties/${property.id}/status`)
      .send({ status: PUBLISHED })
      .expect(401);
    await changeStatus(seller, 999999999, PUBLISHED).expect(404);
  });
});

describe("Historial de estados", () => {
  it("registra la creacion y cada cambio, en orden y sin modificar los anteriores", async () => {
    const property = await createProperty(seller);
    await moveThrough(seller, property.id, PUBLISHED, RESERVED, SOLD);

    const response = await request(app)
      .get(`/properties/${property.id}/status-history`)
      .set(bearer(seller.token))
      .expect(200);
    const steps = response.body.map(
      (entry: { fromStatus: string | null; toStatus: string }) => [
        entry.fromStatus,
        entry.toStatus,
      ],
    );
    expect(steps).toEqual([
      [null, DRAFT],
      [DRAFT, PUBLISHED],
      [PUBLISHED, RESERVED],
      [RESERVED, SOLD],
    ]);
  });

  it("una transicion rechazada no deja registro", async () => {
    const property = await createProperty(seller);
    await changeStatus(seller, property.id, SOLD).expect(400);

    const response = await request(app)
      .get(`/properties/${property.id}/status-history`)
      .set(bearer(seller.token))
      .expect(200);
    expect(response.body).toHaveLength(1);
  });

  it("solo lo ve el dueño", async () => {
    const property = await createProperty(seller);
    const other = await createSeller();
    await request(app)
      .get(`/properties/${property.id}/status-history`)
      .set(bearer(other.token))
      .expect(403);
  });
});

describe("Reglas que dependen del estado", () => {
  it("no se puede editar una propiedad vendida (409)", async () => {
    const property = await createProperty(seller);
    await moveThrough(seller, property.id, PUBLISHED, RESERVED, SOLD);
    await request(app)
      .put(`/properties/${property.id}`)
      .set(bearer(seller.token))
      .send(propertyBody())
      .expect(409);
  });

  it("no se puede editar una propiedad cancelada (409), pero si una pausada", async () => {
    const paused = await createPublished(seller);
    await moveThrough(seller, paused.id, PAUSED);
    await request(app)
      .put(`/properties/${paused.id}`)
      .set(bearer(seller.token))
      .send(propertyBody())
      .expect(200);

    const cancelled = await createPublished(seller);
    await moveThrough(seller, cancelled.id, CANCELLED);
    await request(app)
      .put(`/properties/${cancelled.id}`)
      .set(bearer(seller.token))
      .send(propertyBody())
      .expect(409);
  });

  it("solo se elimina un borrador: una publicada da 409", async () => {
    const draft = await createProperty(seller);
    await request(app)
      .delete(`/properties/${draft.id}`)
      .set(bearer(seller.token))
      .expect(204);

    const published = await createPublished(seller);
    await request(app)
      .delete(`/properties/${published.id}`)
      .set(bearer(seller.token))
      .expect(409);
  });

  it("con una visita CONFIRMADA no se puede editar ni cancelar, pero si pausar", async () => {
    const property = await createPublished(seller);
    const visit = await request(app)
      .post(`/properties/${property.id}/visit-requests`)
      .send({
        requesterName: "Interesado",
        requesterPhone: "11 5555-9999",
        proposedAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .expect(201);
    await request(app)
      .patch(`/visit-requests/${visit.body.id}/status`)
      .set(bearer(seller.token))
      .send({ status: "CONFIRMED" })
      .expect(200);

    await request(app)
      .put(`/properties/${property.id}`)
      .set(bearer(seller.token))
      .send(propertyBody())
      .expect(409);
    await changeStatus(seller, property.id, CANCELLED).expect(409);
    await changeStatus(seller, property.id, PAUSED).expect(200);
  });

  it("una visita solo se puede pedir sobre una propiedad PUBLISHED", async () => {
    const draft = await createProperty(seller);
    const body = {
      requesterName: "Interesado",
      requesterPhone: "11 5555-9999",
      proposedAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await request(app)
      .post(`/properties/${draft.id}/visit-requests`)
      .send(body)
      .expect(404); // el borrador "no existe" para el publico

    const paused = await createPublished(seller);
    await moveThrough(seller, paused.id, PAUSED);
    await request(app)
      .post(`/properties/${paused.id}/visit-requests`)
      .send(body)
      .expect(409);
  });
});

import request from "supertest";
import {
  app,
  closeDatabase,
  createProperty,
  createPublished,
  createSeller,
  moveThrough,
  setupDatabase,
  unique,
} from "./helpers";

// Todas las propiedades de este archivo comparten una zona unica, y cada busqueda la incluye (area=ZONE).
// Asi los resultados no dependen de lo que hayan creado otros tests en la misma base.
const ZONE = unique("zona-busqueda");
const find = (query: Record<string, string | number> = {}) =>
  request(app)
    .get("/properties")
    .query({ area: ZONE, ...query });
const titlesOf = (response: request.Response): string[] =>
  response.body.items.map((item: { title: string }) => item.title);

let draftId: number;

const T = {
  casaVenta: `Casa ${ZONE} grande`,
  deptoVenta: `Depto ${ZONE} chico`,
  deptoAlquiler: `Depto ${ZONE} alquiler`,
  local: `Local ${ZONE}`,
  borrador: `Borrador ${ZONE}`,
  pausada: `Pausada ${ZONE}`,
  vendida: `Vendida ${ZONE}`,
};

beforeAll(async () => {
  await setupDatabase();
  const seller = await createSeller();
  const base = { area: `${ZONE} Norte` };

  await createPublished(seller, {
    ...base,
    title: T.casaVenta,
    type: "HOUSE",
    operation: "SALE",
    price: 200000,
    currency: "USD",
    totalAreaM2: 300,
    coveredAreaM2: 200,
    rooms: 6,
    tags: ["pileta", "cochera"],
  });
  await createPublished(seller, {
    ...base,
    title: T.deptoVenta,
    type: "APARTMENT",
    operation: "SALE",
    price: 80000,
    currency: "USD",
    totalAreaM2: 50,
    coveredAreaM2: 45,
    rooms: 2,
    tags: ["balcon", "pileta climatizada"],
  });
  await createPublished(seller, {
    ...base,
    title: T.deptoAlquiler,
    type: "APARTMENT",
    operation: "RENT",
    price: 600000,
    currency: "ARS",
    totalAreaM2: 60,
    coveredAreaM2: 55,
    rooms: 2,
    tags: ["cochera", "balcon"],
    description: "Luminoso con vista al río",
  });
  await createPublished(seller, {
    ...base,
    title: T.local,
    type: "COMMERCIAL",
    operation: "RENT",
    price: 900000,
    currency: "ARS",
    totalAreaM2: 90,
    coveredAreaM2: 90,
    rooms: null,
    bedrooms: null,
    bathrooms: null,
    tags: [],
  });

  // Estas tres NO tienen que aparecer nunca en el listado publico.
  draftId = (await createProperty(seller, { ...base, title: T.borrador })).id;
  const paused = await createPublished(seller, { ...base, title: T.pausada });
  await moveThrough(seller, paused.id, "PAUSED");
  const sold = await createPublished(seller, { ...base, title: T.vendida });
  await moveThrough(seller, sold.id, "RESERVED", "SOLD");
});
afterAll(closeDatabase);

describe("GET /properties: que propiedades aparecen", () => {
  it("solo las PUBLISHED: no salen borradores, pausadas ni vendidas", async () => {
    const response = await find({ limit: 50 }).expect(200);
    expect(titlesOf(response).sort()).toEqual(
      [T.casaVenta, T.deptoVenta, T.deptoAlquiler, T.local].sort(),
    );
    expect(response.body.total).toBe(4);
  });

  it("es publico: no pide token", async () => {
    await find().expect(200);
  });

  it("el detalle publico de un borrador da 404", async () => {
    await request(app).get(`/properties/${draftId}`).expect(404);
  });
});

describe("GET /properties: filtros", () => {
  it("por tipo", async () => {
    expect(
      titlesOf(await find({ type: "APARTMENT" }).expect(200)).sort(),
    ).toEqual([T.deptoVenta, T.deptoAlquiler].sort());
    expect(titlesOf(await find({ type: "COMMERCIAL" }).expect(200))).toEqual([
      T.local,
    ]);
  });

  it("por operacion", async () => {
    expect(
      titlesOf(await find({ operation: "SALE" }).expect(200)).sort(),
    ).toEqual([T.casaVenta, T.deptoVenta].sort());
    expect(
      titlesOf(await find({ operation: "RENT" }).expect(200)).sort(),
    ).toEqual([T.deptoAlquiler, T.local].sort());
  });

  it("por moneda", async () => {
    expect(
      titlesOf(await find({ currency: "USD" }).expect(200)).sort(),
    ).toEqual([T.casaVenta, T.deptoVenta].sort());
  });

  it("por rango de precio (los extremos estan incluidos)", async () => {
    expect(
      titlesOf(
        await find({
          currency: "USD",
          minPrice: 80000,
          maxPrice: 150000,
        }).expect(200),
      ),
    ).toEqual([T.deptoVenta]);
    expect(
      titlesOf(await find({ currency: "USD", minPrice: 150000 }).expect(200)),
    ).toEqual([T.casaVenta]);
    expect(
      titlesOf(await find({ currency: "ARS", maxPrice: 600000 }).expect(200)),
    ).toEqual([T.deptoAlquiler]);
    expect((await find({ minPrice: 99999999 }).expect(200)).body.total).toBe(0);
  });

  it("por zona, sin distinguir mayusculas y buscando dentro del texto", async () => {
    expect(
      (
        await request(app)
          .get("/properties")
          .query({ area: `${ZONE.toUpperCase()} norte` })
          .expect(200)
      ).body.total,
    ).toBe(4);
    expect(
      (
        await request(app)
          .get("/properties")
          .query({ area: `${ZONE} sur` })
          .expect(200)
      ).body.total,
    ).toBe(0);
  });

  it("por ambientes (cantidad exacta)", async () => {
    expect(titlesOf(await find({ rooms: 2 }).expect(200)).sort()).toEqual(
      [T.deptoVenta, T.deptoAlquiler].sort(),
    );
    expect(titlesOf(await find({ rooms: 6 }).expect(200))).toEqual([
      T.casaVenta,
    ]);
  });

  it("por amenities: tiene que tener TODAS las pedidas", async () => {
    expect(
      titlesOf(await find({ amenities: "cochera" }).expect(200)).sort(),
    ).toEqual([T.casaVenta, T.deptoAlquiler].sort());
    expect(
      titlesOf(await find({ amenities: "cochera,balcon" }).expect(200)),
    ).toEqual([T.deptoAlquiler]);
    expect(
      (await find({ amenities: "cochera,quincho" }).expect(200)).body.total,
    ).toBe(0);
  });

  it("un amenity no coincide con otro que lo contiene: 'pileta' no trae 'pileta climatizada'", async () => {
    expect(titlesOf(await find({ amenities: "pileta" }).expect(200))).toEqual([
      T.casaVenta,
    ]);
    expect(
      titlesOf(await find({ amenities: "pileta climatizada" }).expect(200)),
    ).toEqual([T.deptoVenta]);
  });

  it("por texto libre en titulo o descripcion", async () => {
    expect(titlesOf(await find({ q: "grande" }).expect(200))).toEqual([
      T.casaVenta,
    ]);
    expect(titlesOf(await find({ q: "vista al río" }).expect(200))).toEqual([
      T.deptoAlquiler,
    ]);
  });

  it("los comodines de LIKE se buscan como texto: q=% no trae todo", async () => {
    expect((await find({ q: "%" }).expect(200)).body.total).toBe(0);
    expect((await find({ q: "_" }).expect(200)).body.total).toBe(0);
  });

  it("los filtros se combinan", async () => {
    expect(
      titlesOf(
        await find({
          type: "APARTMENT",
          operation: "RENT",
          amenities: "balcon",
        }).expect(200),
      ),
    ).toEqual([T.deptoAlquiler]);
    expect(
      (await find({ type: "HOUSE", operation: "RENT" }).expect(200)).body.total,
    ).toBe(0);
  });

  it("un filtro vacio se ignora", async () => {
    const response = await find({
      type: "",
      q: "",
      minPrice: "",
      limit: 50,
    }).expect(200);
    expect(response.body.total).toBe(4);
  });

  it("valores invalidos dan 400 con el campo", async () => {
    const type = await find({ type: "CASTILLO" }).expect(400);
    expect(type.body.details[0].field).toBe("type");
    expect(
      (await find({ minPrice: "abc" }).expect(400)).body.details[0].field,
    ).toBe("minPrice");
    expect(
      (await find({ maxPrice: -5 }).expect(400)).body.details[0].field,
    ).toBe("maxPrice");
    expect(
      (await find({ sort: "color" }).expect(400)).body.details[0].field,
    ).toBe("sort");
    expect(
      (await find({ order: "arriba" }).expect(400)).body.details[0].field,
    ).toBe("order");
  });
});

describe("GET /properties: orden y paginado", () => {
  it("ordena por precio ascendente y descendente", async () => {
    const asc = await find({
      currency: "USD",
      sort: "price",
      order: "asc",
    }).expect(200);
    expect(asc.body.items.map((i: { price: number }) => i.price)).toEqual([
      80000, 200000,
    ]);
    const desc = await find({
      currency: "USD",
      sort: "price",
      order: "desc",
    }).expect(200);
    expect(desc.body.items.map((i: { price: number }) => i.price)).toEqual([
      200000, 80000,
    ]);
  });

  it("ordena por superficie total", async () => {
    const response = await find({ sort: "totalArea", order: "asc" }).expect(
      200,
    );
    expect(
      response.body.items.map((i: { totalAreaM2: number }) => i.totalAreaM2),
    ).toEqual([50, 60, 90, 300]);
  });

  it("por defecto, las mas recientes primero", async () => {
    const response = await find().expect(200);
    const dates = response.body.items.map((i: { publishedAt: string }) =>
      Date.parse(i.publishedAt),
    );
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it("pagina: total no cambia, cada pagina trae su parte y no se repiten", async () => {
    const first = await find({
      sort: "price",
      order: "asc",
      limit: 3,
      page: 1,
    }).expect(200);
    const second = await find({
      sort: "price",
      order: "asc",
      limit: 3,
      page: 2,
    }).expect(200);

    expect(first.body).toMatchObject({ page: 1, limit: 3, total: 4 });
    expect(second.body).toMatchObject({ page: 2, limit: 3, total: 4 });
    expect(first.body.items).toHaveLength(3);
    expect(second.body.items).toHaveLength(1);
    expect(new Set([...titlesOf(first), ...titlesOf(second)]).size).toBe(4);
  });

  it("una pagina fuera de rango devuelve lista vacia (no error) y limit tiene tope", async () => {
    const empty = await find({ page: 99 }).expect(200);
    expect(empty.body.items).toEqual([]);
    expect(empty.body.total).toBe(4);

    const capped = await find({ limit: 100000 }).expect(200);
    expect(capped.body.limit).toBe(50);
  });
});

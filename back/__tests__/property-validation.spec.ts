import request from "supertest";
import {
  app,
  bearer,
  closeDatabase,
  createProperty,
  createSeller,
  propertyBody,
  setupDatabase,
  TestSeller,
} from "./helpers";

let seller: TestSeller;

beforeAll(async () => {
  await setupDatabase();
  seller = await createSeller();
});
afterAll(closeDatabase);

const post = (body: unknown) =>
  request(app)
    .post("/properties")
    .set(bearer(seller.token))
    .send(body as object);
const fieldsOf = (response: request.Response): string[] =>
  response.body.details.map((d: { field: string }) => d.field);

describe("POST /properties: validacion de precio y superficie", () => {
  it("crea la propiedad en DRAFT y sin fecha de publicacion", async () => {
    const response = await post(propertyBody()).expect(201);
    expect(response.body.status).toBe("DRAFT");
    expect(response.body.publishedAt).toBeNull();
  });

  it("ignora un status mandado por el cliente: siempre nace en DRAFT", async () => {
    const response = await post(propertyBody({ status: "PUBLISHED" })).expect(
      201,
    );
    expect(response.body.status).toBe("DRAFT");
  });

  it.each([0, -1, -50000])("rechaza un precio de %p", async (price) => {
    const response = await post(propertyBody({ price })).expect(400);
    expect(fieldsOf(response)).toContain("price");
  });

  it("rechaza un precio que no es un numero", async () => {
    const response = await post(propertyBody({ price: "caro" })).expect(400);
    expect(fieldsOf(response)).toContain("price");
  });

  it.each([0, -10])(
    "rechaza una superficie total de %p",
    async (totalAreaM2) => {
      const response = await post(propertyBody({ totalAreaM2 })).expect(400);
      expect(fieldsOf(response)).toContain("totalAreaM2");
    },
  );

  it("rechaza una superficie cubierta negativa o mayor a la total", async () => {
    const negative = await post(propertyBody({ coveredAreaM2: -5 })).expect(
      400,
    );
    expect(fieldsOf(negative)).toContain("coveredAreaM2");

    const bigger = await post(
      propertyBody({ coveredAreaM2: 200, totalAreaM2: 100 }),
    ).expect(400);
    expect(fieldsOf(bigger)).toContain("coveredAreaM2");
  });

  it("rechaza ambientes negativos o decimales", async () => {
    const negative = await post(propertyBody({ rooms: -1 })).expect(400);
    expect(fieldsOf(negative)).toContain("rooms");
    const decimal = await post(propertyBody({ rooms: 2.5 })).expect(400);
    expect(fieldsOf(decimal)).toContain("rooms");
  });

  it("un terreno no puede tener ambientes", async () => {
    const response = await post(
      propertyBody({
        type: "LAND",
        coveredAreaM2: null,
        rooms: 3,
        bedrooms: null,
        bathrooms: null,
      }),
    ).expect(400);
    expect(fieldsOf(response)).toContain("rooms");
  });

  it("rechaza tipo y operacion fuera del enum", async () => {
    const response = await post(
      propertyBody({ type: "CASTILLO", operation: "TRUEQUE" }),
    ).expect(400);
    expect(fieldsOf(response)).toEqual(
      expect.arrayContaining(["type", "operation"]),
    );
  });

  it("exige exactamente una foto de portada", async () => {
    const none = await post(
      propertyBody({
        images: [{ url: "https://example.com/a.jpg", isCover: false }],
      }),
    ).expect(400);
    expect(fieldsOf(none)).toContain("images");

    const two = await post(
      propertyBody({
        images: [
          { url: "https://example.com/a.jpg", isCover: true },
          { url: "https://example.com/b.jpg", isCover: true },
        ],
      }),
    ).expect(400);
    expect(fieldsOf(two)).toContain("images");
  });

  it("sin token responde 401", async () => {
    await request(app).post("/properties").send(propertyBody()).expect(401);
  });
});

describe("PUT /properties/:id: la validacion tambien aplica al editar", () => {
  it("un precio invalido da 400 y la propiedad queda como estaba", async () => {
    const property = await createProperty(seller, { price: 90000 });

    await request(app)
      .put(`/properties/${property.id}`)
      .set(bearer(seller.token))
      .send(propertyBody({ price: -1 }))
      .expect(400);

    const mine = await request(app)
      .get("/agencies/me/properties")
      .query({ limit: 50 })
      .set(bearer(seller.token))
      .expect(200);
    const unchanged = mine.body.items.find(
      (item: { id: number }) => item.id === property.id,
    );
    expect(unchanged.price).toBe(90000);
  });

  it("una edicion valida se guarda", async () => {
    const property = await createProperty(seller);
    const response = await request(app)
      .put(`/properties/${property.id}`)
      .set(bearer(seller.token))
      .send(propertyBody({ price: 123456 }))
      .expect(200);
    expect(response.body.price).toBe(123456);
  });
});

describe("GET /agencies/me/properties/:id: una propiedad propia, incluso en borrador", () => {
  it("el dueño ve su borrador (el detalle publico da 404)", async () => {
    const draft = await createProperty(seller);

    await request(app).get(`/properties/${draft.id}`).expect(404);
    const response = await request(app)
      .get(`/agencies/me/properties/${draft.id}`)
      .set(bearer(seller.token))
      .expect(200);
    expect(response.body).toMatchObject({
      id: draft.id,
      status: "DRAFT",
      title: draft.title,
    });
  });

  it("otra inmobiliaria recibe 403, un id inexistente 404 y sin token 401", async () => {
    const draft = await createProperty(seller);
    const other = await createSeller();

    await request(app)
      .get(`/agencies/me/properties/${draft.id}`)
      .set(bearer(other.token))
      .expect(403);
    await request(app)
      .get("/agencies/me/properties/999999999")
      .set(bearer(seller.token))
      .expect(404);
    await request(app).get(`/agencies/me/properties/${draft.id}`).expect(401);
  });
});

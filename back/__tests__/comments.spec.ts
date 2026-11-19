import request from "supertest";
import { app, bearer, closeDatabase, createPublished, createSeller, setupDatabase, TestSeller } from "./helpers";

let seller: TestSeller;

beforeAll(async () => {
  await setupDatabase();
  seller = await createSeller();
});

afterAll(closeDatabase);

async function comment(propertyId: number, content: string) {
  const response = await request(app).post(`/properties/${propertyId}/comments`).send({ authorName: "Ana", content }).expect(201);
  return response.body as { id: number };
}

describe("GET /agencies/:id/comments: consultas recibidas por todas las propiedades", () => {
  it("junta las consultas de varias propiedades, con su propiedad, las mas nuevas primero", async () => {
    const first = await createPublished(seller);
    const second = await createPublished(seller);
    await comment(first.id, "Primera");
    await comment(second.id, "Segunda");

    const response = await request(app).get(`/agencies/${seller.agencyId}/comments`).set(bearer(seller.token)).expect(200);
    expect(response.body).toMatchObject({ page: 1, limit: 10, total: 2 });
    expect(response.body.items.map((c: { content: string }) => c.content)).toEqual(["Segunda", "Primera"]);
    expect(response.body.items[0]).toMatchObject({ authorName: "Ana", reply: null, property: { id: second.id, title: second.title } });
  });

  it("answered=false trae solo las pendientes y answered=true solo las respondidas", async () => {
    const property = await createPublished(seller);
    const pending = await comment(property.id, "Sin responder");
    const answered = await comment(property.id, "Para responder");
    await request(app).patch(`/comments/${answered.id}/reply`).set(bearer(seller.token)).send({ reply: "Si, acepta mascotas." }).expect(200);

    const onlyPending = await request(app).get(`/agencies/${seller.agencyId}/comments`).query({ answered: "false", limit: 50 }).set(bearer(seller.token)).expect(200);
    const ids = onlyPending.body.items.map((c: { id: number }) => c.id);
    expect(ids).toContain(pending.id);
    expect(ids).not.toContain(answered.id);
    expect(onlyPending.body.items.every((c: { reply: string | null }) => c.reply === null)).toBe(true);

    const onlyAnswered = await request(app).get(`/agencies/${seller.agencyId}/comments`).query({ answered: "true", limit: 50 }).set(bearer(seller.token)).expect(200);
    expect(onlyAnswered.body.items.map((c: { id: number }) => c.id)).toContain(answered.id);
    expect(onlyAnswered.body.items.every((c: { reply: string | null }) => c.reply !== null)).toBe(true);

    await request(app).get(`/agencies/${seller.agencyId}/comments`).query({ answered: "quizas" }).set(bearer(seller.token)).expect(400);
  });

  it("no mezcla las consultas de otra inmobiliaria: 403 para el otro vendedor, 401 sin token, 404 si no existe", async () => {
    const other = await createSeller();
    await request(app).get(`/agencies/${seller.agencyId}/comments`).set(bearer(other.token)).expect(403);
    await request(app).get(`/agencies/${seller.agencyId}/comments`).expect(401);
    await request(app).get("/agencies/999999999/comments").set(bearer(seller.token)).expect(404);

    const mine = await request(app).get(`/agencies/${other.agencyId}/comments`).set(bearer(other.token)).expect(200);
    expect(mine.body.total).toBe(0);
  });

  it("una consulta se responde una sola vez: la segunda respuesta da 409 y no pisa la primera", async () => {
    const property = await createPublished(seller);
    const { id } = await comment(property.id, "Una pregunta");
    await request(app).patch(`/comments/${id}/reply`).set(bearer(seller.token)).send({ reply: "Primera respuesta" }).expect(200);
    await request(app).patch(`/comments/${id}/reply`).set(bearer(seller.token)).send({ reply: "Segunda respuesta" }).expect(409);

    const publicList = await request(app).get(`/properties/${property.id}/comments`).expect(200);
    expect(publicList.body[0].reply).toBe("Primera respuesta"); // lo que ve el detalle publico
  });
});

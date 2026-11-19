import bcrypt from "bcryptjs";
import request from "supertest";
import { AppDataSource } from "../src/config/data-source";
import { Agency } from "../src/entities/agency.entity";
import { Seller } from "../src/entities/seller.entity";
import {
  app,
  bearer,
  closeDatabase,
  PASSWORD,
  registerBody,
  setupDatabase,
  unique,
} from "./helpers";

beforeAll(setupDatabase);
afterAll(closeDatabase);

describe("POST /auth/register", () => {
  it("crea el vendedor y su inmobiliaria, y no devuelve el hash", async () => {
    const body = registerBody();
    const response = await request(app)
      .post("/auth/register")
      .send(body)
      .expect(201);

    expect(response.body.seller).toMatchObject({
      fullName: body.fullName,
      email: body.email,
    });
    expect(response.body.agency).toMatchObject({ name: body.agency.name });
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    expect(JSON.stringify(response.body)).not.toContain(PASSWORD);
  });

  it("guarda la contraseña hasheada con bcrypt, nunca en texto plano", async () => {
    const body = registerBody();
    await request(app).post("/auth/register").send(body).expect(201);

    const seller = await AppDataSource.getRepository(Seller).findOneByOrFail({
      email: body.email,
    });
    expect(seller.passwordHash).not.toBe(body.password);
    expect(seller.passwordHash).toMatch(/^\$2[aby]\$/); // formato de bcrypt
    expect(await bcrypt.compare(body.password, seller.passwordHash)).toBe(true);
    expect(await bcrypt.compare("otra-clave", seller.passwordHash)).toBe(false);
  });

  it("rechaza un email repetido con 409 (sin distinguir mayusculas)", async () => {
    const body = registerBody();
    await request(app).post("/auth/register").send(body).expect(201);

    const again = registerBody({
      email: body.email,
      agency: { name: unique("Otra"), contactPhone: "11 5555-0000" },
    });
    const response = await request(app)
      .post("/auth/register")
      .send(again)
      .expect(409);
    expect(response.body.error).toMatch(/email/i);
    // El 409 indica el campo, como los 400 de validacion (el front lo muestra junto al input).
    expect(response.body.details).toEqual([
      expect.objectContaining({ field: "email" }),
    ]);

    const upper = registerBody({
      email: body.email.toUpperCase(),
      agency: { name: unique("Otra"), contactPhone: "11 5555-0000" },
    });
    await request(app).post("/auth/register").send(upper).expect(409);
  });

  it("rechaza un nombre de fantasia repetido con 409", async () => {
    const body = registerBody();
    await request(app).post("/auth/register").send(body).expect(201);

    const again = registerBody({
      agency: { name: body.agency.name, contactPhone: "11 5555-0000" },
    });
    const response = await request(app)
      .post("/auth/register")
      .send(again)
      .expect(409);
    expect(response.body.error).toMatch(/nombre de fantas/i);
    expect(response.body.details).toEqual([
      expect.objectContaining({ field: "agency.name" }),
    ]);
  });

  it("un registro rechazado no deja nada a medias: el email queda libre", async () => {
    const first = registerBody();
    await request(app).post("/auth/register").send(first).expect(201);

    // Mismo nombre de fantasia, email nuevo: 409.
    const rejected = registerBody({
      agency: { name: first.agency.name, contactPhone: "11 5555-0000" },
    });
    await request(app).post("/auth/register").send(rejected).expect(409);
    expect(
      await AppDataSource.getRepository(Seller).countBy({
        email: rejected.email,
      }),
    ).toBe(0);

    // Con otro nombre, ese mismo email se puede registrar.
    await request(app)
      .post("/auth/register")
      .send({
        ...rejected,
        agency: { name: unique("Libre"), contactPhone: "11 5555-0000" },
      })
      .expect(201);
  });

  it("no crea dos inmobiliarias con el mismo nombre", async () => {
    const body = registerBody();
    await request(app).post("/auth/register").send(body).expect(201);
    await request(app)
      .post("/auth/register")
      .send(
        registerBody({
          agency: { name: body.agency.name, contactPhone: "11 5555-0000" },
        }),
      )
      .expect(409);
    expect(
      await AppDataSource.getRepository(Agency).countBy({
        name: body.agency.name,
      }),
    ).toBe(1);
  });

  it("valida los datos: contraseña corta, email invalido y faltantes dan 400 con el campo", async () => {
    const short = await request(app)
      .post("/auth/register")
      .send(registerBody({ password: "123" }))
      .expect(400);
    expect(short.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "password" })]),
    );

    const badEmail = await request(app)
      .post("/auth/register")
      .send(registerBody({ email: "no-es-un-email" }))
      .expect(400);
    expect(badEmail.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })]),
    );

    const noAgency = await request(app)
      .post("/auth/register")
      .send({
        fullName: "X",
        email: `${unique("x")}@test.com`,
        password: PASSWORD,
      })
      .expect(400);
    expect(noAgency.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "agency" })]),
    );
  });
});

describe("POST /auth/login y GET /auth/me", () => {
  it("devuelve un token que sirve para entrar a una ruta protegida", async () => {
    const body = registerBody();
    await request(app).post("/auth/register").send(body).expect(201);

    const login = await request(app)
      .post("/auth/login")
      .send({ email: body.email, password: body.password })
      .expect(200);
    expect(typeof login.body.token).toBe("string");

    const me = await request(app)
      .get("/auth/me")
      .set(bearer(login.body.token))
      .expect(200);
    expect(me.body.seller.email).toBe(body.email);
  });

  it("con contraseña incorrecta o email inexistente responde 401 con el mismo mensaje", async () => {
    const body = registerBody();
    await request(app).post("/auth/register").send(body).expect(201);

    const wrongPassword = await request(app)
      .post("/auth/login")
      .send({ email: body.email, password: "incorrecta1" })
      .expect(401);
    const unknownEmail = await request(app)
      .post("/auth/login")
      .send({ email: `${unique("nadie")}@test.com`, password: PASSWORD })
      .expect(401);
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
  });

  it("una ruta protegida sin token o con token invalido responde 401", async () => {
    await request(app).get("/auth/me").expect(401);
    await request(app)
      .get("/auth/me")
      .set(bearer("token-inventado"))
      .expect(401);
  });
});

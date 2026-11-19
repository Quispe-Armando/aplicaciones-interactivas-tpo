import request from "supertest";
import { createApp } from "../src/app";
import { AppDataSource } from "../src/config/data-source";
import { OperationType, PropertyType } from "../src/entities/enums";

// Una sola app por archivo de test (sin conectar nada: la base se abre en setupDatabase()).
export const app = createApp();

// ---------- Base de datos de test ----------

// Se llama en el beforeAll de cada archivo (mismo patron que initializeDatabase() de la Clase 6).
// 1) Se asegura de estar en una base "_test". 2) Crea las tablas con las migraciones. 3) Parte de cero.
export async function setupDatabase(): Promise<void> {
  const database = String(AppDataSource.options.database);
  if (!database.endsWith("_test")) {
    throw new Error(`Los tests se negaron a correr contra la base "${database}": el nombre tiene que terminar en "_test".`);
  }

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  // Si ya estan aplicadas no hace nada, asi que se puede llamar en cada archivo.
  await AppDataSource.runMigrations();

  // Vacia solo las tablas de las entidades (no la tabla "migrations").
  const tables = AppDataSource.entityMetadatas.map((meta) => `"${meta.tableName}"`).join(", ");
  await AppDataSource.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}

export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}

// ---------- Fixtures ----------

// Cada fixture usa nombres/emails unicos, asi ningun test depende de lo que dejo otro.
let counter = 0;
export function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export const PASSWORD = "clave1234";

export interface TestSeller {
  token: string;
  sellerId: number;
  agencyId: number;
  email: string;
  agencyName: string;
}

export function registerBody(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Vendedor de Prueba",
    email: `${unique("vendedor")}@test.com`,
    password: PASSWORD,
    agency: { name: unique("Inmobiliaria"), contactPhone: "11 5555-1234" },
    ...overrides,
  };
}

// Registra un vendedor con su inmobiliaria y lo loguea, todo por la API.
export async function createSeller(): Promise<TestSeller> {
  const body = registerBody();
  const registered = await request(app).post("/auth/register").send(body).expect(201);
  const logged = await request(app).post("/auth/login").send({ email: body.email, password: body.password }).expect(200);
  return {
    token: logged.body.token,
    sellerId: registered.body.seller.id,
    agencyId: registered.body.agency.id,
    email: body.email,
    agencyName: body.agency.name,
  };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export function propertyBody(overrides: Record<string, unknown> = {}) {
  return {
    title: unique("Casa"),
    description: "Propiedad de prueba",
    type: PropertyType.HOUSE,
    operation: OperationType.SALE,
    price: 100000,
    currency: "USD",
    address: "Calle Falsa 123",
    area: "Palermo",
    coveredAreaM2: 80,
    totalAreaM2: 120,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    ageYears: 10,
    tags: [],
    images: [{ url: "https://example.com/foto.jpg", isCover: true }],
    ...overrides,
  };
}

// Crea una propiedad (queda en DRAFT) y devuelve su vista.
export async function createProperty(seller: TestSeller, overrides: Record<string, unknown> = {}) {
  const response = await request(app).post("/properties").set(bearer(seller.token)).send(propertyBody(overrides)).expect(201);
  return response.body as { id: number; status: string; publishedAt: string | null; [key: string]: any };
}

export function changeStatus(seller: TestSeller, propertyId: number, status: string) {
  return request(app).patch(`/properties/${propertyId}/status`).set(bearer(seller.token)).send({ status });
}

// Lleva una propiedad por los estados indicados, exigiendo que cada paso salga bien.
export async function moveThrough(seller: TestSeller, propertyId: number, ...statuses: string[]): Promise<void> {
  for (const status of statuses) {
    await changeStatus(seller, propertyId, status).expect(200);
  }
}

// Crea una propiedad y la publica.
export async function createPublished(seller: TestSeller, overrides: Record<string, unknown> = {}) {
  const property = await createProperty(seller, overrides);
  await moveThrough(seller, property.id, "PUBLISHED");
  return property;
}

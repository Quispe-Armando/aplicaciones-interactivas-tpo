import type { Request, Response } from "express";
import { z } from "zod";
import { OperationType, PropertyStatus, PropertyType } from "../entities/enums";
import { propertyService } from "../services/property.service";
import { parseBody } from "../validation/parse-body";
import { parseId } from "../validation/parse-id";
import { parsePagination } from "../validation/pagination";

// ---------- Body de crear / editar ----------

const requiredText = (label: string, max: number) =>
  z.string(`${label} es obligatorio`).trim().min(1, `${label} es obligatorio`).max(max, `${label} no puede superar ${max} caracteres`);

// Numero entero opcional >= 0 (ambientes, dormitorios, baños, antiguedad).
const optionalCount = (label: string) =>
  z
    .number(`${label} debe ser un número`)
    .int(`${label} debe ser un número entero`)
    .min(0, `${label} no puede ser negativo`)
    .nullish()
    .transform((value: number | null | undefined) => value ?? null);

const imageSchema = z.object({
  url: z.url({ error: "La URL de la foto no es válida" }).max(500),
  isCover: z.boolean("isCover debe ser verdadero o falso"),
});

// PUT reemplaza el recurso completo (Clase 5): se mandan todos los campos obligatorios.
const propertySchema = z
  .object({
    title: requiredText("El título", 160),
    description: requiredText("La descripción", 5000),
    type: z.enum(PropertyType, { error: "El tipo no es válido (HOUSE, APARTMENT, LAND o COMMERCIAL)" }),
    operation: z.enum(OperationType, { error: "La operación no es válida (SALE o RENT)" }),
    price: z.number("El precio debe ser un número").positive("El precio debe ser mayor a 0").max(99999999999999, "El precio es demasiado grande"),
    currency: z.enum(["ARS", "USD"], { error: "La moneda no es válida (ARS o USD)" }),
    address: requiredText("La dirección", 255),
    area: requiredText("La zona", 120),
    coveredAreaM2: z
      .number("La superficie cubierta debe ser un número")
      .positive("La superficie cubierta debe ser mayor a 0")
      .nullish()
      .transform((value: number | null | undefined) => value ?? null),
    totalAreaM2: z.number("La superficie total debe ser un número").positive("La superficie total debe ser mayor a 0"),
    rooms: optionalCount("Los ambientes"),
    bedrooms: optionalCount("Los dormitorios"),
    bathrooms: optionalCount("Los baños"),
    ageYears: optionalCount("La antigüedad"),
    // Amenities: se guardan en minusculas y sin repetir (se guardan separados por coma, por eso no pueden llevarla).
    tags: z
      .array(z.string().trim().toLowerCase().min(1, "Un tag no puede estar vacío").max(40).regex(/^[^,]+$/, "Un tag no puede contener comas"))
      .max(30, "Máximo 30 tags")
      .default([])
      .transform((tags: string[]) => [...new Set(tags)]),
    images: z.array(imageSchema, { error: "Las fotos deben ser una lista" }).min(1, "Hace falta al menos una foto").max(30, "Máximo 30 fotos"),
  })
  .superRefine((data: any, ctx: any) => {
    const covers = data.images.filter((image: { isCover: boolean }) => image.isCover).length;
    if (covers !== 1) {
      ctx.addIssue({ code: "custom", path: ["images"], message: "Exactamente una foto debe ser la portada (isCover: true)" });
    }
    if (data.coveredAreaM2 !== null && data.coveredAreaM2 > data.totalAreaM2) {
      ctx.addIssue({ code: "custom", path: ["coveredAreaM2"], message: "La superficie cubierta no puede superar la total" });
    }
    // Un terreno no tiene superficie cubierta, ambientes, dormitorios ni baños.
    if (data.type === PropertyType.LAND) {
      for (const field of ["coveredAreaM2", "rooms", "bedrooms", "bathrooms"]) {
        if (data[field] !== null) {
          ctx.addIssue({ code: "custom", path: [field], message: "No aplica a un terreno" });
        }
      }
    }
  });

// ---------- Query del listado ----------

// Un filtro vacio (?type=) se trata como si no se hubiera mandado.
const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);

const searchSchema = z.object({
  type: z.preprocess(blankToUndefined, z.enum(PropertyType, { error: "type no es válido" }).optional()),
  operation: z.preprocess(blankToUndefined, z.enum(OperationType, { error: "operation no es válido" }).optional()),
  currency: z.preprocess(blankToUndefined, z.enum(["ARS", "USD"], { error: "currency no es válido" }).optional()),
  minPrice: z.preprocess(blankToUndefined, z.coerce.number({ error: "minPrice debe ser un número" }).min(0).optional()),
  maxPrice: z.preprocess(blankToUndefined, z.coerce.number({ error: "maxPrice debe ser un número" }).min(0).optional()),
  area: z.preprocess(blankToUndefined, z.string().trim().max(120).optional()),
  rooms: z.preprocess(blankToUndefined, z.coerce.number({ error: "rooms debe ser un número" }).int().min(0).optional()),
  // ?amenities=pileta,cochera -> la propiedad tiene que tener todas.
  amenities: z.preprocess(
    blankToUndefined,
    z
      .string()
      .transform((text: string) =>
        text
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      )
      .optional(),
  ),
  q: z.preprocess(blankToUndefined, z.string().trim().max(200).optional()),
  sort: z.preprocess(blankToUndefined, z.enum(["price", "publishedAt", "totalArea"], { error: "sort debe ser price, publishedAt o totalArea" }).default("publishedAt")),
  order: z.preprocess(blankToUndefined, z.enum(["asc", "desc"], { error: "order debe ser asc o desc" }).default("desc")),
});

const changeStatusSchema = z.object({
  status: z.enum(PropertyStatus, { error: "El estado no es válido (DRAFT, PUBLISHED, RESERVED, PAUSED, SOLD, RENTED o CANCELLED)" }),
});

const mineSchema = z.object({
  status: z.preprocess(blankToUndefined, z.enum(PropertyStatus, { error: "status no es válido" }).optional()),
});

// Los metodos no usan `this`, asi que se pueden pasar directo al router.
class PropertyController {
  async search(request: Request, response: Response): Promise<void> {
    const filters = parseBody(searchSchema, request.query);
    const { page, limit } = parsePagination(request.query);
    response.json(await propertyService.search(filters, page, limit));
  }

  async getById(request: Request, response: Response): Promise<void> {
    response.json(await propertyService.getPublic(parseId(request.params.id)));
  }

  // GET /agencies/me/properties/:id (vendedor): una propiedad propia, incluso en borrador.
  async getMine(request: Request, response: Response): Promise<void> {
    response.json(await propertyService.getMine(parseId(request.params.id), request.sellerId!));
  }

  async create(request: Request, response: Response): Promise<void> {
    const input = parseBody(propertySchema, request.body);
    response.status(201).json(await propertyService.create(request.sellerId!, input));
  }

  async update(request: Request, response: Response): Promise<void> {
    const input = parseBody(propertySchema, request.body);
    response.json(await propertyService.update(parseId(request.params.id), request.sellerId!, input));
  }

  async remove(request: Request, response: Response): Promise<void> {
    await propertyService.remove(parseId(request.params.id), request.sellerId!);
    response.status(204).send();
  }

  // PATCH /properties/:id/status: la transicion permitida la valida el service.
  async changeStatus(request: Request, response: Response): Promise<void> {
    const { status } = parseBody(changeStatusSchema, request.body);
    response.json(await propertyService.changeStatus(parseId(request.params.id), request.sellerId!, status));
  }

  async statusHistory(request: Request, response: Response): Promise<void> {
    response.json(await propertyService.getStatusHistory(parseId(request.params.id), request.sellerId!));
  }

  // GET /agencies/me/properties (ruta protegida)
  async listMine(request: Request, response: Response): Promise<void> {
    const { status } = parseBody(mineSchema, request.query);
    const { page, limit } = parsePagination(request.query);
    response.json(await propertyService.listMine(request.sellerId!, page, limit, status));
  }
}

export const propertyController = new PropertyController();

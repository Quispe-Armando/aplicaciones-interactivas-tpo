import type { Request, Response } from "express";
import { z } from "zod";
import { VisitRequestStatus } from "../entities/enums";
import { visitRequestService } from "../services/visit-request.service";
import { parseBody } from "../validation/parse-body";
import { parseId } from "../validation/parse-id";
import { parsePagination } from "../validation/pagination";

// La hora tiene que venir con zona horaria (Z o +/-hh:mm) para que "futura" no dependa de donde corra el servidor.
const HAS_TIME_ZONE = /(Z|[+-]\d{2}:\d{2})$/;

const createVisitSchema = z.object({
  requesterName: z.string("El nombre es obligatorio").trim().min(1, "El nombre es obligatorio").max(120),
  // Mismo criterio que el formulario de la Clase 12: solo digitos, espacios, +, - y parentesis.
  requesterPhone: z.string("El teléfono es obligatorio").trim().regex(/^[\d\s+()-]{8,40}$/, "El teléfono no es válido"),
  proposedAt: z
    .string("La fecha y hora son obligatorias")
    .trim()
    .refine((value: string) => HAS_TIME_ZONE.test(value) && !Number.isNaN(Date.parse(value)), "La fecha y hora deben ser ISO 8601 con zona horaria, por ejemplo 2026-11-20T15:00:00-03:00")
    .transform((value: string) => new Date(value))
    .refine((date: Date) => date.getTime() > Date.now(), "La fecha y hora tienen que ser futuras"),
  message: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((value: string | null | undefined) => value || null),
});

const changeStatusSchema = z.object({
  status: z.enum(VisitRequestStatus, { error: "El estado no es válido (PENDING, CONFIRMED, COMPLETED, CANCELLED o REJECTED)" }),
});

const listSchema = z.object({
  status: z.preprocess((value: unknown) => (value === "" ? undefined : value), z.enum(VisitRequestStatus, { error: "status no es válido" }).optional()),
});

// Los metodos no usan `this`, asi que se pueden pasar directo al router.
class VisitRequestController {
  // POST /properties/:id/visit-requests (publico)
  async create(request: Request, response: Response): Promise<void> {
    const input = parseBody(createVisitSchema, request.body);
    response.status(201).json(await visitRequestService.create(parseId(request.params.id), input));
  }

  // PATCH /visit-requests/:id/status (solo el dueño)
  async changeStatus(request: Request, response: Response): Promise<void> {
    const { status } = parseBody(changeStatusSchema, request.body);
    response.json(await visitRequestService.changeStatus(parseId(request.params.id), request.sellerId!, status));
  }

  // GET /agencies/:id/visit-requests (solo el dueño de la inmobiliaria)
  async listByAgency(request: Request, response: Response): Promise<void> {
    const { status } = parseBody(listSchema, request.query);
    const { page, limit } = parsePagination(request.query);
    response.json(await visitRequestService.listByAgency(parseId(request.params.id), request.sellerId!, page, limit, status));
  }
}

export const visitRequestController = new VisitRequestController();

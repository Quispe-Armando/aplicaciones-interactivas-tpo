import type { Request, Response } from "express";
import { z } from "zod";
import { agencyService } from "../services/agency.service";
import { parseId } from "../validation/parse-id";
import { parseBody } from "../validation/parse-body";
import { parsePagination } from "../validation/pagination";

// Campo de texto opcional: vacio o ausente se guarda como null.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value: string | null | undefined) => value || null);

// PUT reemplaza el recurso completo (Clase 5): hay que mandar todos los campos obligatorios.
const updateAgencySchema = z.object({
  name: z.string("El nombre de fantasía es obligatorio").trim().min(1, "El nombre de fantasía es obligatorio").max(120),
  description: z.string("La descripción es obligatoria").trim().max(5000),
  logoUrl: optionalText(500),
  contactPhone: z.string("El teléfono es obligatorio").trim().min(1, "El teléfono es obligatorio").max(40),
  contactEmail: z.string("El email de contacto es obligatorio").trim().toLowerCase().pipe(z.email({ error: "El email de contacto no es válido" })),
  officeAddress: optionalText(255),
});

// Los metodos no usan `this`, asi que se pueden pasar directo al router.
class AgencyController {
  async get(request: Request, response: Response): Promise<void> {
    response.json(await agencyService.getProfile(parseId(request.params.id)));
  }

  async update(request: Request, response: Response): Promise<void> {
    const input = parseBody(updateAgencySchema, request.body);
    response.json(await agencyService.update(parseId(request.params.id), request.sellerId!, input));
  }

  async remove(request: Request, response: Response): Promise<void> {
    await agencyService.remove(parseId(request.params.id), request.sellerId!);
    response.status(204).send();
  }

  async listProperties(request: Request, response: Response): Promise<void> {
    const { page, limit } = parsePagination(request.query);
    response.json(await agencyService.listPublishedProperties(parseId(request.params.id), page, limit));
  }
}

export const agencyController = new AgencyController();

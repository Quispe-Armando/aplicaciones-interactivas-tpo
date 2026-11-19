import { z } from "zod";
import { HttpError } from "../errors/http-error";

// Valida un body con un schema de Zod ANTES de llamar al service.
// Si es invalido lanza 400 con el campo que fallo: { error, details: [{ field, message }] }.
export function parseBody<S extends z.ZodType>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body ?? {});

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.map(String).join(".") || "body",
      message: issue.message,
    }));
    throw new HttpError(400, "Datos inválidos", details);
  }

  return result.data;
}

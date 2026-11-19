import { HttpError } from "../errors/http-error";

// Convierte el :id de la URL en numero. Si no es un entero positivo, 400.
export function parseId(value: string | string[] | undefined): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, "El id debe ser un número entero positivo");
  return id;
}
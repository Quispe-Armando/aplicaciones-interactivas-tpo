import type { RequestHandler } from "express";
import { HttpError } from "../errors/http-error";

// Se monta DESPUES de todas las rutas y ANTES del errorHandler: si ninguna ruta atendio el pedido
// llega hasta aca. Sin esto Express responde con una pagina HTML ("Cannot GET /algo"), que rompe el formato { error }.
export const notFound: RequestHandler = (request) => {
  throw new HttpError(404, `Ruta no encontrada: ${request.method} ${request.path}`);
};

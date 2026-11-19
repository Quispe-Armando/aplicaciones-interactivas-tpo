import type { ErrorRequestHandler } from "express";
import { HttpError } from "../errors/http-error";

// Errores que genera Express o sus librerias (body-parser, http-errors): traen type / status / expose.
interface FrameworkError {
  type?: string;
  status?: number;
}

// Middleware de 4 parametros: Express lo reconoce por la firma. Se monta al
// final de index.ts, despues de las rutas. Formato de error de toda la API:
// { error, details? }.
export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  // Errores que lanzamos nosotros (validacion, 401, 403, 404, 409...).
  if (error instanceof HttpError) {
    response
      .status(error.status)
      .json(error.details === undefined ? { error: error.message } : { error: error.message, details: error.details });
    return;
  }

  const frameworkError = error as FrameworkError | null;

  // JSON mal formado en el body: lo detecta express.json().
  if (frameworkError?.type === "entity.parse.failed") {
    response.status(400).json({ error: "El body no es un JSON válido" });
    return;
  }

  // Body mas grande que el limite de express.json() (100kb por defecto).
  if (frameworkError?.type === "entity.too.large") {
    response.status(413).json({ error: "El body es demasiado grande" });
    return;
  }

  // Otros errores del pedido que Express marca como "culpa del cliente" (por ejemplo, una URL con
  // caracteres mal codificados): se responde con su mismo status 4xx y un mensaje generico
  // (nunca se devuelve el mensaje original).
  if (typeof frameworkError?.status === "number" && frameworkError.status >= 400 && frameworkError.status < 500) {
    response.status(frameworkError.status).json({ error: "Pedido inválido" });
    return;
  }

  // Cualquier otro error es nuestro: se loguea en el servidor (con el stack) y al cliente
  // solo le llega un mensaje generico. Nunca se filtra el stack ni el mensaje original.
  console.error(`[${request.method} ${request.originalUrl}]`, error);
  response.status(500).json({ error: "Error interno" });
};

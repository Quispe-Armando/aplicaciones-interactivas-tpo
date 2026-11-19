import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { getJwtSecret } from "../config/jwt";
import { HttpError } from "../errors/http-error";

// Suma sellerId al tipo Request para que los controllers lo lean tipado.
declare global {
  namespace Express {
    interface Request {
      sellerId?: number;
    }
  }
}

// Protege las rutas del Vendedor. Las del Interesado nunca lo usan.
export function requireAuth(request: Request, _response: Response, next: NextFunction): void {
  const header = request.headers.authorization; // "Bearer <token>"
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    throw new HttpError(401, "Falta el token");
  }

  let payload: string | JwtPayload;
  try {
    // Verifica la firma y el vencimiento (exp). No consulta la base de datos.
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    throw new HttpError(401, "Token inválido o vencido");
  }

  const sellerId = typeof payload === "object" ? Number(payload.sub) : Number.NaN;
  if (!Number.isInteger(sellerId)) {
    throw new HttpError(401, "Token inválido");
  }

  request.sellerId = sellerId;
  next();
}

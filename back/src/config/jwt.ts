import type { SignOptions } from "jsonwebtoken";

// El secreto sale siempre de una variable de entorno, nunca hardcodeado.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Falta JWT_SECRET en el .env (ver .env.example)");
  }
  return secret;
}

// Duracion del token. Sin refresh token, 2h alcanza para una sesion de trabajo.
export function getJwtExpiresIn(): SignOptions["expiresIn"] {
  return (process.env.JWT_EXPIRES_IN ?? "2h") as SignOptions["expiresIn"];
}
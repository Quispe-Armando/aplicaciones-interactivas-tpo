// Error con status HTTP propio. El middleware de errores
// (middlewares/error-handler.ts) lo traduce a la respuesta { error, details? }.
// Los services lo lanzan; los controllers no necesitan try/catch (Express 5
// reenvia solo el rechazo de una promesa async al manejador de errores).
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

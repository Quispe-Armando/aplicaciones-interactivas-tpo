// Forma del error que devuelve el back: { error, details? } (details solo en validaciones, con status 400).
export interface FieldError {
  field: string;
  message: string;
}

interface ErrorBody {
  error?: unknown;
  details?: unknown;
}

// Todo error de la API (y de red) llega a los componentes como un ApiError:
// siempre tiene un `message` legible para mostrar en pantalla.
export class ApiError extends Error {
  status: number; // 0 = no hubo respuesta (API caida, sin red)
  details: FieldError[];

  constructor(status: number, message: string, details: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  // Arma el error a partir de la respuesta del back; si no tiene el formato esperado, usa un mensaje generico.
  static fromResponse(status: number, body: unknown): ApiError {
    const data = (typeof body === "object" && body !== null ? body : {}) as ErrorBody;
    const message = typeof data.error === "string" && data.error !== "" ? data.error : `Error ${status}`;
    const details = Array.isArray(data.details)
      ? data.details.filter((d): d is FieldError => typeof d?.field === "string" && typeof d?.message === "string")
      : [];
    return new ApiError(status, message, details);
  }

  // { precio: "El precio debe ser mayor a 0" }: para mostrar cada mensaje debajo de su campo del formulario.
  get fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const { field, message } of this.details) {
      if (!(field in errors)) errors[field] = message;
    }
    return errors;
  }
}

// Para un catch: devuelve el mensaje de cualquier error.
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido";
}

import { API_URL } from "./config";
import { ApiError } from "./errors";
import { clearSession, getToken, notifyUnauthorized } from "./session";

// Capa unica para hablar con el back: los componentes nunca usan fetch ni arman URLs o headers.
// Es un wrapper de fetch (lo que se ve en la Clase 14) que se ocupa de:
//   - la URL base y el query string
//   - el body en JSON
//   - el header Authorization con el token
//   - convertir las respuestas con error en ApiError (res.ok no se chequea en cada pantalla)
//   - el 401: limpia la sesion y manda al login

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: object;
  // false = no mandar el token (login y registro).
  auth?: boolean;
  // Para cancelar el pedido en el cleanup de un useEffect (AbortController, Clase 14).
  signal?: AbortSignal;
}

// Filtros vacios (undefined, null, "") no viajan en la URL.
export function buildQuery(query?: object): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

// Un error 502 de un proxy, por ejemplo, puede no traer JSON: en ese caso devuelve null.
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true, signal } = options;
  const token = auth ? getToken() : null;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    // Un pedido cancelado a proposito no es un error para mostrar: se deja pasar tal cual.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    // fetch solo rechaza si no hubo respuesta (API apagada, sin red, CORS).
    throw new ApiError(0, "No se pudo conectar con el servidor. Verificá que la API esté corriendo.");
  }

  if (response.status === 204) return undefined as T;

  const data = await readJson(response);

  if (!response.ok) {
    // 401 con token enviado = la sesion vencio o el token no sirve. (Un 401 de login, sin token, solo muestra el error.)
    if (response.status === 401 && token) {
      clearSession();
      notifyUnauthorized();
    }
    throw ApiError.fromResponse(response.status, data);
  }

  return data as T;
}

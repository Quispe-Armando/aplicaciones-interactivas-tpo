// Paginado como en Clase 7: page empieza en 1 y limit tiene tope,
// porque nunca hay que confiar en el valor que manda el cliente.
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

export function parsePagination(query: { page?: unknown; limit?: unknown }): { page: number; limit: number } {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(query.limit)) || DEFAULT_LIMIT));
  return { page, limit };
}
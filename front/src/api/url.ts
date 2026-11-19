import { buildQuery } from "./client";

// Arma la url que recibe useFetch: conQuery("/properties", { page: 2, q: "" }) -> "/properties?page=2"
// (los valores vacios no viajan). Siempre da el mismo texto para los mismos filtros: sirve como dependencia del effect.
export function conQuery(path: string, query?: object): string {
  return `${path}${buildQuery(query)}`;
}

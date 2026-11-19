import type { Currency, OperationType, PropertyFilters, PropertyType } from "../api/types";

// Los filtros del listado viven en la URL (?type=HOUSE&minPrice=100000&page=2...) y esto los lee.
// Todo en la URL son strings y cualquiera puede escribir cualquier cosa a mano: lo invalido se ignora (nunca llega a la API).

export const PAGE_SIZE = 9;

const TYPES: PropertyType[] = ["HOUSE", "APARTMENT", "LAND", "COMMERCIAL"];
const OPERATIONS: OperationType[] = ["SALE", "RENT"];
const CURRENCIES: Currency[] = ["ARS", "USD"];
const SORTS = ["publishedAt", "price", "totalArea"] as const;
const ORDERS = ["asc", "desc"] as const;

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

// Un numero no negativo, o undefined si no hay o no es valido.
function numero(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function leerAmenities(params: URLSearchParams): string[] {
  return (params.get("amenities") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

export function leerPagina(params: URLSearchParams): number {
  const n = Math.floor(Number(params.get("page")));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

// De la URL a los filtros para el servicio.
export function leerFiltros(params: URLSearchParams): PropertyFilters {
  const amenities = leerAmenities(params);
  const rooms = numero(params.get("rooms"));
  return {
    type: pick(params.get("type"), TYPES),
    operation: pick(params.get("operation"), OPERATIONS),
    currency: pick(params.get("currency"), CURRENCIES),
    minPrice: numero(params.get("minPrice")),
    maxPrice: numero(params.get("maxPrice")),
    area: params.get("area")?.trim() || undefined,
    rooms: rooms === undefined ? undefined : Math.floor(rooms),
    amenities: amenities.length > 0 ? amenities : undefined,
    q: params.get("q")?.trim() || undefined,
    sort: pick(params.get("sort"), SORTS),
    order: pick(params.get("order"), ORDERS),
    page: leerPagina(params),
    limit: PAGE_SIZE,
  };
}

// Las opciones del select "Ordenar por": cada una es un par sort + order.
export const ORDENES = [
  { valor: "", etiqueta: "Más recientes", sort: undefined, order: undefined },
  { valor: "price-asc", etiqueta: "Precio: menor a mayor", sort: "price", order: "asc" },
  { valor: "price-desc", etiqueta: "Precio: mayor a menor", sort: "price", order: "desc" },
  { valor: "totalArea-desc", etiqueta: "Superficie: mayor a menor", sort: "totalArea", order: "desc" },
  { valor: "totalArea-asc", etiqueta: "Superficie: menor a mayor", sort: "totalArea", order: "asc" },
  { valor: "publishedAt-asc", etiqueta: "Más antiguas", sort: "publishedAt", order: "asc" },
] as const;

// De los parametros de la URL al valor del select.
export function ordenActual(params: URLSearchParams): string {
  const sort = pick(params.get("sort"), SORTS);
  const order = pick(params.get("order"), ORDERS);
  const valor = sort && order ? `${sort}-${order}` : "";
  return ORDENES.some((o) => o.valor === valor) ? valor : "";
}

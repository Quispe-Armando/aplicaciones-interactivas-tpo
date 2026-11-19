import type { Currency, OperationType, Property, PropertyStatus, PropertyType } from "../api/types";

// Textos para mostrar: la API devuelve los valores en ingles ("HOUSE", "SALE"...).
export const TIPOS: Record<PropertyType, string> = {
  HOUSE: "Casa",
  APARTMENT: "Departamento",
  LAND: "Terreno",
  COMMERCIAL: "Local",
};

export const OPERACIONES: Record<OperationType, string> = {
  SALE: "Venta",
  RENT: "Alquiler",
};

// 120000, "USD", "SALE" -> "USD 120.000"; en alquiler suma "/mes": "USD 400/mes"
export function formatearPrecio(precio: number, moneda: Currency, operacion: OperationType): string {
  const texto = `${moneda} ${precio.toLocaleString("es-AR")}`;
  return operacion === "RENT" ? `${texto}/mes` : texto;
}

// La foto de portada (la API garantiza una); si no hubiera, la primera.
export function fotoPortada(propiedad: Property): string | null {
  const imagen = propiedad.images.find((i) => i.isCover) ?? propiedad.images[0];
  return imagen ? imagen.url : null;
}

export const ESTADOS: Record<PropertyStatus, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicada",
  RESERVED: "Reservada",
  PAUSED: "Pausada",
  SOLD: "Vendida",
  RENTED: "Alquilada",
  CANCELLED: "Cancelada",
};

// "2026-11-10T15:30:00.000Z" -> "10 nov 2026, 12:30" (en la hora local de quien lo mira)
export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

// El "ahora" con el formato de <input type="datetime-local"> ("2026-11-12T17:34"), en hora local.
// (toISOString() devuelve UTC: de noche en Argentina ya daria el dia siguiente.)
export function ahoraParaInput(): string {
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
  return ahora.toISOString().slice(0, 16);
}

// "11 5555-1234" -> "tel:1155551234": el href tel: no lleva espacios ni guiones (abre el discador en el celular).
export function hrefTelefono(telefono: string): string {
  return `tel:${telefono.replace(/[^\d+]/g, "")}`;
}

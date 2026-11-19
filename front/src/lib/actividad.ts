import type { Activity, ActivityType } from "../api/types";

// Reglas del feed de actividad. Funciones comunes (no llaman hooks): sin "use" en el nombre (Clase 15).

export const ICONOS_ACTIVIDAD: Record<ActivityType, string> = {
  COMMENT: "💬",
  VISIT_REQUEST: "📅",
  PROPERTY_STATUS_CHANGE: "🏠",
  REVIEW: "⭐",
};

export const ETIQUETAS_ACTIVIDAD: Record<ActivityType, string> = {
  COMMENT: "Consulta",
  VISIT_REQUEST: "Visita",
  PROPERTY_STATUS_CHANGE: "Estado",
  REVIEW: "Reseña",
};

// A donde lleva una novedad. sourceId apunta a filas de tablas distintas segun el tipo (no es siempre una propiedad),
// asi que se lleva a la seccion donde se atiende cada cosa.
export function destinoActividad(actividad: Pick<Activity, "type">, agencyId: number): string {
  switch (actividad.type) {
    case "COMMENT":
      return "/panel/consultas";
    case "VISIT_REQUEST":
      return "/panel/visitas";
    case "PROPERTY_STATUS_CHANGE":
      return "/panel/propiedades";
    case "REVIEW":
      return `/inmobiliarias/${agencyId}`; // las reseñas se ven en el sitio publico de la inmobiliaria
  }
}

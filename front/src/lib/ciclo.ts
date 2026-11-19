import type { OperationType, Property, PropertyStatus } from "../api/types";
import { ESTADOS } from "./formato";

// Ciclo de vida de la propiedad: que botones ofrece la pantalla segun el estado actual.
// Son funciones comunes (no llaman hooks): sin "use" en el nombre, igual que esEditable (Clase 15).
//
// Repite la maquina de estados del back (property-transitions.ts) para NO ofrecer lo que seguro va a rechazar,
// pero la ultima palabra la tiene el back: valida siempre y, si rechaza, la pantalla muestra el motivo.
//
//   Borrador -> Publicada <-> Pausada            Publicada -> Reservada -> Publicada (se cae la reserva)
//   Reservada -> Vendida (venta) / Alquilada (alquiler)
//   Cancelada: desde Publicada, Reservada o Pausada. Vendida, Alquilada y Cancelada son finales.

export interface AccionEstado {
  destino: PropertyStatus;
  etiqueta: string; // texto del boton
  // Si es una accion que no se puede deshacer, el texto que se muestra al pedir confirmacion; si no, null (se ejecuta directo).
  advertencia: string | null;
}

const BAJA: AccionEstado = {
  destino: "CANCELLED",
  etiqueta: "Dar de baja",
  advertencia: "La propiedad pasa a Cancelada y no se puede volver atrás.",
};

function cerrar(operacion: OperationType): AccionEstado {
  return operacion === "SALE"
    ? { destino: "SOLD", etiqueta: "Marcar vendida", advertencia: "La propiedad pasa a Vendida y no se puede volver atrás." }
    : { destino: "RENTED", etiqueta: "Marcar alquilada", advertencia: "La propiedad pasa a Alquilada y no se puede volver atrás." };
}

export function accionesDe(propiedad: Pick<Property, "status" | "operation">): AccionEstado[] {
  switch (propiedad.status) {
    case "DRAFT":
      return [{ destino: "PUBLISHED", etiqueta: "Publicar", advertencia: null }]; // un borrador nunca se vende ni se da de baja
    case "PUBLISHED":
      return [
        { destino: "PAUSED", etiqueta: "Pausar", advertencia: null },
        { destino: "RESERVED", etiqueta: "Marcar reservada", advertencia: null },
        BAJA,
      ];
    case "PAUSED":
      return [{ destino: "PUBLISHED", etiqueta: "Republicar", advertencia: null }, BAJA];
    case "RESERVED":
      return [{ destino: "PUBLISHED", etiqueta: "Volver a publicar", advertencia: null }, cerrar(propiedad.operation), BAJA];
    default:
      return []; // Vendida, Alquilada, Cancelada: estados finales
  }
}

// "“Casa en Tigre” pasó a Pausada" (el aviso que se muestra despues de cambiar el estado)
export function mensajeCambio(titulo: string, nuevo: PropertyStatus): string {
  return `“${titulo}” pasó a ${ESTADOS[nuevo]}`;
}

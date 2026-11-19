import type { VisitRequestStatus } from "../api/types";

// Reglas de las solicitudes de visita en el panel. Funciones comunes (no llaman hooks): sin "use" en el nombre (Clase 15).

export const ESTADOS_VISITA: Record<VisitRequestStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Realizada",
  CANCELLED: "Cancelada",
  REJECTED: "Rechazada",
};

export interface AccionVisita {
  destino: VisitRequestStatus;
  etiqueta: string;
  // Rechazar y Cancelar no se pueden deshacer: se pide confirmacion. null = se ejecuta directo.
  advertencia: string | null;
}

// Que botones ofrece cada estado (repite la maquina de estados del back, que valida siempre y tiene la ultima palabra):
//   Pendiente  -> Confirmar / Rechazar
//   Confirmada -> Marcar realizada / Cancelar
//   Realizada, Cancelada, Rechazada: finales, sin acciones.
export function accionesVisita(estado: VisitRequestStatus): AccionVisita[] {
  switch (estado) {
    case "PENDING":
      return [
        { destino: "CONFIRMED", etiqueta: "Confirmar", advertencia: null },
        { destino: "REJECTED", etiqueta: "Rechazar", advertencia: "La solicitud pasa a Rechazada y no se puede volver atrás." },
      ];
    case "CONFIRMED":
      return [
        { destino: "COMPLETED", etiqueta: "Marcar realizada", advertencia: null },
        { destino: "CANCELLED", etiqueta: "Cancelar", advertencia: "La solicitud pasa a Cancelada y no se puede volver atrás." },
      ];
    default:
      return [];
  }
}

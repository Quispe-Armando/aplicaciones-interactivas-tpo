import { VisitRequestStatus } from "../entities/enums";
import { HttpError } from "../errors/http-error";

const { PENDING, CONFIRMED, COMPLETED, CANCELLED, REJECTED } = VisitRequestStatus;

// Estados de la Solicitud de visita (tpo.md § Solicitud de visita):
//   Pendiente -> Confirmada -> Realizada, o Cancelada/Rechazada en cualquier momento.
// Realizada, Cancelada y Rechazada son finales. Realizada solo se llega desde Confirmada.
const ALLOWED: Record<VisitRequestStatus, VisitRequestStatus[]> = {
  [PENDING]: [CONFIRMED, REJECTED, CANCELLED],
  [CONFIRMED]: [COMPLETED, REJECTED, CANCELLED],
  [COMPLETED]: [],
  [CANCELLED]: [],
  [REJECTED]: [],
};

// Lanza 400 si la transicion no esta permitida. Se valida siempre en el servidor.
export function assertValidVisitTransition(from: VisitRequestStatus, to: VisitRequestStatus): void {
  const options = ALLOWED[from];
  if (!options.includes(to)) {
    const detail = options.length > 0 ? `Desde ${from} se puede pasar a: ${options.join(", ")}` : `${from} es un estado final`;
    throw new HttpError(400, `Transición no permitida: ${from} → ${to}. ${detail}`);
  }
}

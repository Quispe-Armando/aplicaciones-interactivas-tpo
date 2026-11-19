import { OperationType, PropertyStatus } from "../entities/enums";
import { HttpError } from "../errors/http-error";

const { DRAFT, PUBLISHED, RESERVED, PAUSED, SOLD, RENTED, CANCELLED } = PropertyStatus;

// Maquina de estados de la propiedad (tpo.md § Ciclo de vida). Cada estado lista a cuales se puede pasar.
//   BORRADOR -> PUBLICADA -> RESERVADA -> VENDIDA / ALQUILADA
//   PUBLICADA <-> PAUSADA, y CANCELADA desde cualquier estado activo (menos Borrador).
// VENDIDA, ALQUILADA y CANCELADA son finales: no tienen salida.
const ALLOWED: Record<PropertyStatus, PropertyStatus[]> = {
  [DRAFT]: [PUBLISHED],
  [PUBLISHED]: [RESERVED, PAUSED, CANCELLED],
  [RESERVED]: [PUBLISHED, SOLD, RENTED, CANCELLED],
  [PAUSED]: [PUBLISHED, CANCELLED],
  [SOLD]: [],
  [RENTED]: [],
  [CANCELLED]: [],
};

// Lanza 400 si la transicion no esta permitida. Se valida siempre en el servidor (tpo.md § Reglas de negocio).
export function assertValidTransition(from: PropertyStatus, to: PropertyStatus, operation: OperationType): void {
  const options = ALLOWED[from];

  if (!options.includes(to)) {
    const detail = options.length > 0 ? `Desde ${from} se puede pasar a: ${options.join(", ")}` : `${from} es un estado final`;
    throw new HttpError(400, `Transición no permitida: ${from} → ${to}. ${detail}`);
  }

  // Vendida solo para ventas y Alquilada solo para alquileres.
  if (to === SOLD && operation !== OperationType.SALE) {
    throw new HttpError(400, "Solo una propiedad en venta puede pasar a SOLD. Una de alquiler pasa a RENTED");
  }
  if (to === RENTED && operation !== OperationType.RENT) {
    throw new HttpError(400, "Solo una propiedad en alquiler puede pasar a RENTED. Una de venta pasa a SOLD");
  }
}
import { PropertyStatus } from "../entities/enums";

// Nombres en castellano para los mensajes que ve el vendedor.
export const PROPERTY_STATUS_LABEL: Record<PropertyStatus, string> = {
  [PropertyStatus.DRAFT]: "Borrador",
  [PropertyStatus.PUBLISHED]: "Publicada",
  [PropertyStatus.RESERVED]: "Reservada",
  [PropertyStatus.PAUSED]: "Pausada",
  [PropertyStatus.SOLD]: "Vendida",
  [PropertyStatus.RENTED]: "Alquilada",
  [PropertyStatus.CANCELLED]: "Cancelada",
};

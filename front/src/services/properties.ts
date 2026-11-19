import { request } from "../api/client";
import type { Property, PropertyInput, PropertyStatus } from "../api/types";

export const propertiesService = {
  create: (input: PropertyInput) => request<Property>("/properties", { method: "POST", body: input }),

  // PUT reemplaza la propiedad completa.
  update: (id: number, input: PropertyInput) => request<Property>(`/properties/${id}`, { method: "PUT", body: input }),

  // Solo borradores (el resto da 409).
  remove: (id: number) => request<void>(`/properties/${id}`, { method: "DELETE" }),

  changeStatus: (id: number, status: PropertyStatus) => request<Property>(`/properties/${id}/status`, { method: "PATCH", body: { status } }),
};

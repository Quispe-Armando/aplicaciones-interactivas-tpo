import { request } from "../api/client";
import type { Page, PageParams, VisitRequest, VisitRequestInput, VisitRequestStatus } from "../api/types";

export const visitRequestsService = {
  // Publico: el interesado no se loguea. Solo sobre propiedades PUBLISHED.
  create: (propertyId: number, input: VisitRequestInput) =>
    request<VisitRequest>(`/properties/${propertyId}/visit-requests`, { method: "POST", body: input, auth: false }),

  // Solo el dueño de la inmobiliaria (trae datos de contacto).
  listByAgency: (agencyId: number, params: PageParams & { status?: VisitRequestStatus } = {}, signal?: AbortSignal) =>
    request<Page<VisitRequest>>(`/agencies/${agencyId}/visit-requests`, { query: params, signal }),

  changeStatus: (id: number, status: VisitRequestStatus) => request<VisitRequest>(`/visit-requests/${id}/status`, { method: "PATCH", body: { status } }),
};

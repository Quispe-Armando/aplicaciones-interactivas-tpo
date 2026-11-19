import { request } from "../api/client";
import type { MonthlyReport, StatusSummary, TimeOnMarket } from "../api/types";

// Todos son solo del dueño de la inmobiliaria.
export const reportsService = {
  statusSummary: (agencyId: number, signal?: AbortSignal) => request<StatusSummary>(`/agencies/${agencyId}/reports/status-summary`, { signal }),

  monthly: (agencyId: number, signal?: AbortSignal) => request<MonthlyReport>(`/agencies/${agencyId}/reports/monthly`, { signal }),

  averageTimeOnMarket: (agencyId: number, signal?: AbortSignal) =>
    request<TimeOnMarket>(`/agencies/${agencyId}/reports/avg-time-on-market`, { signal }),
};

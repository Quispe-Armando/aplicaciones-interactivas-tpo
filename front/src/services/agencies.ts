import { request } from "../api/client";
import { clearSession } from "../api/session";
import type { Agency, AgencyInput } from "../api/types";

export const agenciesService = {
  // Solo el dueño. PUT reemplaza el perfil completo.
  update: (id: number, input: AgencyInput) => request<Agency>(`/agencies/${id}`, { method: "PUT", body: input }),

  // Solo el dueño. Borra tambien la cuenta del vendedor (cierra la sesion).
  async remove(id: number): Promise<void> {
    await request<void>(`/agencies/${id}`, { method: "DELETE" });
    clearSession();
  },
};

import { request } from "../api/client";
import { clearSession, saveToken } from "../api/session";
import type { LoginInput, LoginResponse, RegisterInput, Session } from "../api/types";

export const authService = {
  register: (input: RegisterInput) => request<Session>("/auth/register", { method: "POST", body: input, auth: false }),

  // Guarda el token: de ahi en mas todas las llamadas lo mandan solas.
  async login(input: LoginInput): Promise<LoginResponse> {
    const result = await request<LoginResponse>("/auth/login", { method: "POST", body: input, auth: false });
    saveToken(result.token);
    return result;
  },

  // Recupera la sesion (por ejemplo, al recargar la pagina).
  me: (signal?: AbortSignal) => request<Session>("/auth/me", { signal }),

  logout: () => clearSession(),
};

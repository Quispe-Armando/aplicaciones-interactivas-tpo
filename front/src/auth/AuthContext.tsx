import { createContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ApiError, errorMessage } from "../api/errors";
import { hasSession, onUnauthorized } from "../api/session";
import type { LoginInput, RegisterInput, Session } from "../api/types";
import { authService } from "../services";

// Contexto de autenticacion: guarda los datos del vendedor logueado y los ofrece a cualquier componente,
// sin pasarlos por props de uno en uno (esto no se vio en clase: Context es la forma que ofrece React para "estado global").
// El TOKEN vive en localStorage (api/session.ts): asi la sesion sobrevive a una recarga.
// Los DATOS del vendedor se recuperan de GET /auth/me al arrancar.

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

export interface AuthContextValue {
  status: AuthStatus;
  seller: Session["seller"] | null;
  agency: Session["agency"] | null;
  error: string | null; // solo con status "error": no se pudo recuperar la sesion (por ejemplo, la API esta apagada)
  login: (input: LoginInput) => Promise<void>;
  // Crea la cuenta y la inmobiliaria, y deja la sesion iniciada.
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  // Para cuando el vendedor cambia el nombre de su inmobiliaria: el panel lo muestra sin esperar a recargar.
  updateAgency: (agency: Session["agency"]) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Con token guardado hay que confirmarlo con la API antes de saber quien es; sin token, es anonimo de entrada.
  const [status, setStatus] = useState<AuthStatus>(hasSession() ? "loading" : "anonymous");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Un 401 de cualquier request: la sesion ya no sirve.
    const unsubscribe = onUnauthorized(() => {
      setSession(null);
      setStatus("anonymous");
    });

    if (!hasSession()) return unsubscribe;

    const controller = new AbortController();
    async function recuperarSesion() {
      try {
        setSession(await authService.me(controller.signal));
        setStatus("authenticated");
      } catch (e) {
        // El pedido cancelado por el cleanup (StrictMode monta dos veces) no es un error.
        if (e instanceof DOMException && e.name === "AbortError") return;
        // Un 401 ya lo manejo el listener de arriba; cualquier otro error (API caida, 500) se muestra.
        if (e instanceof ApiError && e.status === 401) return;
        setError(errorMessage(e));
        setStatus("error");
      }
    }
    recuperarSesion();

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, []);

  async function login(input: LoginInput) {
    const result = await authService.login(input); // guarda el token
    setSession({ seller: result.seller, agency: result.agency });
    setError(null);
    setStatus("authenticated");
  }

  async function register(input: RegisterInput) {
    await authService.register(input);
    await login({ email: input.email, password: input.password });
  }

  function logout() {
    authService.logout(); // borra el token
    setSession(null);
    setError(null);
    setStatus("anonymous");
  }

  function updateAgency(agency: Session["agency"]) {
    if (session) setSession({ ...session, agency });
  }

  const value: AuthContextValue = {
    status,
    seller: session?.seller ?? null,
    agency: session?.agency ?? null,
    error,
    login,
    register,
    logout,
    updateAgency,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

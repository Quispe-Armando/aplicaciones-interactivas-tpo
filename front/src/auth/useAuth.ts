import { useContext } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue } from "./AuthContext";

// Los componentes leen la sesion con: const { seller, agency, logout } = useAuth();
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth tiene que usarse dentro de <AuthProvider>");
  return value;
}

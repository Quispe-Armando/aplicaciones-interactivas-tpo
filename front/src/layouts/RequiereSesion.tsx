import { Navigate, Outlet, useLocation } from "react-router";
import { hasSession } from "../api/session";

// El "guardia" (Clase 13): sin sesion, en vez de las rutas hijas dibuja un <Navigate> que redirige apenas se renderiza.
// Ojo: esto solo cuida la pantalla. Los datos los protege el back, que valida el token en cada request.
export default function RequiereSesion() {
  const location = useLocation();

  if (!hasSession()) {
    // replace: la URL protegida no queda en el historial.
    // state.desde: a donde volver despues del login (con su query string, si la tenia).
    return <Navigate to="/login" replace state={{ desde: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
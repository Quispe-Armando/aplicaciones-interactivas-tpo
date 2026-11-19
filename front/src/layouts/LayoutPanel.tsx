import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../auth/useAuth";
import { useNoLeidas } from "../hooks/useNoLeidas";
import ErrorCarga from "../components/ErrorCarga";
import Cargando from "../components/Cargando";
import estilos from "./LayoutPanel.module.css";

const CADA_MS = 10_000; // el contador de sin leer se vuelve a pedir cada 10 segundos

// Con CSS Modules la clase "active" automatica de NavLink no sirve (el nombre real es otro):
// className recibe una funcion con { isActive } y devuelve la clase (Clase 15).
function claseSeccion({ isActive }: { isActive: boolean }) {
  return isActive ? `${estilos.seccion} ${estilos.actual}` : estilos.seccion;
}

// Layout del panel del vendedor: la navegacion de las secciones y, debajo, la seccion activa (<Outlet />).
export default function LayoutPanel() {
  const navigate = useNavigate();
  const { status, agency, error, logout } = useAuth();
  // El polling vive en el hook (con su cleanup): este componente no tiene ningun useEffect, como en el Ejercicio 3 de la Clase 15.
  const { noLeidas, restarUna, versionNuevas } = useNoLeidas(
    agency?.id ?? null,
    CADA_MS,
  );

  function salir() {
    logout(); // borra el token y los datos del vendedor
    navigate("/", { replace: true }); // al listado publico
  }

  return (
    <>
      <header className={estilos.header}>
        <strong className={estilos.marca}>
          🔑 {agency ? agency.name : "Panel del vendedor"}
        </strong>

        <nav className={estilos.nav}>
          {/* Sin "end": queda activo tambien en /panel/propiedades/nueva y /editar. */}
          <NavLink to="/panel/propiedades" className={claseSeccion}>
            Mis propiedades
          </NavLink>
          <NavLink to="/panel/inmobiliaria" className={claseSeccion}>
            Mi inmobiliaria
          </NavLink>
          <NavLink to="/panel/visitas" className={claseSeccion}>
            Visitas
          </NavLink>
          <NavLink to="/panel/consultas" className={claseSeccion}>
            Consultas
          </NavLink>
          <NavLink to="/panel/actividad" className={claseSeccion}>
            Actividad
            {noLeidas > 0 && (
              <span
                className={estilos.contador}
                aria-label={`${noLeidas} sin leer`}
              >
                {noLeidas}
              </span>
            )}
          </NavLink>
          <NavLink to="/panel/reportes" className={claseSeccion}>
            Reportes
          </NavLink>
        </nav>

        <div className={estilos.acciones}>
          <Link to="/">Ver sitio público</Link>
          <button type="button" className="boton" onClick={salir}>
            Salir
          </button>
        </div>
      </header>

      <main className="contenido">
        {/* Hasta confirmar el token con la API no se sabe de quien es el panel: las secciones esperan. */}
        {status === "loading" && <Cargando texto="Cargando sesión..." />}
        {status === "error" && (
          <ErrorCarga
            que="No se pudo recuperar tu sesión"
            mensaje={error}
            onReintentar={() => window.location.reload()}
          />
        )}
        {(status === "authenticated" || status === "anonymous") && (
          <Outlet context={{ restarNoLeida: restarUna, versionNuevas }} />
        )}
      </main>
    </>
  );
}

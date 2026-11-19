import type { FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router";
import { hasSession } from "../api/session";
import estilos from "./LayoutPublico.module.css";

// Con CSS Modules la clase "active" automatica de NavLink no sirve (el nombre real es otro):
// className recibe una funcion con { isActive } y devuelve la clase (Clase 15).
function claseLink({ isActive }: { isActive: boolean }) {
  return isActive ? `${estilos.link} ${estilos.actual}` : estilos.link;
}

// Layout del sitio publico (interesado): header con busqueda y acceso del vendedor, y debajo la pagina de turno.
export default function LayoutPublico() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";

  // La busqueda se manda al enviar (Enter o boton): no pide nada a la API con cada tecla.
  // Vive en la URL (?q=...): el listado la lee con useSearchParams. Si ya se esta en el listado, se conservan los demas filtros.
  function buscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const texto = String(new FormData(e.currentTarget).get("q")).trim();
    const nuevos = new URLSearchParams(pathname === "/" ? searchParams : undefined);
    if (texto) nuevos.set("q", texto);
    else nuevos.delete("q");
    nuevos.delete("page");
    navigate({ pathname: "/", search: nuevos.size > 0 ? `?${nuevos.toString()}` : "" });
  }

  return (
    <>
      <header className={estilos.header}>
        <Link to="/" className={estilos.marca}>
          🏠 Inmobiliaria
        </Link>

        {/* key={q}: si la URL cambia desde otro lado (quitar la busqueda, otra pestaña), el campo se vuelve a armar con el valor nuevo. */}
        <form key={q} className={estilos.buscador} onSubmit={buscar} role="search">
          <input type="search" name="q" defaultValue={q} placeholder="Buscar propiedades…" aria-label="Buscar propiedades" />
          <button type="submit" className="boton">
            Buscar
          </button>
        </form>

        <nav className={estilos.nav}>
          <NavLink to="/" end className={claseLink}>
            Propiedades
          </NavLink>
          {hasSession() ? <NavLink to="/panel" className={claseLink}>Mi panel</NavLink> : <NavLink to="/login" className={claseLink}>Ingresar como vendedor</NavLink>}
        </nav>
      </header>

      <main className="contenido">
        <Outlet />
      </main>
    </>
  );
}

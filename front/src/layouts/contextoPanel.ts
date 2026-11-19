import { useOutletContext } from "react-router";

// Lo que el layout del panel le ofrece a las secciones que muestra en el <Outlet />.
// El contador de sin leer vive en el layout (es el padre comun de la barra y de la seccion): la seccion de Actividad
// le avisa por aca cuando marca una novedad como leida. Outlet context NO se vio en clase (es lo que ofrece react-router
// para "pasar props" a traves del <Outlet />, ya que ahi no se pueden escribir props a mano).
export interface ContextoPanel {
  restarNoLeida: () => void;
  versionNuevas: number;// sube cuando el polling detecta novedades nuevas (la sección de Actividad se vuelve a pedir)
}

export function useContextoPanel(): ContextoPanel {
  return useOutletContext<ContextoPanel>();
}

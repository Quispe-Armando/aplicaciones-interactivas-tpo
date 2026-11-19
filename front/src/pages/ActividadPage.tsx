import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import type { Activity, Page } from "../api/types";
import { conQuery } from "../api/url";
import { useAuth } from "../auth/useAuth";
import FiltroEstado from "../components/FiltroEstado";
import ItemActividad from "../components/ItemActividad";
import Paginacion from "../components/Paginacion";
import { useFetch } from "../hooks/useFetch";
import { usePaginaUrl } from "../hooks/usePaginaUrl";
import { useContextoPanel } from "../layouts/contextoPanel";
import ErrorCarga from "../components/ErrorCarga";
import Cargando from "../components/Cargando";
import Vacio from "../components/Vacio";
import estilos from "./ActividadPage.module.css";

const LIMITE = 20;

// El filtro vive en la URL (?estado=sin-leer), como los demas (Clase 13). Sin parametro: todas, mas recientes primero.
export default function ActividadPage() {
  const { agency } = useAuth();
  const { restarNoLeida, versionNuevas } = useContextoPanel();
  const [params, setParams] = useSearchParams();
  const { page, irAPagina } = usePaginaUrl();

  const soloSinLeer = params.get("estado") === "sin-leer";

  // Sin inmobiliaria todavia (la sesion se esta confirmando), no hay nada que pedir: url null.
  const { datos, setDatos, cargando, error, recargar } = useFetch<
    Page<Activity>
  >(
    agency
      ? conQuery(`/agencies/${agency.id}/activity`, {
          unread: soloSinLeer ? true : undefined,
          page,
          limit: LIMITE,
        })
      : null,
  );

  // Cuando el polling detecta novedades nuevas (versionNuevas sube), la lista se vuelve a pedir. Se compara contra la
  // ultima version ya atendida (un ref) para no pedirla de mas al entrar a la pantalla ni en cada render.
  const versionAtendida = useRef(versionNuevas);
  useEffect(() => {
    if (versionNuevas !== versionAtendida.current) {
      versionAtendida.current = versionNuevas;
      recargar();
    }
  }, [versionNuevas, recargar]);

  function cambiarFiltro(valor: string) {
    setParams(valor === "sin-leer" ? { estado: valor } : {});
  }

  // El back la marco como leida: se refleja en la lista que ya tenemos (sin volver a pedirla) y baja el contador del menu.
  function novedadLeida(actualizada: Activity) {
    setDatos(
      (actual) =>
        actual && {
          ...actual,
          items: actual.items.map((a) =>
            a.id === actualizada.id ? { ...a, isRead: actualizada.isRead } : a,
          ),
        },
    );
    restarNoLeida();
  }

  return (
    <section>
      <h1>Actividad</h1>

      <FiltroEstado etiqueta="Mostrar" valor={soloSinLeer ? "sin-leer" : "todas"} onCambiar={cambiarFiltro}>
        <option value="todas">Todas</option>
        <option value="sin-leer">Sin leer</option>
      </FiltroEstado>

      {!agency && <Cargando texto="Cargando…" />}
      {agency && cargando && !datos && <Cargando texto="Cargando actividad…" />}

      {error && (
        <ErrorCarga
          que="No se pudo cargar la actividad"
          mensaje={error}
          onReintentar={recargar}
        />
      )}

      {!error && datos && datos.items.length === 0 && datos.total > 0 && (
        <Vacio texto="Esa página no existe.">
          <button type="button" className="boton" onClick={() => irAPagina(1)}>
            Ir a la primera página
          </button>
        </Vacio>
      )}

      {!error && datos && datos.total === 0 && (
        <Vacio
          texto={
            soloSinLeer
              ? "No tenés novedades sin leer. 🎉"
              : "Todavía no hay novedades."
          }
        >
          {soloSinLeer && <Link to="/panel/actividad">Ver todas</Link>}
        </Vacio>
      )}

      {!error && datos && datos.items.length > 0 && agency && (
        <>
          <ul className={estilos.lista} aria-busy={cargando}>
            {datos.items.map((actividad) => (
              <ItemActividad
                key={actividad.id}
                actividad={actividad}
                agencyId={agency.id}
                onLeida={novedadLeida}
              />
            ))}
          </ul>
          <Paginacion
            page={datos.page}
            limit={datos.limit}
            total={datos.total}
            onCambiar={irAPagina}
          />
        </>
      )}
    </section>
  );
}

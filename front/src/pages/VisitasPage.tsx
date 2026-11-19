import { Link, useSearchParams } from "react-router";
import type { Page, VisitRequest, VisitRequestStatus } from "../api/types";
import { conQuery } from "../api/url";
import { useAuth } from "../auth/useAuth";
import FiltroEstado from "../components/FiltroEstado";
import GrupoPropiedad from "../components/GrupoPropiedad";
import Paginacion from "../components/Paginacion";
import TarjetaSolicitud from "../components/TarjetaSolicitud";
import { useFetch } from "../hooks/useFetch";
import { usePaginaUrl } from "../hooks/usePaginaUrl";
import { agruparPorPropiedad } from "../lib/agrupar";
import { ESTADOS_VISITA } from "../lib/visitas";
import ErrorCarga from "../components/ErrorCarga";
import Cargando from "../components/Cargando";
import Vacio from "../components/Vacio";

const LIMITE = 50; // el maximo que acepta el back: asi un mismo vistazo junta casi todas las solicitudes de cada propiedad

// El filtro vive en la URL (?estado=CONFIRMED), como los filtros del listado (Clase 13). Sin parametro: las pendientes,
// que son las que el vendedor tiene que responder. "todas" las muestra a todas.
const ESTADOS_FILTRO = Object.keys(ESTADOS_VISITA) as VisitRequestStatus[];

export default function VisitasPage() {
  const { agency } = useAuth();
  const [params, setParams] = useSearchParams();
  const { page, irAPagina } = usePaginaUrl();

  const estadoUrl = params.get("estado");
  const todas = estadoUrl === "todas";
  const estado = todas
    ? undefined
    : (ESTADOS_FILTRO.find((e) => e === estadoUrl) ?? "PENDING");

  // Sin inmobiliaria todavia (la sesion se esta confirmando), no hay nada que pedir: url null.
  const { datos, setDatos, cargando, error, recargar } = useFetch<
    Page<VisitRequest>
  >(
    agency
      ? conQuery(`/agencies/${agency.id}/visit-requests`, {
          status: estado,
          page,
          limit: LIMITE,
        })
      : null,
  );

  function cambiarFiltro(valor: string) {
    // Pendientes es lo normal: no hace falta ensuciar la URL.
    setParams(valor === "PENDING" ? {} : { estado: valor });
  }

  // El back acepto el cambio: se refleja en la lista que ya tenemos, sin volver a pedirla ni recargar la pagina.
  // La forma con funcion del setter (Clase 15): dos respuestas seguidas parten cada una de la lista mas reciente.
  // El PATCH no trae la propiedad, asi que solo se toma el estado nuevo.
  function solicitudCambiada(actualizada: VisitRequest) {
    setDatos(
      (actual) =>
        actual && {
          ...actual,
          items: actual.items.map((s) =>
            s.id === actualizada.id ? { ...s, status: actualizada.status } : s,
          ),
        },
    );
  }

  const valorFiltro = todas ? "todas" : (estado ?? "PENDING");
  const grupos = datos ? agruparPorPropiedad(datos.items) : [];

  return (
    <section>
      <h1>Solicitudes de visita</h1>

      <FiltroEstado
        etiqueta="Mostrar"
        valor={valorFiltro}
        onCambiar={cambiarFiltro}
      >
        <option value="PENDING">Pendientes</option>
        <option value="todas">Todas</option>
        {ESTADOS_FILTRO.filter((e) => e !== "PENDING").map((e) => (
          <option key={e} value={e}>
            {ESTADOS_VISITA[e]}s
          </option>
        ))}
      </FiltroEstado>

      {!agency && <Cargando texto="Cargando…" />}
      {agency && cargando && !datos && (
        <Cargando texto="Cargando solicitudes…" />
      )}

      {error && (
        <ErrorCarga
          que="No se pudieron cargar las solicitudes"
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
            estado === "PENDING"
              ? "No tenés solicitudes pendientes. 🎉"
              : "No hay solicitudes para este filtro."
          }
        >
          {estado && <Link to="?estado=todas">Ver todas</Link>}
        </Vacio>
      )}

      {!error && datos && datos.items.length > 0 && (
        <>
          <p className="aviso" role="status">
            {datos.total} {datos.total === 1 ? "solicitud" : "solicitudes"}
          </p>
          {grupos.map((grupo) => (
            <GrupoPropiedad
              key={grupo.propertyId}
              propertyId={grupo.propertyId}
              titulo={grupo.titulo}
              cantidad={grupo.items.length}
              ocupado={cargando}
            >
              {grupo.items.map((solicitud) => (
                <TarjetaSolicitud
                  key={solicitud.id}
                  solicitud={solicitud}
                  onCambiada={solicitudCambiada}
                />
              ))}
            </GrupoPropiedad>
          ))}
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

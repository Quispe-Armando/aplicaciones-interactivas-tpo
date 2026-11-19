import { Link, useSearchParams } from "react-router";
import type { Page, Property, PropertyStatus } from "../api/types";
import { conQuery } from "../api/url";
import FiltroEstado from "../components/FiltroEstado";
import Paginacion from "../components/Paginacion";
import TablaPropiedades from "../components/TablaPropiedades";
import { useAvisoNavegacion } from "../hooks/useAvisoNavegacion";
import { useFetch } from "../hooks/useFetch";
import { usePaginaUrl } from "../hooks/usePaginaUrl";
import { mensajeCambio } from "../lib/ciclo";
import { ESTADOS } from "../lib/formato";
import ErrorCarga from "../components/ErrorCarga";
import Cargando from "../components/Cargando";
import Vacio from "../components/Vacio";
import estilos from "./MisPropiedadesPage.module.css";

const LIMITE = 10;
const ESTADOS_VALIDOS = Object.keys(ESTADOS) as PropertyStatus[];

// "Mis propiedades": listado de las publicaciones del vendedor (en cualquier estado) con sus acciones.
// El filtro por estado y la pagina viven en la URL (?status=DRAFT&page=2), como el listado publico (Clase 13).
export default function MisPropiedadesPage() {
  const [params, setParams] = useSearchParams();
  const { page, irAPagina } = usePaginaUrl();

  const estadoUrl = params.get("status");
  const status = ESTADOS_VALIDOS.find((e) => e === estadoUrl);

  const { datos, setDatos, cargando, error, recargar } = useFetch<
    Page<Property>
  >(conQuery("/agencies/me/properties", { page, limit: LIMITE, status }));

  // Aviso que dejo la pagina anterior ("Propiedad creada", "Cambios guardados"): el hook se ocupa del location.state.
  const [aviso, setAviso] = useAvisoNavegacion();

  function cambiarEstado(valor: string) {
    const siguiente = new URLSearchParams();
    if (valor) siguiente.set("status", valor);
    setParams(siguiente); // vuelve a la pagina 1
  }

  // El back acepto el cambio: se refleja en la lista que ya tenemos, sin volver a pedirla (setDatos de useFetch, como en la Clase 15).
  function estadoCambiado(actualizada: Property) {
    setDatos(
      (actual) =>
        actual && {
          ...actual,
          items: actual.items.map((p) =>
            p.id === actualizada.id
              ? {
                  ...p,
                  status: actualizada.status,
                  publishedAt: actualizada.publishedAt,
                }
              : p,
          ),
        },
    );
    setAviso(mensajeCambio(actualizada.title, actualizada.status));
    // Con un filtro de estado, la propiedad ya no pertenece a esta lista: se vuelve a pedir y desaparece (el aviso explica que paso).
    if (status && actualizada.status !== status) recargar();
  }

  function eliminada(propiedad: Property) {
    setAviso(`Se eliminó “${propiedad.title}”`);
    // Si era la unica de la pagina, se vuelve a la anterior.
    if (datos && datos.items.length === 1 && page > 1) irAPagina(page - 1);
    else recargar();
  }

  return (
    <section>
      <div className={estilos.encabezado}>
        <h1>Mis propiedades</h1>
        <Link to="/panel/propiedades/nueva" className="boton primario">
          + Nueva propiedad
        </Link>
      </div>

      {aviso && (
        <p className="exito" role="status">
          {aviso}{" "}
          <button
            type="button"
            className="boton"
            onClick={() => setAviso(null)}
          >
            ✕
          </button>
        </p>
      )}

      <FiltroEstado
        etiqueta="Estado"
        valor={status ?? ""}
        onCambiar={cambiarEstado}
      >
        <option value="">Todos</option>
        {ESTADOS_VALIDOS.map((e) => (
          <option key={e} value={e}>
            {ESTADOS[e]}
          </option>
        ))}
      </FiltroEstado>

      {cargando && !datos && <Cargando texto="Cargando propiedades…" />}

      {error && (
        <ErrorCarga
          que="No se pudieron cargar las propiedades"
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
            status
              ? `No tenés propiedades en estado “${ESTADOS[status]}”.`
              : "Todavía no cargaste ninguna propiedad."
          }
        >
          {status ? (
            <Link to="/panel/propiedades">Ver todas</Link>
          ) : (
            <Link to="/panel/propiedades/nueva">
              Cargar la primera propiedad
            </Link>
          )}
        </Vacio>
      )}

      {!error && datos && datos.items.length > 0 && (
        <>
          <TablaPropiedades
            propiedades={datos.items}
            cargando={cargando}
            onEstadoCambiado={estadoCambiado}
            onEliminada={eliminada}
          />
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

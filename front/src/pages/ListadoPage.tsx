import { Link, useSearchParams } from "react-router";
import type { Page, Property } from "../api/types";
import GrillaPropiedades from "../components/GrillaPropiedades";
import FiltrosPropiedades from "../components/FiltrosPropiedades";
import Paginacion from "../components/Paginacion";
import { conQuery } from "../api/url";
import { useDebounce } from "../hooks/useDebounce";
import { useFetch } from "../hooks/useFetch";
import { leerFiltros } from "../lib/filtrosUrl";
import ErrorCarga from "../components/ErrorCarga";
import Cargando from "../components/Cargando";
import Vacio from "../components/Vacio";
import estilos from "./ListadoPage.module.css";

// Espera a que termine de tipear antes de pedir (Clase 14, 2.2): un request por palabra, no uno por tecla.
const DEBOUNCE_MS = 400;

export default function ListadoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Los filtros, el orden y la pagina viven en la URL: se pueden compartir como link y sobreviven al F5 (Clase 13).
  // Como string es estable: sirve para comparar y para el debounce.
  const consulta = searchParams.toString();

  // Un hook hecho de hooks (Clase 15, 3.1): la URL se demora hasta que se deja de tipear y, recien entonces, cambia lo que pide useFetch.
  // Sin useEffect a la vista: el timer y la cancelacion de pedidos viven dentro de useDebounce y useFetch.
  const consultaDemorada = useDebounce(consulta, DEBOUNCE_MS);
  const {
    datos: resultado,
    cargando: pidiendo,
    error,
    recargar,
  } = useFetch<Page<Property>>(
    conQuery("/properties", leerFiltros(new URLSearchParams(consultaDemorada))),
  );
  // Se tipeo algo que todavia no se pidio: tambien cuenta como "buscando".
  const cargando = pidiendo || consulta !== consultaDemorada;

  function cambiar(
    cambios: Record<string, string | undefined>,
    reemplazar = false,
  ) {
    const nuevos = new URLSearchParams(searchParams); // copia: no se muta el original
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) nuevos.set(clave, valor);
      else nuevos.delete(clave); // filtro vacio = fuera de la URL
    }
    // Cualquier cambio de filtro vuelve a la primera pagina (salvo que lo que cambie sea la pagina).
    if (!("page" in cambios)) nuevos.delete("page");
    // replace: lo que se tipea cambia con cada tecla; sin esto, "Atras" desharia letra por letra.
    setSearchParams(nuevos, { replace: reemplazar });
  }

  function irAPagina(pagina: number) {
    cambiar({ page: pagina > 1 ? String(pagina) : undefined });
    window.scrollTo({ top: 0 });
  }

  const q = searchParams.get("q");
  const hayFiltros = searchParams.size > 0;

  return (
    <section>
      <h1>Propiedades</h1>

      <FiltrosPropiedades params={searchParams} onCambiar={cambiar} />

      <div className={estilos.resumen}>
        {q && (
          <span className="chip">
            Búsqueda: “{q}”
            <button
              type="button"
              onClick={() => cambiar({ q: undefined })}
              aria-label="Quitar la búsqueda"
            >
              ✕
            </button>
          </span>
        )}
        {hayFiltros && <Link to="/">Limpiar filtros</Link>}
        {resultado && !error && (
          <span className="aviso" role="status">
            {cargando
              ? "Buscando…"
              : `${resultado.total} ${resultado.total === 1 ? "propiedad" : "propiedades"}`}
          </span>
        )}
      </div>

      {error && (
        <ErrorCarga
          que="No se pudieron cargar las propiedades"
          mensaje={error}
          onReintentar={recargar}
        />
      )}

      {!error && !resultado && <Cargando texto="Cargando propiedades…" />}

      {!error &&
        resultado &&
        resultado.items.length === 0 &&
        !cargando &&
        (resultado.total > 0 ? (
          <Vacio texto="Esa página no existe.">
            <button
              type="button"
              className="boton"
              onClick={() => irAPagina(1)}
            >
              Ir a la primera página
            </button>
          </Vacio>
        ) : (
          <Vacio texto="No hay propiedades con esos filtros.">
            {hayFiltros && <Link to="/">Ver todas las propiedades</Link>}
          </Vacio>
        ))}

      {!error && resultado && resultado.items.length > 0 && (
        <>
          {/* Mientras llegan los datos nuevos se siguen viendo los anteriores, atenuados. */}
          <GrillaPropiedades
            propiedades={resultado.items}
            cargando={cargando}
          />
          <Paginacion
            page={resultado.page}
            limit={resultado.limit}
            total={resultado.total}
            onCambiar={irAPagina}
          />
        </>
      )}
    </section>
  );
}

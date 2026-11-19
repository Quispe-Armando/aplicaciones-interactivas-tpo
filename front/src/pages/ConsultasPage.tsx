import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Comment, Page, ReceivedComment } from "../api/types";
import { conQuery } from "../api/url";
import { useAuth } from "../auth/useAuth";
import FiltroEstado from "../components/FiltroEstado";
import GrupoPropiedad from "../components/GrupoPropiedad";
import Paginacion from "../components/Paginacion";
import TarjetaConsulta from "../components/TarjetaConsulta";
import { useFetch } from "../hooks/useFetch";
import { usePaginaUrl } from "../hooks/usePaginaUrl";
import { agruparPorPropiedad } from "../lib/agrupar";
import ErrorCarga from "../components/ErrorCarga";
import Cargando from "../components/Cargando";
import Vacio from "../components/Vacio";
import estilos from "./ConsultasPage.module.css";

const LIMITE = 50; // el maximo que acepta el back

// El filtro vive en la URL (?estado=pendientes), como los filtros del listado (Clase 13). Sin parametro: todas,
// asi se ven juntas las pendientes y las respondidas.
type Filtro = "todas" | "pendientes" | "respondidas";
const FILTROS: Record<Filtro, string> = {
  todas: "Todas",
  pendientes: "Pendientes",
  respondidas: "Respondidas",
};

export default function ConsultasPage() {
  const [avisoDesactualizacion, setAvisoDesactualizacion] = useState<
    string | null
  >(null);
  const { agency } = useAuth();
  const [params, setParams] = useSearchParams();
  const { page, irAPagina } = usePaginaUrl();

  const estadoUrl = params.get("estado");
  const filtro: Filtro =
    estadoUrl === "pendientes" || estadoUrl === "respondidas"
      ? estadoUrl
      : "todas";
  const answered = filtro === "todas" ? undefined : filtro === "respondidas";

  // Sin inmobiliaria todavia (la sesion se esta confirmando), no hay nada que pedir: url null.
  const { datos, setDatos, cargando, error, recargar } = useFetch<
    Page<ReceivedComment>
  >(
    agency
      ? conQuery(`/agencies/${agency.id}/comments`, {
          answered,
          page,
          limit: LIMITE,
        })
      : null,
  );
  // 409 al responder (otra pestaña ya la respondio): se avisa y se vuelve a pedir la lista para ver esa respuesta.
  function consultaDesactualizada() {
    setAvisoDesactualizacion(
      "Esta consulta ya fue respondida. Actualizamos la lista para mostrar la respuesta",
    );
    recargar();
  }
  function cambiarFiltro(valor: string) {
    setParams(valor === "todas" ? {} : { estado: valor });
  }

  // El back acepto la respuesta: la consulta pasa a "respondida" en la lista que ya tenemos, sin volver a pedirla.
  // La respuesta del PATCH no trae la propiedad, asi que solo se toma el texto de la respuesta.
  function consultaRespondida(actualizada: Comment) {
    setDatos(
      (actual) =>
        actual && {
          ...actual,
          items: actual.items.map((c) =>
            c.id === actualizada.id ? { ...c, reply: actualizada.reply } : c,
          ),
        },
    );
  }

  const grupos = datos ? agruparPorPropiedad(datos.items) : [];

  return (
    <section>
      <h1>Consultas recibidas</h1>

      <FiltroEstado etiqueta="Mostrar" valor={filtro} onCambiar={cambiarFiltro}>
        {Object.entries(FILTROS).map(([valor, etiqueta]) => (
          <option key={valor} value={valor}>
            {etiqueta}
          </option>
        ))}
      </FiltroEstado>

      {avisoDesactualizacion && (
        <div className={estilos.aviso} role="status">
          <span className={estilos.icono} aria-hidden="true">
            ✓
          </span>
          <div>
            <strong>Lista actualizada</strong>
            <p>{avisoDesactualizacion}</p>
          </div>
        </div>
      )}

      {!agency && <Cargando texto="Cargando…" />}
      {agency && cargando && !datos && <Cargando texto="Cargando consultas…" />}

      {error && (
        <ErrorCarga
          que="No se pudieron cargar las consultas"
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
            filtro === "pendientes"
              ? "No tenés consultas pendientes. 🎉"
              : filtro === "respondidas"
                ? "Todavía no respondiste ninguna consulta."
                : "Todavía no recibiste consultas."
          }
        >
          {filtro !== "todas" && <Link to="/panel/consultas">Ver todas</Link>}
        </Vacio>
      )}

      {!error && datos && datos.items.length > 0 && (
        <>
          <p className="aviso" role="status">
            {datos.total} {datos.total === 1 ? "consulta" : "consultas"}
          </p>
          {grupos.map((grupo) => (
            <GrupoPropiedad
              key={grupo.propertyId}
              propertyId={grupo.propertyId}
              titulo={grupo.titulo}
              cantidad={grupo.items.length}
              ocupado={cargando}
            >
              {grupo.items.map((consulta) => (
                <TarjetaConsulta
                  key={consulta.id}
                  consulta={consulta}
                  onRespondida={consultaRespondida}
                  onDesactualizada={consultaDesactualizada}
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

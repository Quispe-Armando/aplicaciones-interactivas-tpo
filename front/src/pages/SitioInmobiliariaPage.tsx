import { Link, useParams } from "react-router";
import type { Agency } from "../api/types";
import Estrellas from "../components/Estrellas";
import PropiedadesInmobiliaria from "../components/PropiedadesInmobiliaria";
import ResenasInmobiliaria from "../components/ResenasInmobiliaria";
import { useFetch } from "../hooks/useFetch";
import { useResenas } from "../hooks/useResenas";
import { hrefTelefono } from "../lib/formato";
import ErrorCarga from "../components/ErrorCarga";
import Cargando from "../components/Cargando";
import estilos from "./SitioInmobiliariaPage.module.css";

export default function SitioInmobiliariaPage() {
  const { id } = useParams();
  // Que la ruta coincida no garantiza que el dato exista (Clase 13): "/inmobiliarias/abc" tambien entra aca.
  const agencyId = id !== undefined && /^\d+$/.test(id) ? Number(id) : null;

  const {
    datos: agencia,
    cargando,
    error,
    noExiste,
    recargar,
  } = useFetch<Agency>(agencyId === null ? null : `/agencies/${agencyId}`);

  if (agencyId === null || noExiste) {
    return (
      <section className="mensaje">
        <h1>Inmobiliaria no encontrada</h1>
        <p>La inmobiliaria {id} no existe o ya no está disponible.</p>
        <Link to="/">Ver todas las propiedades</Link>
      </section>
    );
  }

  if (cargando) return <Cargando texto="Cargando inmobiliaria…" />;

  if (error || !agencia) {
    return (
      <ErrorCarga
        que="No se pudo cargar la inmobiliaria"
        mensaje={error}
        onReintentar={recargar}
      />
    );
  }

  // key: al pasar de una inmobiliaria a otra, todo el sitio (pagina de reseñas, formularios) arranca de cero.
  return <SitioInmobiliaria key={agencia.id} agencia={agencia} />;
}

function SitioInmobiliaria({ agencia }: { agencia: Agency }) {
  // Las reseñas se piden aca (no en su seccion) porque la cabecera muestra el promedio que llega con la lista.
  const resenas = useResenas(agencia.id);
  const rating = resenas.datos?.rating ?? agencia.rating;

  return (
    <div className={estilos.sitio}>
      <header className={estilos.cabecera}>
        {agencia.logoUrl ? (
          <img
            className={estilos.logo}
            src={agencia.logoUrl}
            alt={`Logo de ${agencia.name}`}
          />
        ) : (
          <div
            className={`${estilos.logo} ${estilos.sinLogo}`}
            aria-hidden="true"
          >
            {agencia.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1>{agencia.name}</h1>
          <p>
            {rating.count > 0 && rating.average !== null ? (
              <>
                <Estrellas valor={rating.average} />{" "}
                <strong>{rating.average.toFixed(1)}</strong> ({rating.count}{" "}
                {rating.count === 1 ? "reseña" : "reseñas"})
              </>
            ) : (
              <span className="aviso">Todavía sin reseñas</span>
            )}
          </p>
          {agencia.description && <p>{agencia.description}</p>}
          <p className={estilos.contacto}>
            {/* tel: abre el discador en el celular */}
            <a href={hrefTelefono(agencia.contactPhone)}>
              📞 {agencia.contactPhone}
            </a>
            <a href={`mailto:${agencia.contactEmail}`}>
              ✉️ {agencia.contactEmail}
            </a>
            {agencia.officeAddress && <span>📍 {agencia.officeAddress}</span>}
          </p>
        </div>
      </header>

      {/* key: al pasar de una inmobiliaria a otra, las secciones arrancan de cero (pagina 1, formulario vacio). */}
      <PropiedadesInmobiliaria agencyId={agencia.id} />
      <ResenasInmobiliaria agencyId={agencia.id} resenas={resenas} />
    </div>
  );
}

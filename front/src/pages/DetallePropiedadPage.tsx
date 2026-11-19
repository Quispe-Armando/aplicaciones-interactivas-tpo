import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import type { Property } from "../api/types";
import AtributosPropiedad from "../components/AtributosPropiedad";
import ConsultasPropiedad from "../components/ConsultasPropiedad";
import Galeria from "../components/Galeria";
import PedirVisita from "../components/PedirVisita";
import { useFetch } from "../hooks/useFetch";
import { ESTADOS, formatearPrecio } from "../lib/formato";
import ErrorCarga from "../components/ErrorCarga";
import Cargando from "../components/Cargando";
import estilos from "./DetallePropiedadPage.module.css";

export default function DetallePropiedadPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Que la ruta coincida no garantiza que el dato exista (Clase 13): "/propiedades/abc" tambien entra aca.
  const propertyId = id !== undefined && /^\d+$/.test(id) ? Number(id) : null;

  // Un id que no es un numero no se pide a la API (url null).
  const { datos: propiedad, cargando, error, noExiste, recargar } = useFetch<Property>(propertyId === null ? null : `/properties/${propertyId}`);
  // Id de la propiedad cuyo formulario de visita esta abierto (asi no queda abierto al pasar a otra propiedad).
  const [visitaAbiertaEn, setVisitaAbiertaEn] = useState<number | null>(null);

  // "Volver": una entrada atras (con los filtros del listado). Si la pagina se abrio directo, atras saldria del sitio: va al listado.
  function volver() {
    if (location.key === "default") navigate("/");
    else navigate(-1);
  }

  if (propertyId === null || noExiste) {
    return (
      <section className="mensaje">
        <h1>Propiedad no encontrada</h1>
        <p>La propiedad {id} no existe o ya no está disponible.</p>
        <Link to="/">Ver todas las propiedades</Link>
      </section>
    );
  }

  if (cargando) return <Cargando texto="Cargando propiedad…" />;

  if (error || !propiedad) {
    return (
      <ErrorCarga que="No se pudo cargar la propiedad" mensaje={error} onReintentar={recargar} />
    );
  }

  return (
    <article className={estilos.detalle}>
      <button type="button" className="boton" onClick={volver}>
        ← Volver
      </button>

      {/* key: al pasar de una propiedad a otra la galeria arranca de cero (en su portada). */}
      <Galeria key={propiedad.id} imagenes={propiedad.images} titulo={propiedad.title} />

      <header>
        <h1>{propiedad.title}</h1>
        <p className={estilos.precio}>{formatearPrecio(propiedad.price, propiedad.currency, propiedad.operation)}</p>
        {propiedad.status !== "PUBLISHED" && <p className={estilos.avisoEstado}>Esta propiedad está {ESTADOS[propiedad.status].toLowerCase()}.</p>}
        {propiedad.agency && (
          <p>
            Publicada por <Link to={`/inmobiliarias/${propiedad.agency.id}`}>{propiedad.agency.name}</Link>
          </p>
        )}
        {/* Solo se ofrece en propiedades Publicadas: el back rechaza las demas con 409. */}
        {propiedad.status === "PUBLISHED" && visitaAbiertaEn !== propiedad.id && (
          <button type="button" className="boton primario" onClick={() => setVisitaAbiertaEn(propiedad.id)}>
            📅 Pedir visita
          </button>
        )}
      </header>

      {propiedad.status === "PUBLISHED" && visitaAbiertaEn === propiedad.id && (
        <PedirVisita key={propiedad.id} propertyId={propiedad.id} onCerrar={() => setVisitaAbiertaEn(null)} />
      )}

      <AtributosPropiedad propiedad={propiedad} />

      <h2>Descripción</h2>
      <p className={estilos.descripcion}>{propiedad.description}</p>

      <ConsultasPropiedad propertyId={propiedad.id} />
    </article>
  );
}

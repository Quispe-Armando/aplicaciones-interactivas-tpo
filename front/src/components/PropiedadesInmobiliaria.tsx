import { useState } from "react";
import type { Page, Property } from "../api/types";
import { conQuery } from "../api/url";
import { useFetch } from "../hooks/useFetch";
import GrillaPropiedades from "./GrillaPropiedades";
import Paginacion from "./Paginacion";
import Cargando from "./Cargando";
import ErrorCarga from "./ErrorCarga";
import Vacio from "./Vacio";

const PAGE_SIZE = 6;

// Las propiedades publicadas de la inmobiliaria, cada una con link a su detalle (la card entera es el link).
export default function PropiedadesInmobiliaria({
  agencyId,
}: {
  agencyId: number;
}) {
  const [pagina, setPagina] = useState(1);
  const {
    datos: resultado,
    error,
    recargar,
  } = useFetch<Page<Property>>(
    conQuery(`/agencies/${agencyId}/properties`, {
      page: pagina,
      limit: PAGE_SIZE,
    }),
  );

  return (
    <section>
      <h2>Sus propiedades{resultado && ` (${resultado.total})`}</h2>
      {error && (
        <ErrorCarga
          que="No se pudieron cargar las propiedades"
          mensaje={error}
          onReintentar={recargar}
        />
      )}
      {!error && !resultado && <Cargando texto="Cargando propiedades…" />}
      {resultado && resultado.total === 0 && (
        <Vacio texto="Esta inmobiliaria no tiene propiedades publicadas por ahora." />
      )}
      {resultado && resultado.items.length > 0 && (
        <>
          <GrillaPropiedades propiedades={resultado.items} />
          <Paginacion
            page={resultado.page}
            limit={resultado.limit}
            total={resultado.total}
            onCambiar={setPagina}
          />
        </>
      )}
    </section>
  );
}

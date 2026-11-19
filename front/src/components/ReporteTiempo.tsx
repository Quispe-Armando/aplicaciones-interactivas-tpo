import type { TimeOnMarket } from "../api/types";
import { useFetch } from "../hooks/useFetch";
import { formatearDias } from "../lib/reportes";
import ErrorCarga from "./ErrorCarga";
import TarjetaReporte from "./TarjetaReporte";
import Cargando from "./Cargando";
import Vacio from "./Vacio";
import estilos from "./ReporteTiempo.module.css";

// Tiempo promedio en el mercado: dias entre que se publica y se vende o alquila.
export default function ReporteTiempo({ agencyId }: { agencyId: number }) {
  const { datos, cargando, error, recargar } = useFetch<TimeOnMarket>(`/agencies/${agencyId}/reports/avg-time-on-market`);

  // Sin ninguna propiedad cerrada el back manda averageDays null: ahi no se muestra un numero (ni "NaN días") sino un estado vacio.
  const dias = datos ? formatearDias(datos.averageDays) : null;

  return (
    <TarjetaReporte titulo="Tiempo promedio en el mercado">
      {cargando && <Cargando texto="Cargando…" />}
      {!cargando && (error || !datos) && <ErrorCarga que="No se pudo cargar este reporte" mensaje={error} onReintentar={recargar} />}
      {!cargando && !error && datos && dias === null && (
        <Vacio texto="Todavía no vendiste ni alquilaste ninguna propiedad. Cuando lo hagas, acá vas a ver cuántos días tardaron en cerrarse." />
      )}
      {!cargando && !error && datos && dias !== null && (
        <>
          <p className={estilos.indicador}>
            <strong className={estilos.numero}>{dias}</strong>
          </p>
          <p className="aviso">
            Promedio entre la publicación y la venta o el alquiler, sobre {datos.closedCount} {datos.closedCount === 1 ? "propiedad cerrada" : "propiedades cerradas"}.
          </p>
        </>
      )}
    </TarjetaReporte>
  );
}

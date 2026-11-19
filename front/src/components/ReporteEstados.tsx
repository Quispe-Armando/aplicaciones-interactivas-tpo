import { Link } from "react-router";
import type { StatusSummary } from "../api/types";
import { useFetch } from "../hooks/useFetch";
import { ESTADOS } from "../lib/formato";
import ErrorCarga from "./ErrorCarga";
import TarjetaReporte from "./TarjetaReporte";
import Cargando from "./Cargando";
import BadgeEstado from "./BadgeEstado";
import estilos from "./ReporteEstados.module.css";

// Propiedades por estado ACTUAL: una tarjeta por estado. Cada una lleva al listado ya filtrado por ese estado.
export default function ReporteEstados({ agencyId }: { agencyId: number }) {
  const { datos, cargando, error, recargar } = useFetch<StatusSummary>(`/agencies/${agencyId}/reports/status-summary`);

  return (
    <TarjetaReporte titulo="Propiedades por estado">
      {cargando && <Cargando texto="Cargando…" />}
      {!cargando && (error || !datos) && <ErrorCarga que="No se pudo cargar este reporte" mensaje={error} onReintentar={recargar} />}
      {!cargando && !error && datos && (
        <>
          <p className="aviso" role="status">
            {datos.total} {datos.total === 1 ? "propiedad" : "propiedades"} en total
          </p>
          <ul className={estilos.tarjetas}>
            {datos.items.map(({ status, count }) => (
              <li key={status} className={count === 0 ? `${estilos.tarjeta} ${estilos.vacia}` : estilos.tarjeta}>
                <Link to={`/panel/propiedades?status=${status}`}>
                  <strong className={estilos.numero}>{count}</strong>
                  <BadgeEstado estado={status} texto={ESTADOS[status]} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </TarjetaReporte>
  );
}

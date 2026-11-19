import type { StatusHistoryEntry } from "../api/types";
import ErrorCarga from "./ErrorCarga";
import Vacio from "./Vacio";
import { useFetch } from "../hooks/useFetch";
import { ESTADOS, formatearFecha } from "../lib/formato";
import Cargando from "./Cargando";
import estilos from "./HistorialEstados.module.css";

// Historial de cambios de estado de una propiedad (solo lo ve su dueño). Se pide al montarse:
// la fila lo monta recien cuando el vendedor lo abre, asi que no hay requests de historiales que nadie miro.
export default function HistorialEstados({ propertyId }: { propertyId: number }) {
  const { datos: historial, cargando, error, recargar } = useFetch<StatusHistoryEntry[]>(`/properties/${propertyId}/status-history`);

  if (cargando) return <Cargando texto="Cargando historial…" />;
  if (error || !historial) return <ErrorCarga que="No se pudo cargar el historial" mensaje={error} onReintentar={recargar} />;
  if (historial.length === 0) return <Vacio texto="Todavía no hay cambios de estado." />;

  return (
    <ol className={estilos.historial}>
      {historial.map((entrada) => (
        <li key={entrada.id}>
          <time dateTime={entrada.changedAt}>{formatearFecha(entrada.changedAt)}</time>
          {entrada.fromStatus === null ? (
            <span>
              Creada como <strong>{ESTADOS[entrada.toStatus]}</strong>
            </span>
          ) : (
            <span>
              {ESTADOS[entrada.fromStatus]} → <strong>{ESTADOS[entrada.toStatus]}</strong>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

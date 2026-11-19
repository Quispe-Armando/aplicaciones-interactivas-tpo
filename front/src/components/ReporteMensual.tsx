import type { CSSProperties } from "react";
import type { MonthlyReport } from "../api/types";
import { useFetch } from "../hooks/useFetch";
import { etiquetaMes, maximoMensual, porcentaje } from "../lib/reportes";
import ErrorCarga from "./ErrorCarga";
import TarjetaReporte from "./TarjetaReporte";
import Cargando from "./Cargando";
import Vacio from "./Vacio";
import estilos from "./ReporteMensual.module.css";

const SERIES = [
  { clave: "published", nombre: "Publicadas", color: "#2f6fd1" },
  { clave: "sold", nombre: "Vendidas", color: "#2e9e4f" },
  { clave: "rented", nombre: "Alquiladas", color: "#e08a00" },
] as const;

// Publicaciones nuevas y ventas/alquileres por mes: barras hechas con CSS (alto proporcional al maximo; el color llega
// por una variable CSS en el style, como en el ejercicio de Reportes de la Clase 15).
export default function ReporteMensual({ agencyId }: { agencyId: number }) {
  const { datos, cargando, error, recargar } = useFetch<MonthlyReport>(
    `/agencies/${agencyId}/reports/monthly`,
  );

  const filas = datos?.items ?? [];
  const maximo = maximoMensual(filas); // una escala comun para todas las barras

  return (
    <TarjetaReporte titulo="Publicaciones y cierres por mes">
      {cargando && <Cargando texto="Cargando…" />}
      {!cargando && (error || !datos) && (
        <ErrorCarga
          que="No se pudo cargar este reporte"
          mensaje={error}
          onReintentar={recargar}
        />
      )}
      {!cargando && !error && datos && filas.length === 0 && (
        <Vacio texto="Todavía no hay publicaciones ni cierres para mostrar." />
      )}
      {!cargando && !error && datos && filas.length > 0 && (
        <>
          <ul className={estilos.leyenda}>
            {SERIES.map((serie) => (
              <li key={serie.clave}>
                <span
                  className={estilos.muestra}
                  style={{ background: serie.color }}
                />{" "}
                {serie.nombre}
              </li>
            ))}
          </ul>
          <div className={estilos.grafico}>
            {filas.map((fila) => (
              <div key={fila.month} className={estilos.mes}>
                <div className={estilos.barras}>
                  {SERIES.map((serie) => {
                    const valor = fila[serie.clave];
                    const estilo = {
                      height: `${porcentaje(valor, maximo)}%`,
                      "--color-barra": serie.color,
                    } as CSSProperties;
                    return (
                      <div
                        key={serie.clave}
                        className={estilos.columna}
                        title={`${serie.nombre}: ${valor}`}
                      >
                        <span className={estilos.valor}>{valor}</span>
                        <div className={estilos.barra} style={estilo} />
                      </div>
                    );
                  })}
                </div>
                <span className={estilos.etiqueta}>
                  {etiquetaMes(fila.month)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </TarjetaReporte>
  );
}

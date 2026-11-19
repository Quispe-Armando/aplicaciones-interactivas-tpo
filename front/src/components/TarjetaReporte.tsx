import type { ReactNode } from "react";
import estilos from "./TarjetaReporte.module.css"

interface TarjetaReporteProps {
  titulo: string;
  children: ReactNode;
}

// El marco de un indicador del dashboard. Cada indicador pide sus datos por su cuenta (su propio useFetch),
// asi tiene su propio "Cargando…" y su propio error: si uno falla, los otros se ven igual.
export default function TarjetaReporte({ titulo, children }: TarjetaReporteProps) {
  return (
    <section className={estilos.reporte}>
      <h2>{titulo}</h2>
      {children}
    </section>
  );
}


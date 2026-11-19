import { useAuth } from "../auth/useAuth";
import ReporteEstados from "../components/ReporteEstados";
import ReporteMensual from "../components/ReporteMensual";
import ReporteTiempo from "../components/ReporteTiempo";
import Cargando from "../components/Cargando";
import estilos from "./ReportesPage.module.css";

// Dashboard: tres indicadores independientes. Cada uno llama a su propio useFetch, asi que los tres pedidos salen a la vez
// (en paralelo, en cuanto se monta la pagina) y cada uno tiene su carga y su error: si uno falla, los otros se ven igual.
export default function ReportesPage() {
  const { agency } = useAuth();

  return (
    <section>
      <h1>Reportes</h1>
      {!agency && <Cargando texto="Cargando…" />}
      {agency && (
        <div className={estilos.dashboard}>
          <ReporteEstados agencyId={agency.id} />
          <ReporteTiempo agencyId={agency.id} />
          <ReporteMensual agencyId={agency.id} />
        </div>
      )}
    </section>
  );
}

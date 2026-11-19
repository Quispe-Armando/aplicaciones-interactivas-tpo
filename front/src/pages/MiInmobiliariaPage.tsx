import type { Agency } from "../api/types";
import { useAuth } from "../auth/useAuth";
import Cargando from "../components/Cargando";
import ErrorCarga from "../components/ErrorCarga";
import FormularioInmobiliaria from "../components/FormularioInmobiliaria";
import ZonaPeligro from "../components/ZonaPeligro";
import { useFetch } from "../hooks/useFetch";

// Pantalla de la inmobiliaria: editar sus datos y eliminarla.
export default function MiInmobiliariaPage() {
  const { agency, updateAgency } = useAuth();
  const agencyId = agency?.id ?? null;
  const { datos: agenciaCargada, cargando, error: errorCarga, recargar } = useFetch<Agency>(agencyId === null ? null : `/agencies/${agencyId}`);

  if (errorCarga) {
    return (
      <ErrorCarga que="No se pudieron cargar los datos" mensaje={errorCarga} onReintentar={recargar} />
    );
  }
  if (cargando || agencyId === null || !agenciaCargada) return <Cargando texto="Cargando datos de la inmobiliaria…" />;

  return (
    <section>
      <h1>Mi inmobiliaria</h1>
      <FormularioInmobiliaria agencia={agenciaCargada} onGuardada={(a) => updateAgency({ id: a.id, name: a.name })} />
      <ZonaPeligro agencyId={agencyId} />
    </section>
  );
}

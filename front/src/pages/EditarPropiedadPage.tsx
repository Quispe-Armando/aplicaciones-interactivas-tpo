import { Link, useNavigate, useParams } from "react-router";
import type { Property } from "../api/types";
import PropiedadForm from "../components/PropiedadForm";
import { useFetch } from "../hooks/useFetch";
import { ESTADOS } from "../lib/formato";
import { aFormulario, esEditable } from "../lib/propiedadForm";
import { propertiesService } from "../services";
import ErrorCarga from "../components/ErrorCarga";
import Cargando from "../components/Cargando";

export default function EditarPropiedadPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const propertyId = id !== undefined && /^\d+$/.test(id) ? Number(id) : null;

  // Un id que no es un numero no se pide a la API (url null). Es el endpoint del vendedor: trae tambien los borradores.
  const { datos: propiedad, cargando, error, status, noExiste, recargar } = useFetch<Property>(
    propertyId === null ? null : `/agencies/me/properties/${propertyId}`,
  );

  const volver = <Link to="/panel/propiedades">← Volver a mis propiedades</Link>;

  if (propertyId === null || noExiste) {
    return (
      <section className="mensaje">
        <h1>Propiedad no encontrada</h1>
        <p>La propiedad {id} no existe.</p>
        {volver}
      </section>
    );
  }
  if (status === 403) {
    return (
      <section className="mensaje">
        <h1>Sin permiso</h1>
        <p>Esta propiedad es de otra inmobiliaria.</p>
        {volver}
      </section>
    );
  }
  if (cargando) return <Cargando texto="Cargando propiedad…" />;
  if (error || !propiedad) {
    return (
      <ErrorCarga que="No se pudo cargar la propiedad" mensaje={error} onReintentar={recargar} />
    );
  }

  // Entrar a mano a /editar de una propiedad vendida, alquilada o cancelada: un mensaje en vez del formulario.
  if (!esEditable(propiedad.status)) {
    return (
      <section className="mensaje">
        <h1>No se puede editar</h1>
        <p>
          “{propiedad.title}” está {ESTADOS[propiedad.status].toLowerCase()}: ya no admite cambios.
        </p>
        {volver}
      </section>
    );
  }

  return (
    <section>
      <h1>Editar propiedad</h1>
      {/* El formulario se monta recien ahora que llegaron los datos: arranca precargado. */}
      <PropiedadForm
        inicial={aFormulario(propiedad)}
        etiquetaGuardar="Guardar cambios"
        onGuardar={async (datos) => {
          await propertiesService.update(propiedad.id, datos);
          navigate("/panel/propiedades", { replace: true, state: { aviso: "Cambios guardados ✅" } });
        }}
        onCancelar={() => navigate("/panel/propiedades")}
      />
    </section>
  );
}

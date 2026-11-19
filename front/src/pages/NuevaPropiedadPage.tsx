import { useNavigate } from "react-router";
import PropiedadForm from "../components/PropiedadForm";
import { FORM_VACIO } from "../lib/propiedadForm";
import { propertiesService } from "../services";

export default function NuevaPropiedadPage() {
  const navigate = useNavigate();

  return (
    <section>
      <h1>Nueva propiedad</h1>
      <p className="aviso">Se guarda como borrador: no se ve en el sitio hasta que la publiques.</p>
      <PropiedadForm
        inicial={FORM_VACIO}
        etiquetaGuardar="Crear propiedad"
        onGuardar={async (datos) => {
          await propertiesService.create(datos);
          // replace: Atras no vuelve al formulario. state: un aviso para la pagina de destino (Clase 13).
          navigate("/panel/propiedades", { replace: true, state: { aviso: "Propiedad creada como borrador ✅" } });
        }}
        onCancelar={() => navigate("/panel/propiedades")}
      />
    </section>
  );
}

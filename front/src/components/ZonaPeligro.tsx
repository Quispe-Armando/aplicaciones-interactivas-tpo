import { useState } from "react";
import { useNavigate } from "react-router";
import { errorMessage } from "../api/errors";
import { useAuth } from "../auth/useAuth";
import { agenciesService } from "../services";
import Confirmacion from "./Confirmacion";
import estilos from "./ZonaPeligro.module.css";

// Eliminar la inmobiliaria: pide confirmacion y, si el back no lo permite (409), muestra el motivo.
export default function ZonaPeligro({ agencyId }: { agencyId: number }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [motivo, setMotivo] = useState<string | null>(null);

  async function eliminar() {
    setEliminando(true);
    setMotivo(null);
    try {
      await agenciesService.remove(agencyId);
      logout();
      navigate("/", { replace: true });
    } catch (e) {
      // 409: el back explica por que no se puede (tiene propiedades publicadas o reservadas): se muestra tal cual.
      setMotivo(errorMessage(e));
      setConfirmando(false);
      setEliminando(false);
    }
  }

  return (
    <section className={estilos.zona}>
      <h2>Eliminar inmobiliaria</h2>
      <p>
        Se borran la inmobiliaria, sus propiedades y tu cuenta. No se puede
        deshacer.
      </p>
      {motivo && (
        <p className="error" role="alert">
          No se pudo eliminar la inmobiliaria: {motivo}
        </p>
      )}
      {confirmando ? (
        <Confirmacion
          pregunta="¿Seguro que querés eliminar tu inmobiliaria?"
          confirmar={eliminando ? "Eliminando…" : "Sí, eliminar todo"}
          ocupado={eliminando}
          onConfirmar={eliminar}
          onCancelar={() => setConfirmando(false)}
        >
          Se borran también sus propiedades y tu cuenta.
        </Confirmacion>
      ) : (
        <button
          type="button"
          className="boton peligro"
          onClick={() => setConfirmando(true)}
        >
          Eliminar inmobiliaria
        </button>
      )}
    </section>
  );
}

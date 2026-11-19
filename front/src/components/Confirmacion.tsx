import type { KeyboardEvent, ReactNode } from "react";
import estilos from "./Confirmacion.module.css";

interface ConfirmacionProps {
  pregunta: string; // "¿Dar de baja?"
  children?: ReactNode; // la advertencia: que pasa si se confirma
  confirmar: string; // texto del boton que ejecuta: "Sí, dar de baja"
  cancelar?: string;
  ocupado?: boolean; // mientras se ejecuta, los dos botones quedan deshabilitados
  onConfirmar: () => void;
  onCancelar: () => void;
}

// Confirmacion reutilizable para acciones que no se pueden deshacer. Aparece en el mismo lugar donde se hizo el click
// (no es una ventana modal: en la cursada no se vio ninguna). Ninguna accion destructiva se ejecuta con un solo click:
// el primer click abre esto y recien el segundo ("Sí, …") la ejecuta.
//   - El foco arranca en "No" (autoFocus): Enter sin querer cancela en vez de ejecutar.
//   - Escape cancela.
export default function Confirmacion({ pregunta, children, confirmar, cancelar = "No", ocupado = false, onConfirmar, onCancelar }: ConfirmacionProps) {
  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") onCancelar();
  }

  return (
    <div className={estilos.confirmar} role="alertdialog" aria-label={pregunta} onKeyDown={alTeclear}>
      <p>
        <strong>{pregunta}</strong> {children}
      </p>
      <div className="acciones-fila">
        <button type="button" className="boton peligro" disabled={ocupado} onClick={onConfirmar}>
          {confirmar}
        </button>
        <button type="button" className="boton" disabled={ocupado} onClick={onCancelar} autoFocus>
          {cancelar}
        </button>
      </div>
    </div>
  );
}

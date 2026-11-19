import { useState } from "react";
import type { ChangeEvent } from "react";

interface CampoPasswordProps {
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  autoComplete: "current-password" | "new-password";
}

// Input de contraseña con boton para mostrarla u ocultarla.
export default function CampoPassword({ name, value, onChange, autoComplete }: CampoPasswordProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="password">
      <input name={name} type={visible ? "text" : "password"} value={value} onChange={onChange} autoComplete={autoComplete} />
      {/* type="button": sin esto, apretarlo enviaria el formulario. */}
      <button type="button" className="boton" onClick={() => setVisible(!visible)} aria-pressed={visible}>
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </span>
  );
}

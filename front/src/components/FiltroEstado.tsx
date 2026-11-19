import type { ReactNode } from "react";
import estilos from "./FiltroEstado.module.css";

interface FiltroEstadoProps {
  etiqueta: string; // "Estado", "Mostrar"
  valor: string;
  onCambiar: (valor: string) => void;
  children: ReactNode; // las <option>
}

// El select con etiqueta que filtra las listas del panel (Mis propiedades, Visitas, Consultas, Actividad).
// El valor lo maneja la pagina (vive en la URL): este componente solo lo muestra y avisa cuando cambia.
export default function FiltroEstado({ etiqueta, valor, onCambiar, children }: FiltroEstadoProps) {
  return (
    <div className={`campo ${estilos.filtro}`}>
      <label>
        {etiqueta}
        <select value={valor} onChange={(e) => onCambiar(e.target.value)}>
          {children}
        </select>
      </label>
    </div>
  );
}

import type { ReactNode } from "react";
import estilos from "./Vacio.module.css";

// Estado vacio reutilizable: cuando una lista no tiene nada, se dice por que y, si hay, que hacer (children: un link o un boton).
export default function Vacio({
  texto,
  children,
}: {
  texto: string;
  children?: ReactNode;
}) {
  return (
    <div className={`mensaje ${estilos.vacio}`}>
      <p>{texto}</p>
      {children}
    </div>
  );
}

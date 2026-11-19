import type { ReactNode } from "react";
import { Link } from "react-router";
import estilos from "./GrupoPropiedad.module.css";

interface GrupoPropiedadProps {
  propertyId: number;
  titulo: string;
  cantidad: number;
  ocupado: boolean; // se estan pidiendo datos nuevos (aria-busy)
  children: ReactNode; // las tarjetas (<li>) del grupo
}

// El titulo de una propiedad (con link a su detalle) y debajo sus tarjetas: lo comparten Visitas y Consultas.
export default function GrupoPropiedad({ propertyId, titulo, cantidad, ocupado, children }: GrupoPropiedadProps) {
  return (
    <section className={estilos.grupo} aria-busy={ocupado}>
      <h2>
        <Link to={`/propiedades/${propertyId}`}>{titulo}</Link> <small className="aviso">({cantidad})</small>
      </h2>
      <ul className={estilos.lista}>{children}</ul>
    </section>
  );
}

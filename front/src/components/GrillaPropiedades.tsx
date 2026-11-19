import type { Property } from "../api/types";
import CardPropiedad from "./CardPropiedad";
import estilos from "./GrillaPropiedades.module.css";

interface GrillaPropiedadesProps {
  propiedades: Property[];
  cargando?: boolean; // mientras llegan datos nuevos se siguen viendo los anteriores, atenuados
}

// La grilla de cards del listado publico y del sitio de una inmobiliaria.
export default function GrillaPropiedades({ propiedades, cargando = false }: GrillaPropiedadesProps) {
  return (
    <div className={cargando ? `${estilos.grilla} ${estilos.cargando}` : estilos.grilla} aria-busy={cargando}>
      {propiedades.map((propiedad) => (
        <CardPropiedad key={propiedad.id} propiedad={propiedad} />
      ))}
    </div>
  );
}

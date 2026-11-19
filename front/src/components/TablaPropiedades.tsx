import type { Property } from "../api/types";
import FilaPropiedad from "./FilaPropiedad";
import estilos from "./TablaPropiedades.module.css";

interface TablaPropiedadesProps {
  propiedades: Property[];
  cargando: boolean;
  // La pagina es la dueña de la lista: las filas le avisan y ella la actualiza.
  onEstadoCambiado: (actualizada: Property) => void;
  onEliminada: (eliminada: Property) => void;
}

// La tabla de "Mis propiedades". En el celular se ve como una pila de tarjetas (ver el .module.css).
export default function TablaPropiedades({ propiedades, cargando, onEstadoCambiado, onEliminada }: TablaPropiedadesProps) {
  return (
    <table className={estilos.tabla} aria-busy={cargando}>
      <thead>
        <tr>
          <th>Foto</th>
          <th>Título</th>
          <th>Operación</th>
          <th>Precio</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {propiedades.map((p) => (
          <FilaPropiedad key={p.id} propiedad={p} onEstadoCambiado={onEstadoCambiado} onEliminada={onEliminada} />
        ))}
      </tbody>
    </table>
  );
}

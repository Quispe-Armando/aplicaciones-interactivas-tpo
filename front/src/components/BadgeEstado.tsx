import estilos from "./BadgeEstado.module.css";

// Etiqueta de color con el estado de una propiedad, una solicitud de visita o una consulta.
// El color sale del estado mismo (estilos[estado], Clase 15): una clase por estado en el .module.css, sin if ni switch.
export default function BadgeEstado({ estado, texto }: { estado: string; texto: string }) {
  return <span className={`${estilos.badge} ${estilos[estado] ?? ""}`}>{texto}</span>;
}

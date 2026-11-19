import estilos from "./Estrellas.module.css";

// Calificacion de solo lectura: 4.2 -> ★★★★☆ (se redondea a la estrella entera mas cercana).
export default function Estrellas({ valor }: { valor: number }) {
  const llenas = Math.round(valor);
  return (
    <span className={estilos.estrellas} role="img" aria-label={`${valor.toFixed(1)} de 5`}>
      {"★".repeat(llenas)}
      {"☆".repeat(5 - llenas)}
    </span>
  );
}

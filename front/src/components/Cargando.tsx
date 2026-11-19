import estilos from "./Cargando.module.css";

// Estado de carga reutilizable: ninguna pantalla se queda en blanco mientras espera a la API.
// role="status": los lectores de pantalla anuncian el texto sin mover el foco.
export default function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <p className={`mensaje ${estilos.cargando}`} role="status">
      <span className={estilos.spinner} aria-hidden="true" /> {texto}
    </p>
  );
}

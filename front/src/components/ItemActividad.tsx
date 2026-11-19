import { Link } from "react-router";
import type { Activity } from "../api/types";
import { useAccion } from "../hooks/useAccion";
import { ETIQUETAS_ACTIVIDAD, ICONOS_ACTIVIDAD, destinoActividad } from "../lib/actividad";
import { formatearFecha } from "../lib/formato";
import { activityService } from "../services";
import estilos from "./ItemActividad.module.css";

interface ItemActividadProps {
  actividad: Activity;
  agencyId: number;
  // Avisa a la pagina que el back la marco como leida: ella actualiza la lista y, con eso, baja el contador.
  onLeida: (actualizada: Activity) => void;
}

// Una novedad del feed. Las no leidas se ven distintas (negrita, punto y fondo). Al hacer click en el mensaje se marca
// como leida y se va a donde se atiende (consultas, visitas...); tambien se puede marcar sin salir, con el boton.
export default function ItemActividad({ actividad, agencyId, onLeida }: ItemActividadProps) {
  // Si PATCH falla, tira el error: onLeida no se llama y la novedad sigue sin leer (el error se ve en el item).
  const marcar = useAccion(async () => {
    onLeida(await activityService.markAsRead(actividad.id));
  });

  function alHacerClick() {
    // Ya leida: solo se navega. No leida: se marca y el Link sigue su camino a la seccion.
    if (!actividad.isRead) marcar.ejecutar();
  }

  return (
    <li className={`${estilos.actividad} ${actividad.isRead ? estilos.leida : estilos.nueva}`}>
      <span className={estilos.icono} aria-hidden="true">
        {ICONOS_ACTIVIDAD[actividad.type]}
      </span>
      <div className={estilos.cuerpo}>
        <Link to={destinoActividad(actividad, agencyId)} onClick={alHacerClick}>
          {actividad.message}
        </Link>
        <small className="aviso">
          {ETIQUETAS_ACTIVIDAD[actividad.type]} · {formatearFecha(actividad.createdAt)}
          {!actividad.isRead && <span className={estilos.punto}> · Sin leer</span>}
        </small>
        {marcar.error && (
          <small className="error" role="alert">
            No se pudo marcar como leída: {marcar.error}
          </small>
        )}
      </div>
      {!actividad.isRead && (
        <button type="button" className="boton" disabled={marcar.pendiente} onClick={() => marcar.ejecutar()}>
          {marcar.pendiente ? "Marcando…" : "Marcar como leída"}
        </button>
      )}
    </li>
  );
}

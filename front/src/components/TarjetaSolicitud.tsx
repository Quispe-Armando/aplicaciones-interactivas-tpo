import { useState } from "react";
import type { VisitRequest } from "../api/types";
import { useAccion } from "../hooks/useAccion";
import { ESTADOS_VISITA, accionesVisita } from "../lib/visitas";
import type { AccionVisita } from "../lib/visitas";
import { formatearFecha, hrefTelefono } from "../lib/formato";
import { visitRequestsService } from "../services";
import Confirmacion from "./Confirmacion";
import BadgeEstado from "./BadgeEstado";
import estilos from "./TarjetaSolicitud.module.css";

interface TarjetaSolicitudProps {
  solicitud: VisitRequest;
  // Avisa a la pagina (dueña de la lista) que el back acepto el cambio: ella actualiza la lista sin volver a pedirla.
  onCambiada: (actualizada: VisitRequest) => void;
}

// Una solicitud de visita. Cada tarjeta llama a su propio useAccion: su pendiente y su error son suyos,
// asi que se pueden responder varias a la vez y un error aparece en la tarjeta que fallo.
export default function TarjetaSolicitud({ solicitud, onCambiada }: TarjetaSolicitudProps) {
  const [porConfirmar, setPorConfirmar] = useState<AccionVisita | null>(null);

  // Si PATCH falla, tira el error: onCambiada no se llama y la tarjeta queda como estaba.
  const cambio = useAccion(async (destino: AccionVisita["destino"]) => {
    onCambiada(await visitRequestsService.changeStatus(solicitud.id, destino));
  });

  const acciones = accionesVisita(solicitud.status);

  function pedir(accion: AccionVisita) {
    if (accion.advertencia) setPorConfirmar(accion);
    else cambio.ejecutar(accion.destino);
  }

  function confirmar() {
    if (!porConfirmar) return;
    cambio.ejecutar(porConfirmar.destino);
    setPorConfirmar(null);
  }

  return (
    <li className={`${estilos.solicitud} ${estilos[solicitud.status] ?? ""}`}>
      <p>
        <strong>{solicitud.requesterName}</strong>{" "}
        <BadgeEstado estado={solicitud.status} texto={ESTADOS_VISITA[solicitud.status]} />
      </p>
      <p>
        {/* tel: abre el discador en el celular y, en la computadora, la app de llamadas si hay una */}
        📞 <a href={hrefTelefono(solicitud.requesterPhone)}>{solicitud.requesterPhone}</a>
      </p>
      <p>
        📅 Visita propuesta: <time dateTime={solicitud.proposedAt}>{formatearFecha(solicitud.proposedAt)}</time>
      </p>
      {solicitud.message && <p className={estilos.mensaje}>“{solicitud.message}”</p>}
      <p>
        <small className="aviso">Pedida el {formatearFecha(solicitud.createdAt)}</small>
      </p>

      {/* Rechazada, Cancelada y Realizada no tienen acciones: accionesVisita devuelve una lista vacia. */}
      {acciones.length > 0 && (
        <div className="acciones-fila">
          {acciones.map((accion) => (
            <button
              key={accion.destino}
              type="button"
              className={accion.advertencia ? "boton peligro-suave" : "boton primario"}
              disabled={cambio.pendiente || porConfirmar !== null}
              onClick={() => pedir(accion)}
            >
              {accion.etiqueta}
            </button>
          ))}
        </div>
      )}

      {cambio.pendiente && <p className="aviso">Guardando…</p>}

      {porConfirmar && (
        <Confirmacion
          pregunta={`¿${porConfirmar.etiqueta} la visita de ${solicitud.requesterName}?`}
          confirmar={`Sí, ${porConfirmar.etiqueta.toLowerCase()}`}
          onConfirmar={confirmar}
          onCancelar={() => setPorConfirmar(null)}
        >
          {porConfirmar.advertencia}
        </Confirmacion>
      )}

      {cambio.error && (
        <p className="error" role="alert">
          {cambio.error}
        </p>
      )}
    </li>
  );
}

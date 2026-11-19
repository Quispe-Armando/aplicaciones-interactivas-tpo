import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ApiError } from "../api/errors";
import type { Comment, ReceivedComment } from "../api/types";
import { useAccion } from "../hooks/useAccion";
import { formatearFecha } from "../lib/formato";
import BadgeEstado from "./BadgeEstado";
import { commentsService } from "../services";
import estilos from "./TarjetaConsulta.module.css";

const MAX_RESPUESTA = 1000;

interface TarjetaConsultaProps {
  consulta: ReceivedComment;
  // Avisan a la pagina (dueña de la lista): ella actualiza la lista sin volver a pedirla.
  onRespondida: (actualizada: Comment) => void;
  onDesactualizada: () => void; // la consulta ya tenia respuesta en el back: hay que volver a pedir la lista
}

// Una consulta recibida. Si no tiene respuesta muestra un campo para responder ahi mismo; si ya la tiene, la muestra
// y no ofrece un segundo campo (el back tampoco la admite: da 409).
export default function TarjetaConsulta({ consulta, onRespondida, onDesactualizada }: TarjetaConsultaProps) {
  const [respuesta, setRespuesta] = useState("");
  const [intentoEnviar, setIntentoEnviar] = useState(false);

  const enviar = useAccion(async () => {
    try {
      onRespondida(await commentsService.reply(consulta.id, respuesta.trim()));
    } catch (e) {
      // 409: alguien (otra pestaña) ya la respondio. Se muestra el motivo y se vuelve a pedir la lista para ver esa respuesta.
      if (e instanceof ApiError && e.status === 409) onDesactualizada();
      throw e;
    }
  });

  // Derivado en cada render (Clase 12): no se guarda en un estado.
  const textoLimpio = respuesta.trim();
  const errorRespuesta = !textoLimpio ? "Escribí la respuesta" : textoLimpio.length > MAX_RESPUESTA ? `Máximo ${MAX_RESPUESTA} caracteres` : null;
  const mostrarError = intentoEnviar || respuesta.length > MAX_RESPUESTA ? errorRespuesta : null;

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setRespuesta(e.target.value);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIntentoEnviar(true);
    if (errorRespuesta) return;
    enviar.ejecutar();
  }

  const respondida = consulta.reply !== null;

  return (
    <li className={`${estilos.consulta} ${respondida ? estilos.respondida : estilos.pendiente}`}>
      <p>
        <strong>{consulta.authorName}</strong> <span className="aviso">· {formatearFecha(consulta.createdAt)}</span>{" "}
        <BadgeEstado estado={respondida ? "CONFIRMED" : "PENDING"} texto={respondida ? "Respondida" : "Pendiente"} />
      </p>
      <p>“{consulta.content}”</p>

      {respondida ? (
        <p className={estilos.respuesta}>
          <strong>↳ Tu respuesta:</strong> {consulta.reply}
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="campo">
            <label>
              Tu respuesta
              <textarea rows={3} value={respuesta} onChange={handleChange} disabled={enviar.pendiente} aria-invalid={mostrarError !== null} />
            </label>
            <small className="aviso">
              {respuesta.length}/{MAX_RESPUESTA}
            </small>
            {mostrarError && <p className="error-campo">{mostrarError}</p>}
          </div>
          <button type="submit" className="boton primario" disabled={enviar.pendiente}>
            {enviar.pendiente ? "Enviando…" : "Responder"}
          </button>
          {enviar.error && (
            <p className="error" role="alert">
              {enviar.error}
            </p>
          )}
        </form>
      )}
    </li>
  );
}

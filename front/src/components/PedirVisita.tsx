import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ApiError, errorMessage } from "../api/errors";
import type { VisitRequest } from "../api/types";
import { ahoraParaInput, formatearFecha } from "../lib/formato";
import { visitRequestsService } from "../services";
import Campo from "./Campo";
import estilos from "./PedirVisita.module.css";

type FormVisita = {
  nombre: string;
  telefono: string;
  fecha: string;
  mensaje: string;
};
type ErroresVisita = Partial<Record<keyof FormVisita, string>>;

const FORM_VACIO: FormVisita = {
  nombre: "",
  telefono: "",
  fecha: "",
  mensaje: "",
};

// Campo del body del back -> campo de este formulario.
const CAMPO_DEL_BACK: Record<string, keyof FormVisita> = {
  requesterName: "nombre",
  requesterPhone: "telefono",
  proposedAt: "fecha",
  message: "mensaje",
};

// Las reglas del cliente repiten las del back para avisar sin ir al servidor (Clase 12); el back valida siempre
// y, si rechaza algo (por ejemplo la fecha, que puede pasar a ser pasada mientras se completa el formulario), tambien se muestra.
function validar(form: FormVisita): ErroresVisita {
  const errores: ErroresVisita = {};
  if (!form.nombre.trim()) errores.nombre = "El nombre es obligatorio";
  else if (form.nombre.trim().length > 120)
    errores.nombre = "El nombre no puede superar los 120 caracteres";
  if (!/^[\d\s+()-]{8,40}$/.test(form.telefono.trim()))
    errores.telefono = "Teléfono inválido (al menos 8 dígitos)";
  if (!form.fecha) errores.fecha = "Elegí una fecha y hora";
  else if (new Date(form.fecha).getTime() <= Date.now())
    errores.fecha = "La fecha y hora tienen que ser futuras";
  if (form.mensaje.trim().length > 1000)
    errores.mensaje = "El mensaje no puede superar los 1000 caracteres";
  return errores;
}

interface PedirVisitaProps {
  propertyId: number;
  onCerrar: () => void;
}

// Formulario para pedir una visita a la propiedad. El interesado no se loguea: deja nombre y telefono.
export default function PedirVisita({
  propertyId,
  onCerrar,
}: PedirVisitaProps) {
  const [form, setForm] = useState<FormVisita>(FORM_VACIO);
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<ErroresVisita>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState<VisitRequest | null>(null);

  const errores = validar(form);
  const esValido = Object.keys(errores).length === 0;

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErroresServidor({ ...erroresServidor, [name]: undefined });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return; // un doble click no genera dos solicitudes
    setIntentoEnviar(true);
    if (!esValido) return;

    setEnviando(true);
    setErrorGeneral(null);
    setErroresServidor({});
    try {
      const solicitud = await visitRequestsService.create(propertyId, {
        requesterName: form.nombre.trim(),
        requesterPhone: form.telefono.trim(),
        // El input da "2026-11-20T15:00" (hora local); el back pide la zona horaria, asi que se manda en ISO (UTC, "Z").
        proposedAt: new Date(form.fecha).toISOString(),
        message: form.mensaje.trim() || null,
      });
      setEnviada(solicitud);
    } catch (err) {
      const delServidor: ErroresVisita = {};
      let sinCampo: string | null = null;
      if (err instanceof ApiError) {
        for (const { field, message } of err.details) {
          const campo = CAMPO_DEL_BACK[field];
          if (campo) delServidor[campo] ??= message;
          else sinCampo ??= message;
        }
        if (err.details.length === 0) sinCampo = err.message; // ej: 409, la propiedad ya no esta publicada
      } else {
        sinCampo = errorMessage(err);
      }
      setErroresServidor(delServidor);
      setErrorGeneral(sinCampo);
      setEnviando(false);
    }
  }

  // Confirmacion visible: reemplaza al formulario.
  if (enviada) {
    return (
      <section
        className={`${estilos.visita} ${estilos.confirmacion}`}
        role="status"
      >
        <h2>Solicitud enviada ✅</h2>
        <p>
          Pediste visitar la propiedad el{" "}
          <strong>{formatearFecha(enviada.proposedAt)}</strong>. La inmobiliaria
          se va a comunicar con vos al <strong>{enviada.requesterPhone}</strong>{" "}
          para confirmarla.
        </p>
        <button type="button" className="boton" onClick={onCerrar}>
          Cerrar
        </button>
      </section>
    );
  }

  const error = (campo: keyof FormVisita) =>
    (intentoEnviar && errores[campo]) || erroresServidor[campo];

  return (
    <section className={estilos.visita}>
      <form
        className={`formulario ancho ${estilos.form}`}
        onSubmit={handleSubmit}
        noValidate
      >
        <h2>📅 Pedir visita</h2>
        {errorGeneral && (
          <p className="error" role="alert">
            {errorGeneral}
          </p>
        )}

        <Campo etiqueta="Tu nombre" error={error("nombre")}>
          <input
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            autoComplete="name"
          />
        </Campo>
        <Campo etiqueta="Tu teléfono" error={error("telefono")}>
          <input
            name="telefono"
            type="tel"
            value={form.telefono}
            onChange={handleChange}
            autoComplete="tel"
          />
        </Campo>
        <Campo etiqueta="Fecha y hora propuesta" error={error("fecha")}>
          {/* min: el selector no deja elegir dias pasados. */}
          <input
            name="fecha"
            type="datetime-local"
            min={ahoraParaInput()}
            value={form.fecha}
            onChange={handleChange}
          />
        </Campo>
        <Campo etiqueta="Mensaje (opcional)" error={error("mensaje")}>
          <textarea
            name="mensaje"
            rows={3}
            value={form.mensaje}
            onChange={handleChange}
          />
        </Campo>

        <div className="acciones-form">
          <button type="submit" className="boton primario" disabled={enviando}>
            {enviando ? "Enviando…" : "Pedir visita"}
          </button>
          <button
            type="button"
            className="boton"
            onClick={onCerrar}
            disabled={enviando}
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}

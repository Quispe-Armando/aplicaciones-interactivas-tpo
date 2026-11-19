import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ApiError, errorMessage } from "../api/errors";
import type { Comment } from "../api/types";
import { useFetch } from "../hooks/useFetch";
import { formatearFecha } from "../lib/formato";
import { commentsService } from "../services";
import Campo from "./Campo";
import Cargando from "./Cargando";
import ErrorCarga from "./ErrorCarga";
import Vacio from "./Vacio";
import estilos from "./ConsultasPropiedad.module.css";

type FormConsulta = { nombre: string; contenido: string };
type ErroresConsulta = Partial<Record<keyof FormConsulta, string>>;

const FORM_VACIO: FormConsulta = { nombre: "", contenido: "" };

// Campo del body del back -> campo de este formulario.
const CAMPO_DEL_BACK: Record<string, keyof FormConsulta> = { authorName: "nombre", content: "contenido" };

// Las reglas del cliente repiten las del back para avisar sin ir al servidor (Clase 12); el back valida siempre.
function validar(form: FormConsulta): ErroresConsulta {
  const errores: ErroresConsulta = {};
  if (!form.nombre.trim()) errores.nombre = "El nombre es obligatorio";
  else if (form.nombre.trim().length > 120) errores.nombre = "El nombre no puede superar los 120 caracteres";
  if (!form.contenido.trim()) errores.contenido = "La consulta no puede estar vacía";
  else if (form.contenido.trim().length > 1000) errores.contenido = "La consulta no puede superar los 1000 caracteres";
  return errores;
}

// Las consultas de otros interesados con la respuesta del vendedor, y el formulario para dejar una.
export default function ConsultasPropiedad({ propertyId }: { propertyId: number }) {
  // Las consultas se cargan aparte de la propiedad: si fallan, la ficha se sigue viendo (Clase 14).
  // setDatos (el setter de useState que devuelve useFetch) suma la consulta nueva sin volver a pedir la lista.
  const { datos: consultas, setDatos: setConsultas, error: errorCarga, recargar } = useFetch<Comment[]>(`/properties/${propertyId}/comments`);

  const [form, setForm] = useState<FormConsulta>(FORM_VACIO);
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<ErroresConsulta>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  const errores = validar(form);
  const esValido = Object.keys(errores).length === 0;

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErroresServidor({ ...erroresServidor, [name]: undefined });
    setEnviada(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIntentoEnviar(true);
    if (!esValido) return; // no llega al back

    setEnviando(true);
    setErrorGeneral(null);
    setErroresServidor({});
    try {
      const nueva = await commentsService.create(propertyId, { authorName: form.nombre.trim(), content: form.contenido.trim() });
      // Se suma a la lista con una copia nueva (no se muta el array, Clase 12): aparece sin recargar.
      setConsultas((actuales) => [...(actuales ?? []), nueva]);
      // Se conserva el nombre (si va a preguntar algo mas) y se vacia la consulta.
      setForm({ ...form, contenido: "" });
      setIntentoEnviar(false);
      setEnviada(true);
    } catch (err) {
      const delServidor: ErroresConsulta = {};
      let sinCampo: string | null = null;
      if (err instanceof ApiError) {
        for (const { field, message } of err.details) {
          const campo = CAMPO_DEL_BACK[field];
          if (campo) delServidor[campo] ??= message;
          else sinCampo ??= message;
        }
        if (err.details.length === 0) sinCampo = err.message;
      } else {
        sinCampo = errorMessage(err);
      }
      setErroresServidor(delServidor);
      setErrorGeneral(sinCampo);
    } finally {
      setEnviando(false);
    }
  }

  const error = (campo: keyof FormConsulta) => (intentoEnviar && errores[campo]) || erroresServidor[campo];

  return (
    <section className={estilos.consultas}>
      <h2>Consultas{consultas && ` (${consultas.length})`}</h2>

      {errorCarga && <ErrorCarga que="No se pudieron cargar las consultas" mensaje={errorCarga} onReintentar={recargar} />}
      {!errorCarga && !consultas && <Cargando texto="Cargando consultas…" />}
      {consultas && consultas.length === 0 && <Vacio texto="Todavía no hay consultas. ¡Sé el primero en preguntar!" />}

      {consultas && consultas.length > 0 && (
        <ul className={estilos.lista}>
          {consultas.map((consulta) => (
            <li key={consulta.id}>
              <p>
                <strong>{consulta.authorName}</strong> <span className="aviso">· {formatearFecha(consulta.createdAt)}</span>
              </p>
              <p>{consulta.content}</p>
              {consulta.reply && (
                <p className={estilos.respuesta}>
                  <strong>↳ Respuesta de la inmobiliaria:</strong> {consulta.reply}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="formulario ancho" onSubmit={handleSubmit} noValidate>
        <h3>Dejá tu consulta</h3>
        {errorGeneral && (
          <p className="error" role="alert">
            {errorGeneral}
          </p>
        )}
        {enviada && (
          <p className="exito" role="status">
            Tu consulta fue publicada ✅
          </p>
        )}

        <Campo etiqueta="Tu nombre" error={error("nombre")}>
          <input name="nombre" value={form.nombre} onChange={handleChange} autoComplete="name" />
        </Campo>
        <Campo etiqueta="Tu consulta" error={error("contenido")}>
          <textarea name="contenido" rows={3} value={form.contenido} onChange={handleChange} />
        </Campo>

        <button type="submit" className="boton primario" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar consulta"}
        </button>
      </form>
    </section>
  );
}

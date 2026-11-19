import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ApiError, errorMessage } from "../api/errors";
import type { useResenas } from "../hooks/useResenas";
import { formatearFecha } from "../lib/formato";
import { reviewsService } from "../services";
import Campo from "./Campo";
import Estrellas from "./Estrellas";
import Paginacion from "./Paginacion";
import Cargando from "./Cargando";
import ErrorCarga from "./ErrorCarga";
import Vacio from "./Vacio";
import estilos from "./ResenasInmobiliaria.module.css";

type FormResena = { nombre: string; contenido: string; rating: number | null };
type ErroresResena = Partial<Record<keyof FormResena, string>>;

const FORM_VACIO: FormResena = { nombre: "", contenido: "", rating: null };

// Campo del body del back -> campo de este formulario.
const CAMPO_DEL_BACK: Record<string, keyof FormResena> = {
  authorName: "nombre",
  content: "contenido",
  rating: "rating",
};

// Las reglas del cliente repiten las del back para avisar sin ir al servidor (Clase 12); el back valida siempre.
function validar(form: FormResena): ErroresResena {
  const errores: ErroresResena = {};
  if (!form.nombre.trim()) errores.nombre = "El nombre es obligatorio";
  else if (form.nombre.trim().length > 120)
    errores.nombre = "El nombre no puede superar los 120 caracteres";
  if (!form.contenido.trim())
    errores.contenido = "La reseña no puede estar vacía";
  else if (form.contenido.trim().length > 2000)
    errores.contenido = "La reseña no puede superar los 2000 caracteres";
  if (form.rating === null) errores.rating = "Elegí una calificación de 1 a 5";
  return errores;
}

interface ResenasInmobiliariaProps {
  agencyId: number;
  // La lista (con su pagina, su error y sus acciones) la pide la pagina del sitio con useResenas: la cabecera usa el mismo promedio.
  resenas: ReturnType<typeof useResenas>;
}

export default function ResenasInmobiliaria({
  agencyId,
  resenas: carga,
}: ResenasInmobiliariaProps) {
  const {
    datos: resenas,
    error: errorCarga,
    recargar,
    setPagina,
    volverAlPrincipio,
  } = carga;

  const [form, setForm] = useState<FormResena>(FORM_VACIO);
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<ErroresResena>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  const errores = validar(form);
  const esValido = Object.keys(errores).length === 0;

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErroresServidor({ ...erroresServidor, [name]: undefined });
    setEnviada(false);
  }

  function handleRating(e: ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, rating: Number(e.target.value) }); // un radio llega como string
    setErroresServidor({ ...erroresServidor, rating: undefined });
    setEnviada(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    setIntentoEnviar(true);
    if (!esValido) return; // sin contenido o sin calificacion, no llega al back

    setEnviando(true);
    setErrorGeneral(null);
    setErroresServidor({});
    try {
      await reviewsService.create(agencyId, {
        authorName: form.nombre.trim(),
        content: form.contenido.trim(),
        rating: form.rating!,
      });
      volverAlPrincipio(); // las mas nuevas van primero
      setForm({ ...form, contenido: "", rating: null });
      setIntentoEnviar(false);
      setEnviada(true);
    } catch (err) {
      const delServidor: ErroresResena = {};
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

  const error = (campo: keyof FormResena) =>
    (intentoEnviar && errores[campo]) || erroresServidor[campo];

  return (
    <section className={estilos.resenas}>
      <h2>Reseñas{resenas && ` (${resenas.total})`}</h2>

      {errorCarga && (
        <ErrorCarga
          que="No se pudieron cargar las reseñas"
          mensaje={errorCarga}
          onReintentar={recargar}
        />
      )}
      {!errorCarga && !resenas && <Cargando texto="Cargando reseñas…" />}
      {resenas && resenas.total === 0 && (
        <Vacio texto="Todavía no hay reseñas. ¡Dejá la primera!" />
      )}

      {resenas && resenas.items.length > 0 && (
        <>
          <ul className={estilos.lista}>
            {resenas.items.map((resena) => (
              <li key={resena.id}>
                <p>
                  <Estrellas valor={resena.rating} />{" "}
                  <strong>{resena.authorName}</strong>{" "}
                  <span className="aviso">
                    · {formatearFecha(resena.createdAt)}
                  </span>
                </p>
                <p>{resena.content}</p>
              </li>
            ))}
          </ul>
          <Paginacion
            page={resenas.page}
            limit={resenas.limit}
            total={resenas.total}
            onCambiar={setPagina}
          />
        </>
      )}

      <form className="formulario ancho" onSubmit={handleSubmit} noValidate>
        <h3>Dejá tu reseña</h3>
        {errorGeneral && (
          <p className="error" role="alert">
            {errorGeneral}
          </p>
        )}
        {enviada && (
          <p className="exito" role="status">
            Tu reseña fue publicada ✅
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

        {/* Calificacion: cinco radios, como la franja horaria de la Clase 12 (checked = el estado coincide con el valor). */}
        <fieldset className={estilos.calificacion}>
          <legend>Calificación</legend>
          <div className={estilos.opciones}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n}>
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  checked={form.rating === n}
                  onChange={handleRating}
                />
                {n} ★
              </label>
            ))}
          </div>
          {error("rating") && <p className="error-campo">{error("rating")}</p>}
        </fieldset>

        <Campo etiqueta="Tu reseña" error={error("contenido")}>
          <textarea
            name="contenido"
            rows={3}
            value={form.contenido}
            onChange={handleChange}
          />
        </Campo>

        <button type="submit" className="boton primario" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar reseña"}
        </button>
      </form>
    </section>
  );
}

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ApiError, errorMessage } from "../api/errors";
import type { PropertyInput } from "../api/types";
import { aDatos, validarPropiedad } from "../lib/propiedadForm";
import type { ErroresPropiedad, FormPropiedad } from "../lib/propiedadForm";
import { OPERACIONES, TIPOS } from "../lib/formato";
import Campo from "./Campo";
import EditorAmenities from "./EditorAmenities";
import EditorFotos from "./EditorFotos";

interface PropiedadFormProps {
  inicial: FormPropiedad; // vacio para el alta, con los datos actuales para la edicion
  etiquetaGuardar: string;
  onGuardar: (datos: PropertyInput) => Promise<void>; // si falla, tira el error (ApiError) y el formulario lo muestra
  onCancelar: () => void;
}

// Un solo formulario para el alta y la edicion. Se monta recien cuando ya estan los datos iniciales (Clase 14),
// porque useState usa el valor inicial solo la primera vez.
export default function PropiedadForm({ inicial, etiquetaGuardar, onGuardar, onCancelar }: PropiedadFormProps) {
  const [form, setForm] = useState<FormPropiedad>(inicial);
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<ErroresPropiedad>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Derivados: se recalculan con cada cambio (no se guardan en estado).
  const errores = validarPropiedad(form);
  const esValido = Object.keys(errores).length === 0;
  const esTerreno = form.type === "LAND";

  // Un solo handler para todos los inputs, selects y textareas: la clave sale del atributo name (Clase 12).
  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErroresServidor({ ...erroresServidor, [name]: undefined });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    setIntentoEnviar(true);
    if (!esValido) return;

    setEnviando(true);
    setErrorGeneral(null);
    setErroresServidor({});
    try {
      await onGuardar(aDatos(form));
    } catch (err) {
      // El back responde { error, details: [{ field, message }] }: cada mensaje va junto a su campo.
      const delServidor: ErroresPropiedad = {};
      let sinCampo: string | null = null;
      if (err instanceof ApiError) {
        for (const { field, message } of err.details) {
          // "images.0.url" -> images, "tags.2" -> tags
          const campo = field.split(".")[0] as keyof FormPropiedad;
          if (campo in form) delServidor[campo] ??= message;
          else sinCampo ??= message;
        }
        if (err.details.length === 0) sinCampo = err.message; // ej: 409, no se puede editar
      } else {
        sinCampo = errorMessage(err);
      }
      setErroresServidor(delServidor);
      setErrorGeneral(sinCampo);
      setEnviando(false);
    }
  }

  // Los errores de un campo se ven si el usuario ya escribio algo en el, o despues del primer intento de enviar:
  // un formulario recien abierto no reta de entrada, pero "precio 0" se marca apenas se escribe.
  function error(campo: keyof FormPropiedad): string | undefined {
    const valor = form[campo];
    const visible = intentoEnviar || (typeof valor === "string" && valor !== "");
    return erroresServidor[campo] ?? (visible ? errores[campo] : undefined);
  }

  return (
    <form className="formulario ancho" onSubmit={handleSubmit} noValidate>
      {errorGeneral && (
        <p className="error" role="alert">
          {errorGeneral}
        </p>
      )}

      <fieldset>
        <legend>Datos principales</legend>
        <Campo etiqueta="Título" error={error("title")}>
          <input name="title" value={form.title} onChange={handleChange} maxLength={160} />
        </Campo>
        <Campo etiqueta="Descripción" error={error("description")}>
          <textarea name="description" rows={5} value={form.description} onChange={handleChange} />
        </Campo>
        <div className="fila-campos">
          <Campo etiqueta="Tipo" error={error("type")}>
            <select name="type" value={form.type} onChange={handleChange}>
              {Object.entries(TIPOS).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Operación" error={error("operation")}>
            <select name="operation" value={form.operation} onChange={handleChange}>
              {Object.entries(OPERACIONES).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <div className="fila-campos">
          <Campo etiqueta="Precio" error={error("price")}>
            <input name="price" type="number" step="any" min="0" value={form.price} onChange={handleChange} />
          </Campo>
          <Campo etiqueta="Moneda" error={error("currency")}>
            <select name="currency" value={form.currency} onChange={handleChange}>
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </Campo>
        </div>
      </fieldset>

      <fieldset>
        <legend>Ubicación y superficie</legend>
        <div className="fila-campos">
          <Campo etiqueta="Dirección" error={error("address")}>
            <input name="address" value={form.address} onChange={handleChange} maxLength={255} />
          </Campo>
          <Campo etiqueta="Zona (barrio o localidad)" error={error("area")}>
            <input name="area" value={form.area} onChange={handleChange} maxLength={120} />
          </Campo>
        </div>
        <div className="fila-campos">
          <Campo etiqueta="Superficie total (m²)" error={error("totalAreaM2")}>
            <input name="totalAreaM2" type="number" step="any" min="0" value={form.totalAreaM2} onChange={handleChange} />
          </Campo>
          {/* Un terreno no tiene superficie cubierta, ambientes, dormitorios ni baños: esos campos no se muestran. */}
          {!esTerreno && (
            <Campo etiqueta="Superficie cubierta (m²)" error={error("coveredAreaM2")}>
              <input name="coveredAreaM2" type="number" step="any" min="0" value={form.coveredAreaM2} onChange={handleChange} />
            </Campo>
          )}
        </div>
        {!esTerreno && (
          <div className="fila-campos">
            <Campo etiqueta="Ambientes" error={error("rooms")}>
              <input name="rooms" type="number" min="1" step="1" value={form.rooms} onChange={handleChange} />
            </Campo>
            <Campo etiqueta="Dormitorios" error={error("bedrooms")}>
              <input name="bedrooms" type="number" min="0" step="1" value={form.bedrooms} onChange={handleChange} />
            </Campo>
            <Campo etiqueta="Baños" error={error("bathrooms")}>
              <input name="bathrooms" type="number" min="0" step="1" value={form.bathrooms} onChange={handleChange} />
            </Campo>
          </div>
        )}
        <Campo etiqueta="Antigüedad (años, 0 = a estrenar)" error={error("ageYears")}>
          <input name="ageYears" type="number" min="0" step="1" value={form.ageYears} onChange={handleChange} />
        </Campo>
      </fieldset>

      <fieldset>
        <legend>Características</legend>
        <EditorAmenities tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
      </fieldset>

      <EditorFotos
        fotos={form.images}
        onChange={(images) => {
          setForm({ ...form, images });
          setErroresServidor({ ...erroresServidor, images: undefined });
        }}
        error={intentoEnviar || erroresServidor.images ? (erroresServidor.images ?? errores.images) : undefined}
      />

      <div className="acciones-form">
        <button type="submit" className="boton primario" disabled={enviando}>
          {enviando ? "Guardando…" : etiquetaGuardar}
        </button>
        <button type="button" className="boton" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

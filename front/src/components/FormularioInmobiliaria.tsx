import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ApiError, errorMessage } from "../api/errors";
import type { Agency, AgencyInput } from "../api/types";
import { validar } from "../lib/inmobiliariaForm";
import type { ErroresAgencia, FormAgencia } from "../lib/inmobiliariaForm";
import { agenciesService } from "../services";
import Campo from "./Campo";

// Formulario para editar los datos de la inmobiliaria (precargado con los actuales).
export default function FormularioInmobiliaria({ agencia, onGuardada }: { agencia: Agency; onGuardada: (a: Agency) => void }) {
  // Arranca precargado con los datos actuales (se monta despues de cargarlos).
  const [form, setForm] = useState<FormAgencia>({
    name: agencia.name,
    description: agencia.description ?? "",
    logoUrl: agencia.logoUrl ?? "",
    contactPhone: agencia.contactPhone,
    contactEmail: agencia.contactEmail,
    officeAddress: agencia.officeAddress ?? "",
  });
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<ErroresAgencia>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const errores = validar(form);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErroresServidor({ ...erroresServidor, [name]: undefined });
    setGuardado(false);
  }

  function error(campo: keyof FormAgencia) {
    return erroresServidor[campo] ?? (intentoEnviar ? errores[campo] : undefined);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    setIntentoEnviar(true);
    setGuardado(false);
    if (Object.keys(errores).length > 0) return;

    const datos: AgencyInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      logoUrl: form.logoUrl.trim() || null,
      contactPhone: form.contactPhone.trim(),
      contactEmail: form.contactEmail.trim(),
      officeAddress: form.officeAddress.trim() || null,
    };
    setEnviando(true);
    setErrorGeneral(null);
    setErroresServidor({});
    try {
      const actualizada = await agenciesService.update(agencia.id, datos);
      onGuardada(actualizada);
      setGuardado(true);
    } catch (err) {
      const delServidor: ErroresAgencia = {};
      let sinCampo: string | null = null;
      if (err instanceof ApiError) {
        for (const { field, message } of err.details) {
          if (field in form) delServidor[field as keyof FormAgencia] ??= message;
          else sinCampo ??= message;
        }
        if (err.details.length === 0) sinCampo = err.message;
      } else sinCampo = errorMessage(err);
      setErroresServidor(delServidor);
      setErrorGeneral(sinCampo);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="formulario ancho" onSubmit={handleSubmit} noValidate>
      {errorGeneral && (
        <p className="error" role="alert">
          {errorGeneral}
        </p>
      )}
      {guardado && (
        <p className="aviso exito" role="status">
          Datos guardados ✅
        </p>
      )}
      <Campo etiqueta="Nombre de fantasía" error={error("name")}>
        <input name="name" value={form.name} onChange={handleChange} maxLength={120} />
      </Campo>
      <Campo etiqueta="Descripción" error={error("description")}>
        <textarea name="description" rows={4} value={form.description} onChange={handleChange} />
      </Campo>
      <Campo etiqueta="Logo (URL, opcional)" error={error("logoUrl")}>
        <input name="logoUrl" type="url" value={form.logoUrl} onChange={handleChange} />
      </Campo>
      <div className="fila-campos">
        <Campo etiqueta="Teléfono de contacto" error={error("contactPhone")}>
          <input name="contactPhone" value={form.contactPhone} onChange={handleChange} maxLength={40} />
        </Campo>
        <Campo etiqueta="Email de contacto" error={error("contactEmail")}>
          <input name="contactEmail" type="email" value={form.contactEmail} onChange={handleChange} />
        </Campo>
      </div>
      <Campo etiqueta="Dirección de la oficina (opcional)" error={error("officeAddress")}>
        <input name="officeAddress" value={form.officeAddress} onChange={handleChange} maxLength={255} />
      </Campo>
      <div className="acciones-form">
        <button type="submit" className="boton primario" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar datos"}
        </button>
      </div>
    </form>
  );
}

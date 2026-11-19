import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { ApiError, errorMessage } from "../api/errors";
import { hasSession } from "../api/session";
import { useAuth } from "../auth/useAuth";
import Campo from "../components/Campo";
import CampoPassword from "../components/CampoPassword";

type FormRegistro = {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  telefono: string; // opcional
  nombreFantasia: string;
  telefonoInmobiliaria: string;
};
type ErroresRegistro = Partial<Record<keyof FormRegistro, string>>;

const FORM_VACIO: FormRegistro = { nombre: "", apellido: "", email: "", password: "", telefono: "", nombreFantasia: "", telefonoInmobiliaria: "" };

// Campo del body del back (el "field" de los errores { error, details }) -> campo de este formulario.
const CAMPO_DEL_BACK: Record<string, keyof FormRegistro> = {
  fullName: "nombre",
  email: "email",
  password: "password",
  phone: "telefono",
  "agency.name": "nombreFantasia",
  "agency.contactPhone": "telefonoInmobiliaria",
};

// Las reglas del cliente repiten las del back para dar feedback inmediato; el back valida siempre (Clase 12).
function validar(form: FormRegistro): ErroresRegistro {
  const errores: ErroresRegistro = {};
  if (!form.nombre.trim()) errores.nombre = "El nombre es obligatorio";
  if (!form.apellido.trim()) errores.apellido = "El apellido es obligatorio";
  if (form.nombre.trim().length + form.apellido.trim().length > 119) errores.apellido = "Nombre y apellido son demasiado largos";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errores.email = "Ingresá un email válido";
  if (form.password.length < 8) errores.password = "La contraseña debe tener al menos 8 caracteres";
  else if (form.password.length > 72) errores.password = "La contraseña no puede superar los 72 caracteres";
  if (form.telefono.trim().length > 40) errores.telefono = "El teléfono es demasiado largo";
  if (!form.nombreFantasia.trim()) errores.nombreFantasia = "El nombre de la inmobiliaria es obligatorio";
  if (!form.telefonoInmobiliaria.trim()) errores.telefonoInmobiliaria = "El teléfono de la inmobiliaria es obligatorio";
  return errores;
}

export default function RegistroPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  // Se mira UNA vez, al abrir la pagina (ver LoginPage).
  const [yaTeniaSesion] = useState(hasSession);

  const [form, setForm] = useState<FormRegistro>(FORM_VACIO);
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<ErroresRegistro>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const errores = validar(form);
  const esValido = Object.keys(errores).length === 0;

  if (yaTeniaSesion) return <Navigate to="/panel" replace />;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Al corregir un campo, se va el error que habia marcado el back para ese campo.
    setErroresServidor({ ...erroresServidor, [name]: undefined });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIntentoEnviar(true);
    if (!esValido) return;

    setEnviando(true);
    setErrorGeneral(null);
    setErroresServidor({});
    try {
      // Crea la cuenta + la inmobiliaria y deja la sesion iniciada.
      await register({
        fullName: `${form.nombre.trim()} ${form.apellido.trim()}`,
        email: form.email.trim(),
        password: form.password,
        phone: form.telefono.trim() || undefined,
        agency: { name: form.nombreFantasia.trim(), contactPhone: form.telefonoInmobiliaria.trim() },
      });
      navigate("/panel", { replace: true });
    } catch (err) {
      // El back responde { error, details: [{ field, message }] }: cada mensaje va junto a su campo.
      const delServidor: ErroresRegistro = {};
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
      setEnviando(false);
    }
  }

  const error = (campo: keyof FormRegistro) => (intentoEnviar && errores[campo]) || erroresServidor[campo];

  return (
    <form className="formulario" onSubmit={handleSubmit} noValidate>
      <h1>Crear cuenta</h1>
      <p className="aviso">Se crea tu cuenta de vendedor y tu inmobiliaria en el mismo paso.</p>
      {errorGeneral && (
        <p className="error" role="alert">
          {errorGeneral}
        </p>
      )}

      <fieldset>
        <legend>Tus datos</legend>
        <Campo etiqueta="Nombre" error={error("nombre")}>
          <input name="nombre" value={form.nombre} onChange={handleChange} autoComplete="given-name" />
        </Campo>
        <Campo etiqueta="Apellido" error={error("apellido")}>
          <input name="apellido" value={form.apellido} onChange={handleChange} autoComplete="family-name" />
        </Campo>
        <Campo etiqueta="Email" error={error("email")}>
          <input name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" />
        </Campo>
        <Campo etiqueta="Contraseña (mínimo 8 caracteres)" error={error("password")}>
          <CampoPassword name="password" value={form.password} onChange={handleChange} autoComplete="new-password" />
        </Campo>
        <Campo etiqueta="Teléfono (opcional)" error={error("telefono")}>
          <input name="telefono" type="tel" value={form.telefono} onChange={handleChange} autoComplete="tel" />
        </Campo>
      </fieldset>

      <fieldset>
        <legend>Tu inmobiliaria</legend>
        <Campo etiqueta="Nombre de fantasía" error={error("nombreFantasia")}>
          <input name="nombreFantasia" value={form.nombreFantasia} onChange={handleChange} />
        </Campo>
        <Campo etiqueta="Teléfono de la inmobiliaria" error={error("telefonoInmobiliaria")}>
          <input name="telefonoInmobiliaria" type="tel" value={form.telefonoInmobiliaria} onChange={handleChange} />
        </Campo>
      </fieldset>

      <button type="submit" className="boton primario" disabled={enviando}>
        {enviando ? "Creando cuenta…" : "Crear cuenta"}
      </button>
      <p>
        ¿Ya tenés cuenta? <Link to="/login">Ingresá</Link>
      </p>
    </form>
  );
}

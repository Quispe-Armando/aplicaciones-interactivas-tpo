import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { ApiError, errorMessage } from "../api/errors";
import { hasSession } from "../api/session";
import { useAuth } from "../auth/useAuth";
import Campo from "../components/Campo";
import CampoPassword from "../components/CampoPassword";

type FormLogin = { email: string; password: string };
type ErroresLogin = Partial<Record<keyof FormLogin, string>>;

const FORM_VACIO: FormLogin = { email: "", password: "" };

// Las reglas del cliente son para dar feedback inmediato; el back valida siempre (Clase 12).
function validar(form: FormLogin): ErroresLogin {
  const errores: ErroresLogin = {};
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errores.email = "Ingresá un email válido";
  if (!form.password) errores.password = "La contraseña es obligatoria";
  return errores;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { login } = useAuth();
  // A donde queria ir antes de que lo mandaran al login (lo deja RequiereSesion).
  const desde: string = state?.desde ?? "/panel";

  // Se mira UNA vez, al abrir la pagina: si se mirara en cada render, apenas el login guarda el token
  // este <Navigate> mandaria a /panel y pisaria el navigate(desde) de abajo.
  const [yaTeniaSesion] = useState(hasSession);

  const [form, setForm] = useState<FormLogin>(FORM_VACIO);
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [erroresServidor, setErroresServidor] = useState<ErroresLogin>({});
  const [enviando, setEnviando] = useState(false);

  // Derivados: se recalculan con cada tecla (no se guardan en estado).
  const errores = validar(form);
  const esValido = Object.keys(errores).length === 0;

  if (yaTeniaSesion) return <Navigate to={desde} replace />;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value }); // la clave sale del atributo name
    setErroresServidor({ ...erroresServidor, [name]: undefined });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIntentoEnviar(true);
    if (!esValido) return;

    setEnviando(true);
    setErrorGeneral(null);
    try {
      await login({ email: form.email.trim(), password: form.password });
      // replace: el login no queda en el historial (Atras no vuelve al formulario).
      navigate(desde, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.email) {
        setErroresServidor({ email: err.fieldErrors.email });
      } else {
        // Credenciales invalidas (401), API caida, etc.: un mensaje claro arriba del formulario.
        setErrorGeneral(errorMessage(err));
      }
      // Se conserva el email que escribio; solo se vacia la contraseña.
      setForm({ ...form, password: "" });
      setEnviando(false);
    }
  }

  const error = (campo: keyof FormLogin) => (intentoEnviar && errores[campo]) || erroresServidor[campo];

  return (
    <form className="formulario" onSubmit={handleSubmit} noValidate>
      <h1>Ingresar como vendedor</h1>
      {state?.desde && <p className="aviso">Para ver {state.desde} hay que iniciar sesión.</p>}
      {errorGeneral && (
        <p className="error" role="alert">
          {errorGeneral}
        </p>
      )}

      <Campo etiqueta="Email" error={error("email")}>
        <input name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" />
      </Campo>

      <Campo etiqueta="Contraseña" error={error("password")}>
        <CampoPassword name="password" value={form.password} onChange={handleChange} autoComplete="current-password" />
      </Campo>

      <button type="submit" className="boton primario" disabled={enviando}>
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
      <p>
        ¿No tenés cuenta? <Link to="/registro">Registrate</Link>
      </p>
    </form>
  );
}

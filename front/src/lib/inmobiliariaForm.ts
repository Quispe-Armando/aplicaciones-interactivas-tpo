import { validarUrl } from "./propiedadForm";

// Los datos del formulario de "Mi inmobiliaria" y su validacion. Es una funcion comun (sin "use"): no usa hooks, solo
// recibe el formulario y devuelve los errores. Se calcula en cada render (Clase 12), no se guarda en un estado.
export interface FormAgencia {
  name: string;
  description: string;
  logoUrl: string;
  contactPhone: string;
  contactEmail: string;
  officeAddress: string;
}
export type ErroresAgencia = Partial<Record<keyof FormAgencia, string>>;

export function validar(f: FormAgencia): ErroresAgencia {
  const e: ErroresAgencia = {};
  if (!f.name.trim()) e.name = "El nombre es obligatorio";
  else if (f.name.trim().length > 120) e.name = "Máximo 120 caracteres";
  if (f.description.length > 5000) e.description = "Máximo 5000 caracteres";
  if (f.logoUrl.trim() && !validarUrl(f.logoUrl.trim()))
    e.logoUrl = "Ingresá una URL válida (http:// o https://)";
  if (!f.contactPhone.trim()) e.contactPhone = "El teléfono es obligatorio";
  else if (f.contactPhone.trim().length > 40)
    e.contactPhone = "Máximo 40 caracteres";
  if (!f.contactEmail.trim()) e.contactEmail = "El email es obligatorio";
  else if (!/^\S+@\S+\.\S+$/.test(f.contactEmail.trim()))
    e.contactEmail = "Ingresá un email válido";
  if (f.officeAddress.length > 255) e.officeAddress = "Máximo 255 caracteres";
  return e;
}

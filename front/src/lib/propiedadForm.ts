import type { Currency, OperationType, Property, PropertyImage, PropertyInput, PropertyStatus, PropertyType } from "../api/types";

// El formulario de alta/edicion de una propiedad: UN objeto con todos los campos (Clase 12).
// Los numeros se guardan como string (un <input type="number"> devuelve texto y un campo vacio tiene que poder quedar vacio)
// y se convierten con Number() al validar y al enviar.
export type FormPropiedad = {
  title: string;
  description: string;
  type: PropertyType;
  operation: OperationType;
  price: string;
  currency: Currency;
  address: string;
  area: string; // zona
  coveredAreaM2: string;
  totalAreaM2: string;
  rooms: string;
  bedrooms: string;
  bathrooms: string;
  ageYears: string;
  tags: string[];
  images: PropertyImage[];
};

export type ErroresPropiedad = Partial<Record<keyof FormPropiedad, string>>;

export const FORM_VACIO: FormPropiedad = {
  title: "",
  description: "",
  type: "APARTMENT",
  operation: "SALE",
  price: "",
  currency: "USD",
  address: "",
  area: "",
  coveredAreaM2: "",
  totalAreaM2: "",
  rooms: "",
  bedrooms: "",
  bathrooms: "",
  ageYears: "",
  tags: [],
  images: [],
};

// Una propiedad en estos estados ya no se edita (el back responde 409).
export const ESTADOS_NO_EDITABLES: PropertyStatus[] = ["SOLD", "RENTED", "CANCELLED"];

export function esEditable(estado: PropertyStatus): boolean {
  return !ESTADOS_NO_EDITABLES.includes(estado);
}

const texto = (valor: number | null): string => (valor === null ? "" : String(valor));

// Para precargar el formulario de edicion con los datos actuales.
export function aFormulario(propiedad: Property): FormPropiedad {
  return {
    title: propiedad.title,
    description: propiedad.description,
    type: propiedad.type,
    operation: propiedad.operation,
    price: String(propiedad.price),
    currency: propiedad.currency,
    address: propiedad.address,
    area: propiedad.area,
    coveredAreaM2: texto(propiedad.coveredAreaM2),
    totalAreaM2: String(propiedad.totalAreaM2),
    rooms: texto(propiedad.rooms),
    bedrooms: texto(propiedad.bedrooms),
    bathrooms: texto(propiedad.bathrooms),
    ageYears: texto(propiedad.ageYears),
    tags: propiedad.tags,
    images: propiedad.images,
  };
}

// "" -> null (vacio); "12" -> 12; "abc" -> NaN
function numero(valor: string): number | null {
  return valor.trim() === "" ? null : Number(valor);
}

export function validarUrl(valor: string): boolean {
  try {
    const url = new URL(valor);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Las reglas del cliente repiten las del back para avisar antes de enviar; el back valida siempre.
export function validarPropiedad(form: FormPropiedad): ErroresPropiedad {
  const errores: ErroresPropiedad = {};
  const esTerreno = form.type === "LAND";

  if (!form.title.trim()) errores.title = "El título es obligatorio";
  else if (form.title.trim().length > 160) errores.title = "El título no puede superar los 160 caracteres";

  if (!form.description.trim()) errores.description = "La descripción es obligatoria";
  else if (form.description.trim().length > 5000) errores.description = "La descripción no puede superar los 5000 caracteres";

  if (!form.address.trim()) errores.address = "La dirección es obligatoria";
  else if (form.address.trim().length > 255) errores.address = "La dirección no puede superar los 255 caracteres";

  if (!form.area.trim()) errores.area = "La zona es obligatoria";
  else if (form.area.trim().length > 120) errores.area = "La zona no puede superar los 120 caracteres";

  const precio = numero(form.price);
  if (precio === null) errores.price = "El precio es obligatorio";
  else if (!Number.isFinite(precio)) errores.price = "El precio debe ser un número";
  else if (precio <= 0) errores.price = "El precio debe ser mayor a 0";

  const total = numero(form.totalAreaM2);
  if (total === null) errores.totalAreaM2 = "La superficie total es obligatoria";
  else if (!Number.isFinite(total)) errores.totalAreaM2 = "La superficie total debe ser un número";
  else if (total <= 0) errores.totalAreaM2 = "La superficie total debe ser mayor a 0";

  // Un terreno no tiene superficie cubierta, ambientes, dormitorios ni baños: esos campos no se validan.
  if (!esTerreno) {
    const cubierta = numero(form.coveredAreaM2);
    if (cubierta !== null) {
      if (!Number.isFinite(cubierta)) errores.coveredAreaM2 = "La superficie cubierta debe ser un número";
      else if (cubierta <= 0) errores.coveredAreaM2 = "La superficie cubierta debe ser mayor a 0";
      else if (total !== null && Number.isFinite(total) && cubierta > total) errores.coveredAreaM2 = "La superficie cubierta no puede superar la total";
    }

    const ambientes = numero(form.rooms);
    if (ambientes !== null && (!Number.isInteger(ambientes) || ambientes < 1)) errores.rooms = "Los ambientes deben ser un número entero de 1 o más";

    for (const [campo, etiqueta] of [
      ["bedrooms", "Los dormitorios"],
      ["bathrooms", "Los baños"],
    ] as const) {
      const cantidad = numero(form[campo]);
      if (cantidad !== null && (!Number.isInteger(cantidad) || cantidad < 0)) errores[campo] = `${etiqueta} deben ser un número entero (0 o más)`;
    }
  }

  const antiguedad = numero(form.ageYears);
  if (antiguedad !== null && (!Number.isInteger(antiguedad) || antiguedad < 0)) errores.ageYears = "La antigüedad debe ser un número entero (0 o más)";

  if (form.images.length === 0) errores.images = "Cargá al menos una foto";
  else if (form.images.length > 30) errores.images = "Máximo 30 fotos";
  else if (form.images.filter((imagen) => imagen.isCover).length !== 1) errores.images = "Tiene que haber exactamente una foto de portada";

  return errores;
}

// Del formulario al body de POST / PUT /properties: numeros como number y null en lo que no aplica o quedo vacio.
export function aDatos(form: FormPropiedad): PropertyInput {
  const esTerreno = form.type === "LAND";
  const entero = (valor: string): number | null => (esTerreno ? null : numero(valor));

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type,
    operation: form.operation,
    price: Number(form.price),
    currency: form.currency,
    address: form.address.trim(),
    area: form.area.trim(),
    coveredAreaM2: entero(form.coveredAreaM2),
    totalAreaM2: Number(form.totalAreaM2),
    rooms: entero(form.rooms),
    bedrooms: entero(form.bedrooms),
    bathrooms: entero(form.bathrooms),
    ageYears: numero(form.ageYears),
    tags: form.tags,
    images: form.images,
  };
}

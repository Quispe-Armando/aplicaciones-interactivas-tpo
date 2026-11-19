import type { MonthlyRow } from "../api/types";

// Calculos del dashboard de reportes. Funciones comunes (no llaman hooks): sin "use" en el nombre (Clase 15).

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "2026-10" -> "oct 2026". Se arma a mano con el texto: pasarlo por new Date() lo correria de mes segun la zona horaria.
export function etiquetaMes(mes: string): string {
  const [anio, numero] = mes.split("-");
  return `${MESES[Number(numero) - 1] ?? numero} ${anio}`;
}

// Que porcentaje del maximo es un valor (para el ancho o el alto de una barra). Con maximo 0 da 0, nunca NaN.
export function porcentaje(valor: number, maximo: number): number {
  return maximo > 0 ? (valor / maximo) * 100 : 0;
}

// El valor mas alto de todas las barras del grafico mensual: la escala comun para que sean comparables.
export function maximoMensual(filas: MonthlyRow[]): number {
  return Math.max(0, ...filas.flatMap((fila) => [fila.published, fila.sold, fila.rented]));
}

const formatoDias = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

// 12.5 -> "12,5 días", 1 -> "1 día". Si no hay dato (null: todavia no se cerro ninguna) devuelve null y la pantalla muestra el estado vacio.
export function formatearDias(dias: number | null): string | null {
  if (dias === null || !Number.isFinite(dias)) return null;
  return `${formatoDias.format(dias)} ${dias === 1 ? "día" : "días"}`;
}

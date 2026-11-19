import { PropertyStatus } from "../entities/enums";

// Calculos puros de los reportes (sin base de datos), para poder probarlos con un test.
// Trabajan sobre el historial de estados: un evento es "esta propiedad paso a tal estado en tal momento".

export interface StatusEvent {
  propertyId: number;
  toStatus: PropertyStatus;
  at: Date;
}

export interface MonthlyRow {
  month: string; // "2026-10"
  published: number; // propiedades publicadas por primera vez ese mes
  sold: number;
  rented: number;
}

// Los meses se cuentan en hora de Argentina, no en UTC: una publicacion del 31/10 a las 22hs
// no debe contarse en noviembre.
const REPORT_TIME_ZONE = "America/Argentina/Buenos_Aires";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const monthFormat = new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TIME_ZONE, year: "numeric", month: "2-digit" });

export function monthKey(date: Date): string {
  const parts = monthFormat.formatToParts(date);
  const year = parts.find((part) => part.type === "year")!.value;
  const month = parts.find((part) => part.type === "month")!.value;
  return `${year}-${month}`;
}

function nextMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
}

// Fecha de la PRIMERA vez que cada propiedad se publico (pausar y republicar no cuenta como publicacion nueva).
// `events` tiene que venir ordenado del mas viejo al mas nuevo.
function firstPublishedAt(events: StatusEvent[]): Map<number, Date> {
  const published = new Map<number, Date>();
  for (const event of events) {
    if (event.toStatus === PropertyStatus.PUBLISHED && !published.has(event.propertyId)) {
      published.set(event.propertyId, event.at);
    }
  }
  return published;
}

// Publicaciones nuevas y ventas/alquileres concretados por mes. Rellena con ceros los meses sin movimiento
// entre el primero y el ultimo, asi el grafico no tiene huecos.
export function computeMonthly(events: StatusEvent[]): MonthlyRow[] {
  const rows = new Map<string, MonthlyRow>();
  const rowFor = (at: Date): MonthlyRow => {
    const month = monthKey(at);
    if (!rows.has(month)) rows.set(month, { month, published: 0, sold: 0, rented: 0 });
    return rows.get(month)!;
  };

  const firstPublished = firstPublishedAt(events);
  for (const [propertyId, at] of firstPublished) {
    void propertyId;
    rowFor(at).published += 1;
  }
  for (const event of events) {
    if (event.toStatus === PropertyStatus.SOLD) rowFor(event.at).sold += 1;
    if (event.toStatus === PropertyStatus.RENTED) rowFor(event.at).rented += 1;
  }

  const months = [...rows.keys()].sort();
  if (months.length === 0) return [];

  const result: MonthlyRow[] = [];
  for (let month = months[0]; month <= months[months.length - 1]; month = nextMonth(month)) {
    result.push(rows.get(month) ?? { month, published: 0, sold: 0, rented: 0 });
  }
  return result;
}

// Dias promedio entre la primera publicacion y la venta/alquiler. Una propiedad sin registro de publicacion
// en el historial (no deberia pasar) se ignora.
export function computeAverageTimeOnMarket(events: StatusEvent[]): { averageDays: number | null; closedCount: number } {
  const firstPublished = firstPublishedAt(events);

  let totalDays = 0;
  let closedCount = 0;
  for (const event of events) {
    if (event.toStatus !== PropertyStatus.SOLD && event.toStatus !== PropertyStatus.RENTED) continue;
    const publishedAt = firstPublished.get(event.propertyId);
    if (!publishedAt) continue;
    totalDays += (event.at.getTime() - publishedAt.getTime()) / MS_PER_DAY;
    closedCount += 1;
  }

  return { averageDays: closedCount === 0 ? null : Math.round((totalDays / closedCount) * 10) / 10, closedCount };
}

// Agrupar por propiedad: lo usan las solicitudes de visita y las consultas, que llegan con { property: { id, title } }.
// Funcion comun (no un hook): no usa estado ni effects (Clase 15).

export interface ConPropiedad {
  property?: { id: number; title: string };
}

export interface GrupoPorPropiedad<T> {
  propertyId: number;
  titulo: string;
  items: T[];
}

// Respeta el orden en que llegan (las mas nuevas primero): los grupos salen en el orden de su primer elemento.
// No muta la lista original (Clase 12).
export function agruparPorPropiedad<T extends ConPropiedad>(lista: T[]): GrupoPorPropiedad<T>[] {
  const grupos = new Map<number, GrupoPorPropiedad<T>>();
  for (const elemento of lista) {
    const id = elemento.property?.id ?? 0;
    const grupo = grupos.get(id) ?? { propertyId: id, titulo: elemento.property?.title ?? "Propiedad sin datos", items: [] };
    grupo.items.push(elemento);
    grupos.set(id, grupo);
  }
  return [...grupos.values()];
}

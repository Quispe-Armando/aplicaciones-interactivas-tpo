import type { Property } from "../api/types";
import { OPERACIONES, TIPOS } from "../lib/formato";
import estilos from "./AtributosPropiedad.module.css";

// Los datos de la propiedad. Los que no aplican (un terreno no tiene ambientes ni superficie cubierta) o no se cargaron no se muestran.
export default function AtributosPropiedad({
  propiedad,
}: {
  propiedad: Property;
}) {
  const esTerreno = propiedad.type === "LAND";
  const filas: Array<[string, string | null]> = [
    ["Tipo", TIPOS[propiedad.type]],
    ["Operación", OPERACIONES[propiedad.operation]],
    ["Zona", propiedad.area],
    ["Dirección", propiedad.address],
    ["Superficie total", `${propiedad.totalAreaM2} m²`],
    [
      "Superficie cubierta",
      !esTerreno && propiedad.coveredAreaM2 !== null
        ? `${propiedad.coveredAreaM2} m²`
        : null,
    ],
    [
      "Ambientes",
      !esTerreno && propiedad.rooms !== null ? String(propiedad.rooms) : null,
    ],
    [
      "Dormitorios",
      !esTerreno && propiedad.bedrooms !== null
        ? String(propiedad.bedrooms)
        : null,
    ],
    [
      "Baños",
      !esTerreno && propiedad.bathrooms !== null
        ? String(propiedad.bathrooms)
        : null,
    ],
    [
      "Antigüedad",
      propiedad.ageYears === null
        ? null
        : propiedad.ageYears === 0
          ? "A estrenar"
          : `${propiedad.ageYears} años`,
    ],
  ];

  return (
    <>
      <dl className={estilos.atributos}>
        {filas
          .filter((fila): fila is [string, string] => fila[1] !== null)
          .map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt>{etiqueta}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
      </dl>
      {propiedad.tags.length > 0 && (
        <ul className="chips" aria-label="Amenities">
          {propiedad.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}
    </>
  );
}

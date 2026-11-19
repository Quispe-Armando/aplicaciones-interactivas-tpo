import { useState } from "react";
import { leerAmenities, ordenActual, ORDENES } from "../lib/filtrosUrl";
import { OPERACIONES, TIPOS } from "../lib/formato";
import estilos from "./FiltrosPropiedades.module.css";

type Cambios = Record<string, string | undefined>;

interface FiltrosPropiedadesProps {
  params: URLSearchParams;
  // Cambia filtros en la URL. Un valor vacio (undefined) saca el filtro. reemplazar: no agrega entrada al historial (para lo que se tipea).
  onCambiar: (cambios: Cambios, reemplazar?: boolean) => void;
}

// Barra de filtros del listado. No guarda estado de los filtros: cada control muestra lo que dice la URL (Clase 13, 3.1).
export default function FiltrosPropiedades({ params, onCambiar }: FiltrosPropiedadesProps) {
  const amenities = leerAmenities(params);
  const [nuevoAmenity, setNuevoAmenity] = useState("");

  function agregarAmenity() {
    const amenity = nuevoAmenity.trim().toLowerCase();
    if (amenity && !amenities.includes(amenity)) onCambiar({ amenities: [...amenities, amenity].join(",") });
    setNuevoAmenity("");
  }

  function quitarAmenity(amenity: string) {
    onCambiar({ amenities: amenities.filter((a) => a !== amenity).join(",") || undefined });
  }

  return (
    <div className={estilos.filtros}>
      <label>
        Tipo
        <select value={params.get("type") ?? ""} onChange={(e) => onCambiar({ type: e.target.value || undefined })}>
          <option value="">Todos</option>
          {Object.entries(TIPOS).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
      </label>

      <label>
        Operación
        <select value={params.get("operation") ?? ""} onChange={(e) => onCambiar({ operation: e.target.value || undefined })}>
          <option value="">Venta y alquiler</option>
          {Object.entries(OPERACIONES).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
      </label>

      <label>
        Moneda
        <select value={params.get("currency") ?? ""} onChange={(e) => onCambiar({ currency: e.target.value || undefined })}>
          <option value="">Ambas</option>
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </label>

      <label>
        Precio desde
        <input
          type="number"
          min="0"
          placeholder="Mínimo"
          value={params.get("minPrice") ?? ""}
          onChange={(e) => onCambiar({ minPrice: e.target.value || undefined }, true)}
        />
      </label>

      <label>
        Precio hasta
        <input
          type="number"
          min="0"
          placeholder="Máximo"
          value={params.get("maxPrice") ?? ""}
          onChange={(e) => onCambiar({ maxPrice: e.target.value || undefined }, true)}
        />
      </label>

      <label>
        Zona
        <input
          type="search"
          placeholder="Barrio o localidad"
          value={params.get("area") ?? ""}
          onChange={(e) => onCambiar({ area: e.target.value || undefined }, true)}
        />
      </label>

      <label>
        Ambientes
        <select value={params.get("rooms") ?? ""} onChange={(e) => onCambiar({ rooms: e.target.value || undefined })}>
          <option value="">Cualquiera</option>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <label>
        Ordenar por
        <select
          value={ordenActual(params)}
          onChange={(e) => {
            const orden = ORDENES.find((o) => o.valor === e.target.value);
            onCambiar({ sort: orden?.sort, order: orden?.order });
          }}
        >
          {ORDENES.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      </label>

      <div className={estilos.amenities}>
        <label>
          Amenities (tiene que tener todos)
          <span className="password">
            <input
              value={nuevoAmenity}
              placeholder="pileta, cochera…"
              onChange={(e) => setNuevoAmenity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarAmenity();
                }
              }}
            />
            <button type="button" className="boton" onClick={agregarAmenity} aria-label="Agregar amenity">
              +
            </button>
          </span>
        </label>
        {amenities.length > 0 && (
          <ul className="chips">
            {amenities.map((amenity) => (
              <li key={amenity}>
                {amenity}
                <button type="button" onClick={() => quitarAmenity(amenity)} aria-label={`Quitar ${amenity}`}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";

interface EditorAmenitiesProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

// Amenities como chips: se escribe y se agrega con Enter o "+"; la ✕ de cada chip lo quita.
export default function EditorAmenities({ tags, onChange }: EditorAmenitiesProps) {
  const [nuevo, setNuevo] = useState("");

  function agregar() {
    // El back guarda los amenities en minusculas, sin repetir y sin comas.
    const tag = nuevo.trim().toLowerCase().replace(/,/g, " ").trim();
    if (tag && !tags.includes(tag) && tags.length < 30) onChange([...tags, tag]);
    setNuevo("");
  }

  return (
    <div className="campo">
      <label>
        Amenities
        <span className="password">
          <input
            value={nuevo}
            placeholder="pileta, cochera, balcón…"
            maxLength={40}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregar();
              }
            }}
          />
          <button type="button" className="boton" onClick={agregar} aria-label="Agregar amenity">
            +
          </button>
        </span>
      </label>
      {tags.length > 0 && (
        <ul className="chips">
          {tags.map((tag) => (
            <li key={tag}>
              {tag}
              <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} aria-label={`Quitar ${tag}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

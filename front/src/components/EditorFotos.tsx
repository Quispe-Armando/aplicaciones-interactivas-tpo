import { useState } from "react";
import type { PropertyImage } from "../api/types";
import { validarUrl } from "../lib/propiedadForm";
import estilos from "./EditorFotos.module.css";

interface EditorFotosProps {
  fotos: PropertyImage[];
  onChange: (fotos: PropertyImage[]) => void;
  error?: string;
}

// Galeria de la propiedad: se cargan varias fotos (por URL), se ordenan con ▲ ▼ y se marca una como portada.
// Nunca se modifica el array recibido: cada cambio arma uno nuevo con map / filter / spread (Clase 12).
export default function EditorFotos({ fotos, onChange, error }: EditorFotosProps) {
  const [url, setUrl] = useState("");
  const [errorUrl, setErrorUrl] = useState<string | null>(null);

  function agregar() {
    const limpia = url.trim();
    if (!validarUrl(limpia)) return setErrorUrl("Ingresá una URL válida que empiece con http:// o https://");
    if (fotos.some((foto) => foto.url === limpia)) return setErrorUrl("Esa foto ya está cargada");
    // La primera foto que se carga queda como portada.
    onChange([...fotos, { url: limpia, isCover: fotos.length === 0 }]);
    setUrl("");
    setErrorUrl(null);
  }

  function marcarPortada(indice: number) {
    onChange(fotos.map((foto, i) => ({ ...foto, isCover: i === indice })));
  }

  function mover(indice: number, desplazamiento: -1 | 1) {
    const destino = indice + desplazamiento;
    if (destino < 0 || destino >= fotos.length) return;
    const nuevas = [...fotos];
    [nuevas[indice], nuevas[destino]] = [nuevas[destino], nuevas[indice]];
    onChange(nuevas);
  }

  function quitar(indice: number) {
    const restantes = fotos.filter((_, i) => i !== indice);
    // Si se quita la portada, la primera que quede pasa a serlo.
    if (restantes.length > 0 && !restantes.some((foto) => foto.isCover)) restantes[0] = { ...restantes[0], isCover: true };
    onChange(restantes);
  }

  return (
    <fieldset className={estilos.editor}>
      <legend>Fotos</legend>

      <div className="password">
        <input
          type="url"
          value={url}
          placeholder="https://… (URL de la foto)"
          aria-label="URL de la foto"
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // Enter no tiene que enviar el formulario entero
              agregar();
            }
          }}
        />
        <button type="button" className="boton" onClick={agregar}>
          Agregar foto
        </button>
      </div>
      {errorUrl && <p className="error-campo">{errorUrl}</p>}
      {error && <p className="error-campo">{error}</p>}

      {fotos.length > 0 && (
        <ul className={estilos.lista}>
          {fotos.map((foto, i) => (
            <li key={foto.url}>
              <img src={foto.url} alt={`Foto ${i + 1}`} />
              <span className={estilos.url}>{foto.url}</span>
              <label className={estilos.portada}>
                <input type="radio" name="portada" checked={foto.isCover} onChange={() => marcarPortada(i)} />
                Portada
              </label>
              <span className={estilos.acciones}>
                <button type="button" className="boton" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir la foto ${i + 1}`}>
                  ▲
                </button>
                <button type="button" className="boton" onClick={() => mover(i, 1)} disabled={i === fotos.length - 1} aria-label={`Bajar la foto ${i + 1}`}>
                  ▼
                </button>
                <button type="button" className="boton" onClick={() => quitar(i)} aria-label={`Quitar la foto ${i + 1}`}>
                  🗑
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

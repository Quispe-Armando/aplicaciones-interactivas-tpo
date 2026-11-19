import { useState } from "react";
import type { PropertyImage } from "../api/types";
import estilos from "./Galeria.module.css";

interface GaleriaProps {
  imagenes: PropertyImage[];
  titulo: string;
}

// Foto principal + miniaturas: al hacer click en una miniatura pasa a ser la principal (estado: cual es, Clase 11).
export default function Galeria({ imagenes, titulo }: GaleriaProps) {
  // La portada va primera, asi es la que se ve al abrir.
  const fotos = [...imagenes].sort((a, b) => Number(b.isCover) - Number(a.isCover));
  const [indice, setIndice] = useState(0);

  if (fotos.length === 0) return <div className={`${estilos.principal} ${estilos.sinFoto}`}>Sin fotos</div>;

  return (
    <div className={estilos.galeria}>
      <img className={estilos.principal} src={fotos[indice].url} alt={`${titulo} (foto ${indice + 1} de ${fotos.length})`} />
      {fotos.length > 1 && (
        <ul className={estilos.miniaturas}>
          {fotos.map((foto, i) => (
            <li key={foto.url}>
              <button type="button" onClick={() => setIndice(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === indice}>
                <img className={i === indice ? `${estilos.miniatura} ${estilos.activa}` : estilos.miniatura} src={foto.url} alt="" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

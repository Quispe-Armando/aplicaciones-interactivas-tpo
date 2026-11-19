import { Link } from "react-router";
import type { Property } from "../api/types";
import {
  fotoPortada,
  formatearPrecio,
  OPERACIONES,
  TIPOS,
} from "../lib/formato";
import estilos from "./CardPropiedad.module.css";

// Una propiedad del listado: foto de portada, precio, titulo, tipo, operacion y zona. Toda la card lleva al detalle.
export default function CardPropiedad({ propiedad }: { propiedad: Property }) {
  const foto = fotoPortada(propiedad);

  return (
    <Link to={`/propiedades/${propiedad.id}`} className={estilos.card}>
      {foto ? (
        <img
          className={estilos.foto}
          src={foto}
          alt={propiedad.title}
          loading="lazy"
        />
      ) : (
        <div className={estilos.sinFoto}>Sin foto</div>
      )}
      <div className={estilos.cuerpo}>
        <div className={estilos.precio}>
          <strong>
            {formatearPrecio(
              propiedad.price,
              propiedad.currency,
              propiedad.operation,
            )}
          </strong>
          <span
            className={
              propiedad.operation === "SALE"
                ? `${estilos.badge} ${estilos.venta}`
                : estilos.badge
            }
          >
            {OPERACIONES[propiedad.operation]}
          </span>
        </div>
        <h2>{propiedad.title}</h2>
        <p>
          {TIPOS[propiedad.type]} · {propiedad.area}
          {propiedad.rooms !== null && ` · ${propiedad.rooms} amb.`} ·{" "}
          {propiedad.totalAreaM2} m²
        </p>
      </div>
    </Link>
  );
}

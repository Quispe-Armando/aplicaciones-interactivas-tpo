interface ErrorCargaProps {
  que: string; // "No se pudieron cargar las propiedades"
  mensaje: string | null; // el motivo que dio la API o el cliente (null: llego una respuesta sin datos)
  onReintentar?: () => void;
}

// Estado de error reutilizable: dice que fallo, por que y ofrece "Reintentar" cuando se puede volver a pedir.
export default function ErrorCarga({ que, mensaje, onReintentar }: ErrorCargaProps) {
  return (
    <div className="mensaje" role="alert">
      <p className="error">
        {que}: {mensaje ?? "no llegaron datos"}
      </p>
      {onReintentar && (
        <button type="button" className="boton" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}

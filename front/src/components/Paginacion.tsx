import estilos from "./Paginacion.module.css";

// Paginacion a partir de la metadata que devuelve GET /properties: { page, limit, total }.
interface PaginacionProps {
  page: number;
  limit: number;
  total: number;
  onCambiar: (pagina: number) => void;
}

export default function Paginacion({ page, limit, total, onCambiar }: PaginacionProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / limit));
  if (totalPaginas === 1) return null;

  // Ventana de numeros alrededor de la pagina actual (maximo 5), para no dibujar cientos de botones.
  const desde = Math.max(1, Math.min(page - 2, totalPaginas - 4));
  const hasta = Math.min(totalPaginas, desde + 4);
  const numeros: number[] = [];
  for (let n = desde; n <= hasta; n++) numeros.push(n);

  return (
    <nav className={estilos.paginacion} aria-label="Paginación">
      <button type="button" className="boton" disabled={page <= 1} onClick={() => onCambiar(page - 1)}>
        ◀ Anterior
      </button>
      {numeros.map((n) => (
        <button
          key={n}
          type="button"
          className={n === page ? "boton primario" : "boton"}
          aria-current={n === page ? "page" : undefined}
          onClick={() => onCambiar(n)}
        >
          {n}
        </button>
      ))}
      <button type="button" className="boton" disabled={page >= totalPaginas} onClick={() => onCambiar(page + 1)}>
        Siguiente ▶
      </button>
    </nav>
  );
}

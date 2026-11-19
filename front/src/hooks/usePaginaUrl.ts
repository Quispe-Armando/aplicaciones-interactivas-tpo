import { useSearchParams } from "react-router";

// La pagina actual de una lista vive en la URL (?page=2), como los filtros (Clase 13): se puede compartir y sobrevive al F5.
// Antes lo repetian las cuatro pantallas del panel; ahora es un solo hook (Clase 15: los hooks comparten LOGICA, no estado:
// cada pantalla que lo llama tiene su propia copia).
//
//   - page: el numero de pagina; cualquier cosa invalida en la URL (page=abc, page=-3, page=1.5) se toma como 1.
//   - irAPagina(n): cambia solo la pagina y conserva los demas parametros (el filtro); la pagina 1 no ensucia la URL.
export function usePaginaUrl() {
  const [params, setParams] = useSearchParams();

  const paginaUrl = Number(params.get("page"));
  const page = Number.isInteger(paginaUrl) && paginaUrl >= 1 ? paginaUrl : 1;

  function irAPagina(n: number) {
    const siguiente = new URLSearchParams(params);
    if (n <= 1) siguiente.delete("page");
    else siguiente.set("page", String(n));
    setParams(siguiente);
  }

  return { page, irAPagina };
}

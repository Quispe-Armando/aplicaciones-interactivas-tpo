import { useState } from "react";
import type { ReviewsPage } from "../api/types";
import { conQuery } from "../api/url";
import { useFetch } from "./useFetch";

const PAGE_SIZE = 5;

// Las reseñas de una inmobiliaria, paginadas. Un hook propio que usa useFetch (Clase 15, 3.1):
// vive en la pagina del sitio para que la cabecera y la seccion de reseñas compartan los mismos datos
// (el promedio llega con la lista).
export function useResenas(agencyId: number) {
  const [pagina, setPagina] = useState(1);
  const carga = useFetch<ReviewsPage>(conQuery(`/agencies/${agencyId}/reviews`, { page: pagina, limit: PAGE_SIZE }));

  // Despues de dejar una reseña: las mas nuevas van primero, asi que se vuelve a la primera pagina y se pide de nuevo
  // (la lista nueva trae tambien el promedio actualizado).
  function volverAlPrincipio() {
    setPagina(1);
    carga.recargar();
  }

  return { ...carga, pagina, setPagina, volverAlPrincipio };
}

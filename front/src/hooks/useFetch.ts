import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { request } from "../api/client";
import { ApiError, errorMessage } from "../api/errors";

// El useFetch de la Clase 15 (la carga de la Clase 14 escrita una sola vez), adaptado al TPO:
//   - pide con `request` (URL base, token, ApiError) en vez de fetch pelado
//   - un 404 no es un error: es "no existe" (noExiste), como en la solución del Ejercicio 2
//   - `status` guarda el código del error (403, 500...) para pantallas que lo distinguen
//   - url null = "todavía no hay nada que pedir" (un hook no se puede llamar dentro de un if)
//   - `recargar` vuelve a pedir la misma url (botón "Reintentar", refrescar después de una acción)
// Cada componente que lo llama tiene su propio estado y su propio request.

export type Carga<T> = {
  datos: T | null; // los últimos datos recibidos (se siguen viendo mientras se pide otra url); null si no llegó nada, falló o no existe
  // El setter de useState, tal cual: para reflejar un cambio sin volver a pedir (p. ej. sumar una consulta nueva a la lista).
  setDatos: Dispatch<SetStateAction<T | null>>;
  cargando: boolean;
  error: string | null;
  status: number | null; // código HTTP del error (0 = sin conexión); null si no hubo error
  noExiste: boolean; // la API respondió 404
  recargar: () => void;
};

// Lo que dejó el último pedido terminado. `clave` dice a qué url (y a qué "recarga") corresponde.
type Resultado = {
  clave: string;
  error: string | null;
  status: number | null;
  noExiste: boolean;
};

export function useFetch<T>(url: string | null): Carga<T> {
  const [version, setVersion] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [datos, setDatos] = useState<T | null>(null);

  const clave = url === null ? null : `${url}#${version}`;

  useEffect(() => {
    if (url === null) return;
    const claveDelPedido = `${url}#${version}`;
    const controller = new AbortController();

    async function cargar() {
      try {
        const recibidos = await request<T>(url!, { signal: controller.signal });
        setDatos(recibidos);
        setResultado({
          clave: claveDelPedido,
          error: null,
          status: null,
          noExiste: false,
        });
      } catch (e) {
        if (controller.signal.aborted) return; // lo canceló el cleanup: ya hay otro pedido en camino
        if (e instanceof ApiError && e.status === 404) {
          setDatos(null);
          setResultado({
            clave: claveDelPedido,
            error: null,
            status: 404,
            noExiste: true,
          });
        } else {
          setDatos(null);
          setResultado({
            clave: claveDelPedido,
            error: errorMessage(e),
            status: e instanceof ApiError ? e.status : 0,
            noExiste: false,
          });
        }
      }
    }
    cargar();

    return () => controller.abort();
  }, [url, version]);

  // agregado para que recargar mantenga una referencia estable, osea recordar en cada renderizado.
  const recargar = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  // "Cargando" se calcula en el render: mientras el resultado no sea de la url actual, se está pidiendo.
  // Así no hay un render con datos de otra url marcados como listos.
  const alDia = clave === null || resultado?.clave === clave;

  return {
    datos,
    setDatos,
    cargando: clave !== null && !alDia,
    error: alDia && resultado ? resultado.error : null,
    status: alDia && resultado ? resultado.status : null,
    noExiste: alDia && resultado ? resultado.noExiste : false,
    recargar,
  };
}

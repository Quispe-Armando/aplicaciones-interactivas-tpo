import { useState } from "react";
import { errorMessage } from "../api/errors";

// Una accion del usuario que llama a la API (cambiar un estado, eliminar...) con su estado propio: "pendiente" y "error"
// (Clase 15, integrador). Es lo que antes hacia cada handler con dos useState copiados.
// Un hook comparte la logica, no el estado: cada fila de la tabla que lo llama tiene su pendiente y su error.
export type Accion<A extends unknown[]> = {
  ejecutar: (...args: A) => Promise<void>;
  pendiente: boolean;
  error: string | null;
};

export function useAccion<A extends unknown[]>(accion: (...args: A) => Promise<void>): Accion<A> {
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(...args: A) {
    if (pendiente) return; // un doble click no manda dos pedidos
    setPendiente(true);
    setError(null);
    try {
      await accion(...args);
    } catch (e) {
      setError(errorMessage(e)); // el motivo que devolvio el back (400, 409...)
    } finally {
      setPendiente(false);
    }
  }

  return { ejecutar, pendiente, error };
}

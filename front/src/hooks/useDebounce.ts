import { useEffect, useState } from "react";

// Devuelve el mismo valor, pero recién cuando dejó de cambiar durante `ms` milisegundos (Clase 15, useDebounce).
// No pide nada: no sabe de la API. Se combina con useFetch en otros hooks.
export function useDebounce<T>(valor: T, ms: number): T {
  const [demorado, setDemorado] = useState(valor);

  useEffect(() => {
    const timer = setTimeout(() => setDemorado(valor), ms);
    return () => clearTimeout(timer); // si cambia antes de tiempo, el timer anterior no corre
  }, [valor, ms]);

  return demorado;
}

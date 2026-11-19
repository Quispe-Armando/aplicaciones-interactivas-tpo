import { useEffect, useState } from "react";
import { errorMessage } from "./api/errors";
import { healthService } from "./services";

// Validacion del setup: pide GET /health a la API y muestra el resultado.
// Mismo patron que el listado de la Clase 14: effect con async adentro, estados de carga y error, y cleanup con AbortController.
export default function App() {
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function comprobar() {
      try {
        const health = await healthService.check(controller.signal);
        setEstado(health.status);
      } catch (e) {
        // El pedido cancelado por el cleanup (StrictMode monta dos veces) no es un error.
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(errorMessage(e));
      }
    }
    comprobar();

    return () => controller.abort();
  }, []);

  return (
    <main>
      <h1>Marketplace inmobiliario</h1>
      {!estado && !error && <p>Conectando con la API…</p>}
      {estado && <p>API: {estado} ✅</p>}
      {error && <p>No se pudo conectar con la API: {error}</p>}
    </main>
  );
}

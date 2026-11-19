import { useEffect, useRef, useState } from "react";
import { activityService } from "../services";

// La cantidad de novedades sin leer de la inmobiliaria, pedida cada `cadaMs` (polling). Es el mismo molde que
// useConsultasSinResponder de la Clase 15: un effect con setInterval + AbortController, y su cleanup.
//
//   - El cleanup corre al salir del panel (el layout se desmonta) y al cerrar sesion (agencyId pasa a null): no quedan intervalos.
//   - Un error puntual (API caida, sin red) no rompe el panel: queda el ultimo valor conocido.
//   - Un 401 lo maneja el cliente de la API: borra la sesion, agencyId pasa a null y el polling se corta solo.
//
// Devuelve ademas `versionNuevas`: un numero que sube cada vez que el back informa MAS novedades sin leer que la vez
// anterior. La pantalla de Actividad lo usa para volver a pedir su lista solo cuando llego algo nuevo.
export function useNoLeidas(agencyId: number | null, cadaMs: number) {
  const [noLeidas, setNoLeidas] = useState(0);
  const [versionNuevas, setVersionNuevas] = useState(0);
  // Ultimo contador que informo el servidor (un ref: se lee y se escribe sin volver a renderizar).
  const ultimoConteo = useRef<number | null>(null);

  useEffect(() => {
    if (agencyId === null) return; // sin inmobiliaria (sesion cerrandose o confirmandose) no hay nada que consultar
    ultimoConteo.current = null; // si cambia la inmobiliaria, la comparacion arranca de cero
    const controller = new AbortController();

    async function consultar() {
      try {
        const { unread } = await activityService.unreadCount(
          agencyId!,
          controller.signal,
        );
        if (ultimoConteo.current !== null && unread > ultimoConteo.current) {
          setVersionNuevas((v) => v + 1);
        }
        ultimoConteo.current = unread;
        setNoLeidas(unread);
      } catch {
        // queda el ultimo valor conocido
      }
    }
    consultar();
    const intervalo = setInterval(consultar, cadaMs);

    return () => {
      clearInterval(intervalo);
      controller.abort();
    };
  }, [agencyId, cadaMs]);

  // Segundo effect, otra responsabilidad (Clase 15): el titulo de la pestaña, "(3) Titulo".
  useEffect(() => {
    const original = document.title;
    if (noLeidas > 0) document.title = `(${noLeidas}) ${original}`;
    // Al cambiar el numero o al salir del panel se devuelve el titulo original: el sitio publico no queda con "(3)".
    return () => {
      document.title = original;
    };
  }, [noLeidas]);

  // Una novedad se acaba de marcar como leida: el contador baja en el momento, sin esperar al proximo polling
  // (que despues lo confirma con el numero real del back). El ref baja tambien, para que una novedad nueva
  // que lo devuelva al numero anterior se siga detectando como "nueva".
  function restarUna() {
    setNoLeidas((n) => Math.max(0, n - 1));
    if (ultimoConteo.current !== null)
      ultimoConteo.current = Math.max(0, ultimoConteo.current - 1);
  }

  return { noLeidas, restarUna, versionNuevas };
}

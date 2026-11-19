import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

// El aviso que una pantalla anterior dejo en location.state ("Propiedad creada", "Cambios guardados") antes de navegar.
// Devuelve [aviso, setAviso]: el aviso arranca con lo que llego en el state y se puede cerrar (setAviso(null)) o reemplazar.
//
// Este es un effect que SI corresponde (Clase 14, "effects que sobran"): no es una carga de datos ni estado derivado,
// es sincronizar con algo de afuera (el historial del navegador). Limpia el state para que el aviso no reaparezca al recargar.
export function useAvisoNavegacion() {
  const location = useLocation();
  const navigate = useNavigate();

  const [aviso, setAviso] = useState<string | null>(() => {
    const estado = location.state as { aviso?: string } | null;
    return estado?.aviso ?? null;
  });

  useEffect(() => {
    if (location.state)
      navigate(location.pathname + location.search, {
        replace: true,
        state: null,
      });
  }, [location, navigate]);

  return [aviso, setAviso] as const;
}

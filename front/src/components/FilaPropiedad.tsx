import { useState } from "react";
import { Link } from "react-router";
import type { Property } from "../api/types";
import { useAccion } from "../hooks/useAccion";
import { accionesDe } from "../lib/ciclo";
import type { AccionEstado } from "../lib/ciclo";
import { ESTADOS, OPERACIONES, TIPOS, fotoPortada, formatearPrecio } from "../lib/formato";
import { esEditable } from "../lib/propiedadForm";
import { propertiesService } from "../services";
import HistorialEstados from "./HistorialEstados";
import Confirmacion from "./Confirmacion";
import BadgeEstado from "./BadgeEstado";
import estilos from "./FilaPropiedad.module.css";

interface FilaPropiedadProps {
  propiedad: Property;
  // Avisan a la pagina, que es la dueña de la lista: ella la actualiza (sin volver a pedirla).
  onEstadoCambiado: (actualizada: Property) => void;
  onEliminada: (eliminada: Property) => void;
}

// Lo que espera confirmacion: un cambio de estado que no se puede deshacer, o eliminar el borrador.
type Pendiente = { tipo: "estado"; accion: AccionEstado } | { tipo: "eliminar" };

// Una fila de "Mis propiedades" con sus acciones. Cada fila tiene su propio estado (pendiente, error, confirmacion, historial),
// porque cada una llama a sus propios hooks: confirmar una no bloquea ni afecta a las demas.
export default function FilaPropiedad({ propiedad, onEstadoCambiado, onEliminada }: FilaPropiedadProps) {
  const [porConfirmar, setPorConfirmar] = useState<Pendiente | null>(null);
  const [verHistorial, setVerHistorial] = useState(false);

  // La pantalla solo cambia si el back acepta: si PATCH falla, tira el error y onEstadoCambiado no se llega a llamar.
  const cambio = useAccion(async (destino: AccionEstado["destino"]) => {
    onEstadoCambiado(await propertiesService.changeStatus(propiedad.id, destino));
  });
  const baja = useAccion(async () => {
    await propertiesService.remove(propiedad.id);
    onEliminada(propiedad);
  });

  const ocupada = cambio.pendiente || baja.pendiente;
  const error = cambio.error ?? baja.error;
  const portada = fotoPortada(propiedad);
  const acciones = accionesDe(propiedad);

  function pedir(accion: AccionEstado) {
    if (accion.advertencia) setPorConfirmar({ tipo: "estado", accion }); // destructiva: antes se pregunta
    else cambio.ejecutar(accion.destino);
  }

  function confirmar() {
    if (!porConfirmar) return;
    if (porConfirmar.tipo === "estado") cambio.ejecutar(porConfirmar.accion.destino);
    else baja.ejecutar();
    setPorConfirmar(null);
  }

  return (
    <>
      <tr className={estilos.fila}>
        <td className={estilos.celdaFoto}>{portada ? <img className={estilos.miniatura} src={portada} alt="" /> : "—"}</td>
        <td className={estilos.celdaTitulo}>
          {propiedad.title}
          <br />
          <small>{TIPOS[propiedad.type]}</small>
        </td>
        <td className={estilos.datos} data-label="Operación">{OPERACIONES[propiedad.operation]}</td>
        <td className={estilos.datos} data-label="Precio">{formatearPrecio(propiedad.price, propiedad.currency, propiedad.operation)}</td>
        <td className={estilos.datos} data-label="Estado">
          <BadgeEstado estado={propiedad.status} texto={ESTADOS[propiedad.status]} />
        </td>
        <td>
          <div className="acciones-fila">
            {/* Los borradores todavia no tienen pagina publica. */}
            {propiedad.status !== "DRAFT" && <Link to={`/propiedades/${propiedad.id}`}>Ver</Link>}
            {/* Vendida, alquilada o cancelada: ya no se edita, no se ofrece el boton. */}
            {esEditable(propiedad.status) && <Link to={`/panel/propiedades/${propiedad.id}/editar`}>Editar</Link>}
            {/* Solo se puede eliminar un borrador. */}
            {propiedad.status === "DRAFT" && (
              <button type="button" className="boton" disabled={ocupada} onClick={() => setPorConfirmar({ tipo: "eliminar" })}>
                Eliminar
              </button>
            )}
            <button type="button" className="boton" aria-expanded={verHistorial} onClick={() => setVerHistorial(!verHistorial)}>
              {verHistorial ? "Ocultar historial" : "Historial"}
            </button>
          </div>

          {/* Solo las transiciones validas para el estado actual. */}
          {acciones.length > 0 && (
            <div className={`acciones-fila ${estilos.accionesEstado}`}>
              {acciones.map((accion) => (
                <button
                  key={accion.destino}
                  type="button"
                  className={accion.advertencia ? "boton peligro-suave" : "boton"}
                  disabled={ocupada || porConfirmar !== null}
                  onClick={() => pedir(accion)}
                >
                  {accion.etiqueta}
                </button>
              ))}
            </div>
          )}

          {ocupada && <p className="aviso">Guardando…</p>}

          {porConfirmar && (
            <Confirmacion
              pregunta={porConfirmar.tipo === "estado" ? `¿${porConfirmar.accion.etiqueta}?` : "¿Eliminar este borrador?"}
              confirmar={porConfirmar.tipo === "estado" ? `Sí, ${porConfirmar.accion.etiqueta.toLowerCase()}` : "Sí, eliminar"}
              onConfirmar={confirmar}
              onCancelar={() => setPorConfirmar(null)}
            >
              {porConfirmar.tipo === "estado" ? porConfirmar.accion.advertencia : "Se borra y no se puede recuperar."}
            </Confirmacion>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </td>
      </tr>

      {verHistorial && (
        <tr className={estilos.historial}>
          <td colSpan={6}>
            <h3>Historial de “{propiedad.title}”</h3>
            {/* key = estado: despues de un cambio el historial se vuelve a pedir y muestra la entrada nueva. */}
            <HistorialEstados key={propiedad.status} propertyId={propiedad.id} />
          </td>
        </tr>
      )}
    </>
  );
}

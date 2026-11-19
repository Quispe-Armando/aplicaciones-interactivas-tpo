import type { ReactNode } from "react";

// Un campo de formulario: etiqueta + input (children) + el mensaje de error debajo, si hay.
export default function Campo({
  etiqueta,
  error,
  children,
}: {
  etiqueta: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="campo">
      <label>
        {etiqueta}
        {children}
      </label>
      {error && (
        <p className="error-campo" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}

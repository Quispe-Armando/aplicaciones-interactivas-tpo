// Pantalla provisoria: cada una se reemplaza por la real en su tarea.
export default function EnConstruccion({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <section>
      <h1>{titulo}</h1>
      {detalle && <p>{detalle}</p>}
      <p className="aviso">Pantalla en construcción.</p>
    </section>
  );
}

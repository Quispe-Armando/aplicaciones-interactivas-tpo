import { Link } from "react-router";

// La pagina de la ruta "*": cualquier URL que no coincida con otra ruta.
export default function NoEncontrada() {
  return (
    <section className="mensaje">
      <h1>404</h1>
      <p>Esta página no existe.</p>
      <Link to="/">Volver al inicio</Link>
    </section>
  );
}

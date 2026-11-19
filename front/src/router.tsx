import { Navigate, createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { onUnauthorized } from "./api/session";
import NoEncontrada from "./components/NoEncontrada";
import LayoutPanel from "./layouts/LayoutPanel";
import LayoutPublico from "./layouts/LayoutPublico";
import RequiereSesion from "./layouts/RequiereSesion";
import ActividadPage from "./pages/ActividadPage";
import ConsultasPage from "./pages/ConsultasPage";
import DetallePropiedadPage from "./pages/DetallePropiedadPage";
import ListadoPage from "./pages/ListadoPage";
import LoginPage from "./pages/LoginPage";
import EditarPropiedadPage from "./pages/EditarPropiedadPage";
import MiInmobiliariaPage from "./pages/MiInmobiliariaPage";
import MisPropiedadesPage from "./pages/MisPropiedadesPage";
import NuevaPropiedadPage from "./pages/NuevaPropiedadPage";
import RegistroPage from "./pages/RegistroPage";
import ReportesPage from "./pages/ReportesPage";
import SitioInmobiliariaPage from "./pages/SitioInmobiliariaPage";
import VisitasPage from "./pages/VisitasPage";

// Mapa de URLs de la app:
//
//   /                      LayoutPublico (interesado)
//   ├─ (index)             Listado de propiedades
//   ├─ propiedades/:id     Detalle de propiedad
//   ├─ inmobiliarias/:id   Sitio de la inmobiliaria
//   ├─ login, registro     Acceso del vendedor
//   └─ *                   404
//   /panel                 RequiereSesion -> LayoutPanel (vendedor)
//   ├─ (index)             -> /panel/propiedades
//   ├─ propiedades, propiedades/nueva, propiedades/:id/editar, inmobiliaria
//   ├─ visitas, consultas, actividad, reportes
//   └─ *                   404 dentro del panel
export const rutas: RouteObject[] = [
  {
    path: "/",
    element: <LayoutPublico />,
    children: [
      { index: true, element: <ListadoPage /> },
      { path: "propiedades/:id", element: <DetallePropiedadPage /> },
      { path: "inmobiliarias/:id", element: <SitioInmobiliariaPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "registro", element: <RegistroPage /> },
      { path: "*", element: <NoEncontrada /> },
    ],
  },
  {
    // Ruta "de layout" sin path: no agrega nada a la URL, solo envuelve a sus hijas con el guardia.
    element: <RequiereSesion />,
    children: [
      {
        path: "/panel",
        element: <LayoutPanel />,
        children: [
          { index: true, element: <Navigate to="propiedades" replace /> },
          { path: "propiedades", element: <MisPropiedadesPage /> },
          { path: "propiedades/nueva", element: <NuevaPropiedadPage /> },
          { path: "propiedades/:id/editar", element: <EditarPropiedadPage /> },
          { path: "inmobiliaria", element: <MiInmobiliariaPage /> },
          { path: "visitas", element: <VisitasPage /> },
          { path: "consultas", element: <ConsultasPage /> },
          { path: "actividad", element: <ActividadPage /> },
          { path: "reportes", element: <ReportesPage /> },
          { path: "*", element: <NoEncontrada /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(rutas);

// Si la API responde 401 (token vencido), el cliente limpia la sesion y avisa: se navega al login sin recargar la pagina.
// (El AuthContext se entera por su lado y deja de mostrar al vendedor.)
onUnauthorized(() => {
  if (window.location.pathname !== "/login") {
    router.navigate("/login", { replace: true, state: { desde: window.location.pathname + window.location.search } });
  }
});

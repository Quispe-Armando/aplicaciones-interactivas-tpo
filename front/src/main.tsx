import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { AuthProvider } from "./auth/AuthContext";
import { router } from "./router";
import "./index.css";


//function App() {
  //return <main><h1>Marketplace inmobiliario</h1></main>;
//}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);

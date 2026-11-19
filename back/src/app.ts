import "reflect-metadata";
import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/error-handler";
import { notFound } from "./middlewares/not-found";
import { router } from "./routes";

// Arma la app de Express SIN levantar el servidor ni conectar la base (patron createApp() de la Clase 6).
// index.ts la usa para escuchar en un puerto; los tests la usan directo con supertest.
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(router);
  // Siempre al final y en este orden: primero las rutas, despues "ruta no encontrada" y por ultimo el manejador de errores.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
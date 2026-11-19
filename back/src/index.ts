import "reflect-metadata";
import "dotenv/config";
import { createApp } from "./app";
import { AppDataSource } from "./config/data-source";
import { getJwtSecret } from "./config/jwt";

// Falla al arrancar (y no en el primer login) si falta JWT_SECRET en el .env.
getJwtSecret();

const app = createApp();
const port = Number(process.env.PORT ?? 3000);

AppDataSource.initialize()
  .then(() => {
    console.log("Data source initialized");
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch((error: unknown) => {
    console.error("Error initializing data source", error);
    process.exit(1);
  });
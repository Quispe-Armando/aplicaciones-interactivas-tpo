import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  testEnvironment: "node",
  transform: { "^.+\\.ts$": ["ts-jest", {}] },
  testMatch: ["**/__tests__/**/*.spec.ts"],
  // Corre ANTES de cargar cada archivo de test: apunta la app a la base de test (ver __tests__/setup-env.ts).
  setupFiles: ["<rootDir>/__tests__/setup-env.ts"],
  // bcrypt + base de datos real: un poco mas de margen que los 5 s por defecto.
  testTimeout: 20000,
};
export default config;

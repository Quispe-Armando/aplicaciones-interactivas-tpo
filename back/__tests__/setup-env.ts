// Se ejecuta antes de importar nada de la app (setupFiles de jest.config.ts).
// Fuerza la base de TEST: los tests borran datos, asi que NUNCA pueden correr contra la de desarrollo.
// Como dotenv no pisa variables que ya existen, el DB_NAME del .env queda ignorado durante los tests.

const TEST_DB_NAME = process.env.DB_NAME_TEST ?? "tpo_inmobiliario_test";

if (!TEST_DB_NAME.endsWith("_test")) {
  throw new Error(`DB_NAME_TEST debe terminar en "_test" (es "${TEST_DB_NAME}"). Los tests no corren contra una base que no sea de test.`);
}

process.env.DB_NAME = TEST_DB_NAME;
process.env.NODE_ENV = "test";
// Secreto fijo para firmar los JWT de los tests: no depende del .env de cada uno.
process.env.JWT_SECRET = "secreto-solo-para-tests";
process.env.JWT_EXPIRES_IN = "1h";

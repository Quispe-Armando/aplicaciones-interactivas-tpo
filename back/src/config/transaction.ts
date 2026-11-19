import { EntityManager } from "typeorm";
import { AppDataSource } from "./data-source";

// Ejecuta `work` dentro de una transaccion: si termina bien se hace commit y si lanza un error,
// rollback. Es el patron QueryRunner de la Clase 4 (ejemplo 11), escrito una sola vez.
export async function runInTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const result = await work(queryRunner.manager);
    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

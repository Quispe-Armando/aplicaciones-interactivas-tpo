import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { QueryFailedError } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { getJwtExpiresIn, getJwtSecret } from "../config/jwt";
import { Agency } from "../entities/agency.entity";
import { Seller } from "../entities/seller.entity";
import { HttpError } from "../errors/http-error";
import { agencyRepository } from "../repositories/agency.repository";
import { sellerRepository } from "../repositories/seller.repository";

const BCRYPT_ROUNDS = 10;
const PG_UNIQUE_VIOLATION = "23505";

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  agency: { name: string; contactPhone: string };
}

// Lo que se le devuelve al cliente: nunca incluye passwordHash.
export interface SessionView {
  seller: { id: number; fullName: string; email: string; phone: string | null };
  agency: { id: number; name: string };
}

function toSessionView(seller: Seller, agency: Agency): SessionView {
  return {
    seller: { id: seller.id, fullName: seller.fullName, email: seller.email, phone: seller.phone },
    agency: { id: agency.id, name: agency.name },
  };
}

function signToken(sellerId: number): string {
  // sub (subject) es el claim estandar para "de quien es este token".
  return jwt.sign({ sub: String(sellerId) }, getJwtSecret(), { expiresIn: getJwtExpiresIn() });
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof QueryFailedError && (error.driverError as { code?: string } | undefined)?.code === PG_UNIQUE_VIOLATION;
}

class AuthService {
  // Crea Seller + Agency en una transaccion: o se crean los dos, o ninguno.
  async register(input: RegisterInput): Promise<SessionView> {
    if (await sellerRepository.existsByEmail(input.email)) {
      // details indica el campo, igual que en los 400: asi el front muestra el error junto al input.
      throw new HttpError(409, "El email ya está registrado", [{ field: "email", message: "El email ya está registrado" }]);
    }
    if (await agencyRepository.existsByName(input.agency.name)) {
      throw new HttpError(409, "El nombre de fantasía ya existe", [{ field: "agency.name", message: "El nombre de fantasía ya existe" }]);
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const seller = await queryRunner.manager.save(
        queryRunner.manager.create(Seller, {
          fullName: input.fullName,
          email: input.email,
          passwordHash,
          phone: input.phone || null,
        }),
      );

      const agency = await queryRunner.manager.save(
        queryRunner.manager.create(Agency, {
          name: input.agency.name,
          description: "", // se completa despues, al editar el perfil de la inmobiliaria
          logoUrl: null,
          contactPhone: input.agency.contactPhone,
          contactEmail: seller.email, // por defecto, el del vendedor
          officeAddress: null,
          seller,
        }),
      );

      await queryRunner.commitTransaction();
      return toSessionView(seller, agency);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      // Dos registros simultaneos pueden pasar el chequeo de arriba; la base los frena igual.
      if (isUniqueViolation(error)) {
        throw new HttpError(409, "El email o el nombre de fantasía ya existe");
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async login(email: string, password: string): Promise<SessionView & { token: string }> {
    const seller = await sellerRepository.findByEmail(email);
    const passwordOk = seller !== null && (await bcrypt.compare(password, seller.passwordHash));

    // Mismo mensaje si el email no existe o la contraseña es incorrecta.
    if (!seller || !passwordOk) {
      throw new HttpError(401, "Credenciales inválidas");
    }

    const agency = await agencyRepository.findBySellerId(seller.id);
    if (!agency) {
      // No deberia pasar: la inmobiliaria se crea junto con el vendedor.
      throw new Error(`El vendedor ${seller.id} no tiene inmobiliaria`);
    }

    return { token: signToken(seller.id), ...toSessionView(seller, agency) };
  }

  // Para que el front recupere la sesion (por ejemplo, al recargar la pagina).
  async getSession(sellerId: number): Promise<SessionView> {
    const seller = await sellerRepository.findById(sellerId);
    if (!seller) {
      // El token es valido pero la cuenta ya no existe (por ejemplo, se elimino la inmobiliaria).
      throw new HttpError(401, "El vendedor del token ya no existe");
    }

    const agency = await agencyRepository.findBySellerId(seller.id);
    if (!agency) {
      throw new Error(`El vendedor ${seller.id} no tiene inmobiliaria`);
    }

    return toSessionView(seller, agency);
  }
}

export const authService = new AuthService();

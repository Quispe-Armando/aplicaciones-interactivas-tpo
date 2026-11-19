import type { Request, Response } from "express";
import { z } from "zod";
import { authService } from "../services/auth.service";
import { parseBody } from "../validation/parse-body";

// El email se normaliza (sin espacios, en minusculas) antes de validar su formato.
const emailSchema = z.string("El email es obligatorio").trim().toLowerCase().pipe(z.email({ error: "El email no es válido" }));

const registerSchema = z.object({
  fullName: z.string("El nombre y apellido es obligatorio").trim().min(1, "El nombre y apellido es obligatorio").max(120),
  email: emailSchema,
  // bcrypt solo usa los primeros 72 bytes, por eso el maximo.
  password: z.string("La contraseña es obligatoria").min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
  phone: z.string().trim().max(40).optional(),
  agency: z.object(
    {
      name: z.string("El nombre de fantasía es obligatorio").trim().min(1, "El nombre de fantasía es obligatorio").max(120),
      contactPhone: z.string("El teléfono de la inmobiliaria es obligatorio").trim().min(1, "El teléfono de la inmobiliaria es obligatorio").max(40),
    },
    { error: "Los datos de la inmobiliaria son obligatorios" },
  ),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string("La contraseña es obligatoria").min(1, "La contraseña es obligatoria"),
});

// Los metodos no usan `this`, asi que se pueden pasar directo al router.
class AuthController {
  async register(request: Request, response: Response): Promise<void> {
    const input = parseBody(registerSchema, request.body);
    response.status(201).json(await authService.register(input));
  }

  async login(request: Request, response: Response): Promise<void> {
    const { email, password } = parseBody(loginSchema, request.body);
    response.json(await authService.login(email, password));
  }

  // Ruta protegida: requireAuth ya valido el token y dejo sellerId en la request.
  async me(request: Request, response: Response): Promise<void> {
    response.json(await authService.getSession(request.sellerId!));
  }
}

export const authController = new AuthController();

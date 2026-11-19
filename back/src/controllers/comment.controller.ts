import type { Request, Response } from "express";
import { z } from "zod";
import { commentService } from "../services/comment.service";
import { parseBody } from "../validation/parse-body";
import { parseId } from "../validation/parse-id";
import { parsePagination } from "../validation/pagination";

const createCommentSchema = z.object({
  authorName: z.string("El nombre es obligatorio").trim().min(1, "El nombre es obligatorio").max(120),
  content: z.string("El contenido es obligatorio").trim().min(1, "El contenido es obligatorio").max(1000),
});

const replySchema = z.object({
  reply: z.string("La respuesta es obligatoria").trim().min(1, "La respuesta es obligatoria").max(1000),
});

// ?answered=true (respondidas) | false (pendientes); sin el parametro, todas.
const listSchema = z.object({
  answered: z.preprocess((value: unknown) => (value === "" ? undefined : value), z.enum(["true", "false"], { error: "answered tiene que ser true o false" }).optional()),
});

// Los metodos no usan `this`, asi que se pueden pasar directo al router.
class CommentController {
  // POST /properties/:id/comments (publico: el interesado no se loguea)
  async create(request: Request, response: Response): Promise<void> {
    const input = parseBody(createCommentSchema, request.body);
    response.status(201).json(await commentService.create(parseId(request.params.id), input));
  }

  // GET /properties/:id/comments (publico)
  async list(request: Request, response: Response): Promise<void> {
    response.json(await commentService.listByProperty(parseId(request.params.id)));
  }

  // GET /agencies/:id/comments (solo el dueño de la inmobiliaria)
  async listByAgency(request: Request, response: Response): Promise<void> {
    const { answered } = parseBody(listSchema, request.query);
    const { page, limit } = parsePagination(request.query);
    response.json(await commentService.listByAgency(parseId(request.params.id), request.sellerId!, page, limit, answered === undefined ? undefined : answered === "true"));
  }

  // PATCH /comments/:id/reply (solo el dueño de la propiedad)
  async reply(request: Request, response: Response): Promise<void> {
    const { reply } = parseBody(replySchema, request.body);
    response.json(await commentService.reply(parseId(request.params.id), request.sellerId!, reply));
  }
}

export const commentController = new CommentController();

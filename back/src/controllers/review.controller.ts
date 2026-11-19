import type { Request, Response } from "express";
import { z } from "zod";
import { reviewService } from "../services/review.service";
import { parseBody } from "../validation/parse-body";
import { parseId } from "../validation/parse-id";
import { parsePagination } from "../validation/pagination";

const createReviewSchema = z.object({
  authorName: z.string("El nombre es obligatorio").trim().min(1, "El nombre es obligatorio").max(120),
  content: z.string("El contenido es obligatorio").trim().min(1, "El contenido es obligatorio").max(2000),
  rating: z.number("La calificación debe ser un número").int("La calificación debe ser un número entero").min(1, "La calificación mínima es 1").max(5, "La calificación máxima es 5"),
});

// Los metodos no usan `this`, asi que se pueden pasar directo al router.
class ReviewController {
  // POST /agencies/:id/reviews (publico)
  async create(request: Request, response: Response): Promise<void> {
    const input = parseBody(createReviewSchema, request.body);
    response.status(201).json(await reviewService.create(parseId(request.params.id), input));
  }

  // GET /agencies/:id/reviews (publico)
  async list(request: Request, response: Response): Promise<void> {
    const { page, limit } = parsePagination(request.query);
    response.json(await reviewService.listByAgency(parseId(request.params.id), page, limit));
  }
}

export const reviewController = new ReviewController();

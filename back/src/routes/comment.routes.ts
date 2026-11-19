import { Router } from "express";
import { commentController } from "../controllers/comment.controller";
import { requireAuth } from "../middlewares/require-auth";

export const commentRouter = Router();

commentRouter.patch("/:id/reply", requireAuth, commentController.reply); // solo el dueño de la propiedad

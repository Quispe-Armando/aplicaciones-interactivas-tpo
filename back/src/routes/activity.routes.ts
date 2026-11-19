import { Router } from "express";
import { activityController } from "../controllers/activity.controller";
import { requireAuth } from "../middlewares/require-auth";

export const activityRouter = Router();

activityRouter.patch("/:id/read", requireAuth, activityController.markAsRead); // solo el dueño

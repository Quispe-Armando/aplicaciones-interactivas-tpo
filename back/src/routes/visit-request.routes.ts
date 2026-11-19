import { Router } from "express";
import { visitRequestController } from "../controllers/visit-request.controller";
import { requireAuth } from "../middlewares/require-auth";

export const visitRequestRouter = Router();

visitRequestRouter.patch("/:id/status", requireAuth, visitRequestController.changeStatus); // solo el dueño

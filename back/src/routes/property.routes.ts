import { Router } from "express";
import { commentController } from "../controllers/comment.controller";
import { propertyController } from "../controllers/property.controller";
import { visitRequestController } from "../controllers/visit-request.controller";
import { requireAuth } from "../middlewares/require-auth";

export const propertyRouter = Router();

propertyRouter.get("/", propertyController.search); // publico
propertyRouter.get("/:id", propertyController.getById); // publico
propertyRouter.post("/", requireAuth, propertyController.create); // vendedor
propertyRouter.put("/:id", requireAuth, propertyController.update); // solo el dueño
propertyRouter.delete("/:id", requireAuth, propertyController.remove); // solo el dueño
propertyRouter.patch("/:id/status", requireAuth, propertyController.changeStatus); // solo el dueño
propertyRouter.get("/:id/status-history", requireAuth, propertyController.statusHistory); // solo el dueño
propertyRouter.get("/:id/comments", commentController.list); // publico
propertyRouter.post("/:id/comments", commentController.create); // publico, sin login
propertyRouter.post("/:id/visit-requests", visitRequestController.create); // publico, sin login

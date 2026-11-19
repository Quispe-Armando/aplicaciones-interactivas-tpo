import { Router } from "express";
import { agencyController } from "../controllers/agency.controller";
import { activityController } from "../controllers/activity.controller";
import { reportController } from "../controllers/report.controller";
import { reviewController } from "../controllers/review.controller";
import { propertyController } from "../controllers/property.controller";
import { commentController } from "../controllers/comment.controller";
import { visitRequestController } from "../controllers/visit-request.controller";
import { requireAuth } from "../middlewares/require-auth";

export const agencyRouter = Router();

// "/me/..." va antes que "/:id": si no, Express tomaria "me" como un id.
agencyRouter.get("/me/properties", requireAuth, propertyController.listMine); // todas las del vendedor, en cualquier estado
agencyRouter.get("/me/properties/:id", requireAuth, propertyController.getMine); // una propia, incluso en borrador
agencyRouter.get("/:id", agencyController.get); // publico
agencyRouter.get("/:id/properties", agencyController.listProperties); // publico
agencyRouter.put("/:id", requireAuth, agencyController.update); // solo el dueño
agencyRouter.delete("/:id", requireAuth, agencyController.remove); // solo el dueño
agencyRouter.get("/:id/visit-requests", requireAuth, visitRequestController.listByAgency); // solo el dueño (tiene datos de contacto)
agencyRouter.get("/:id/comments", requireAuth, commentController.listByAgency); // solo el dueño: las consultas de todas sus propiedades
agencyRouter.get("/:id/reviews", reviewController.list); // publico
agencyRouter.post("/:id/reviews", reviewController.create); // publico, sin login
agencyRouter.get("/:id/activity", requireAuth, activityController.list); // solo el dueño
agencyRouter.get("/:id/activity/unread-count", requireAuth, activityController.unreadCount); // solo el dueño
agencyRouter.get("/:id/reports/status-summary", requireAuth, reportController.statusSummary); // solo el dueño
agencyRouter.get("/:id/reports/monthly", requireAuth, reportController.monthly); // solo el dueño
agencyRouter.get("/:id/reports/avg-time-on-market", requireAuth, reportController.averageTimeOnMarket); // solo el dueño

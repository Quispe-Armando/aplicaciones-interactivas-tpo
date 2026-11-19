// Ver README.md de esta carpeta para la guía de cómo agregar un recurso nuevo.
import { Router } from "express";
import { agencyRouter } from "./agency.routes";
import { activityRouter } from "./activity.routes";
import { authRouter } from "./auth.routes";
import { visitRequestRouter } from "./visit-request.routes";
import { commentRouter } from "./comment.routes";
import { healthRouter } from "./health.routes";
import { propertyRouter } from "./property.routes";

export const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/agencies", agencyRouter);
router.use("/properties", propertyRouter);
router.use("/comments", commentRouter);
router.use("/visit-requests", visitRequestRouter);
router.use("/activity", activityRouter);

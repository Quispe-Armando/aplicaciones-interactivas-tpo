import type { Request, Response } from "express";
import { z } from "zod";
import { activityService } from "../services/activity.service";
import { parseBody } from "../validation/parse-body";
import { parseId } from "../validation/parse-id";
import { parsePagination } from "../validation/pagination";

// ?unread=true deja solo las no leidas.
const listSchema = z.object({
  unread: z.preprocess((value: unknown) => (value === "" ? undefined : value), z.enum(["true", "false"], { error: "unread debe ser true o false" }).optional()),
});

// Los metodos no usan `this`, asi que se pueden pasar directo al router.
class ActivityController {
  // GET /agencies/:id/activity (solo el dueño)
  async list(request: Request, response: Response): Promise<void> {
    const { unread } = parseBody(listSchema, request.query);
    const { page, limit } = parsePagination(request.query);
    response.json(await activityService.list(parseId(request.params.id), request.sellerId!, page, limit, unread === "true"));
  }

  // GET /agencies/:id/activity/unread-count (solo el dueño)
  async unreadCount(request: Request, response: Response): Promise<void> {
    response.json(await activityService.countUnread(parseId(request.params.id), request.sellerId!));
  }

  // PATCH /activity/:id/read (solo el dueño)
  async markAsRead(request: Request, response: Response): Promise<void> {
    response.json(await activityService.markAsRead(parseId(request.params.id), request.sellerId!));
  }
}

export const activityController = new ActivityController();
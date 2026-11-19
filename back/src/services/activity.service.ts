import { EntityManager } from "typeorm";
import { Activity } from "../entities/activity.entity";
import { Agency } from "../entities/agency.entity";
import { ActivityType } from "../entities/enums";
import { HttpError } from "../errors/http-error";
import { assertAgencyOwner } from "./agency-access";
import { activityRepository } from "../repositories/activity.repository";

export interface ActivityView {
  id: number;
  type: ActivityType;
  sourceId: number;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface RegisterActivityInput {
  type: ActivityType;
  sourceId: number; // id de la fila que origino el evento (ver Activity)
  agency: Agency;
  message: string;
}

function toView(activity: Activity): ActivityView {
  return { id: activity.id, type: activity.type, sourceId: activity.sourceId, message: activity.message, isRead: activity.isRead, createdAt: activity.createdAt };
}

const MAX_MESSAGE_LENGTH = 255; // largo de la columna

class ActivityService {
  // UNICO punto por el que se genera una Activity. Los services de Comentarios, Visitas, Reseñas y Estados
  // lo llaman con el `manager` de SU transaccion: el evento y la notificacion se guardan juntos o ninguno
  // (decision de la Clase 9: llamada directa en vez de eventos, porque es un solo backend y una sola base).
  async register(manager: EntityManager, input: RegisterActivityInput): Promise<void> {
    const message = input.message.length > MAX_MESSAGE_LENGTH ? `${input.message.slice(0, MAX_MESSAGE_LENGTH - 1)}…` : input.message;
    await manager.save(manager.create(Activity, { type: input.type, sourceId: input.sourceId, agency: input.agency, message, isRead: false }));
  }

  // Feed del vendedor, lo mas reciente primero.
  async list(agencyId: number, sellerId: number, page: number, limit: number, onlyUnread: boolean) {
    await assertAgencyOwner(agencyId, sellerId);
    const { items, total } = await activityRepository.findByAgency(agencyId, page, limit, onlyUnread);
    return { items: items.map(toView), page, limit, total };
  }

  async countUnread(agencyId: number, sellerId: number): Promise<{ unread: number }> {
    await assertAgencyOwner(agencyId, sellerId);
    return { unread: await activityRepository.countUnreadByAgency(agencyId) };
  }

  // Marcar como leida. Si ya estaba leida no pasa nada (el resultado es el mismo).
  async markAsRead(activityId: number, sellerId: number): Promise<ActivityView> {
    const activity = await activityRepository.findByIdWithOwner(activityId);
    if (!activity) throw new HttpError(404, "Actividad no encontrada");
    if (activity.agency.seller.id !== sellerId) throw new HttpError(403, "La actividad es de otra inmobiliaria");

    if (!activity.isRead) {
      activity.isRead = true;
      await activityRepository.save(activity);
    }
    return toView(activity);
  }
}

export const activityService = new ActivityService();

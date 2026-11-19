import { Repository } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Activity } from "../entities/activity.entity";

class ActivityRepository {
  private get repository(): Repository<Activity> {
    return AppDataSource.getRepository(Activity);
  }

  // Con la inmobiliaria y su vendedor: para comprobar quien es el dueño (uso interno del service).
  findByIdWithOwner(id: number): Promise<Activity | null> {
    return this.repository.findOne({ where: { id }, relations: { agency: { seller: true } } });
  }

  // Feed de una inmobiliaria, lo mas reciente primero, paginado. onlyUnread deja solo las no leidas.
  async findByAgency(agencyId: number, page: number, limit: number, onlyUnread: boolean): Promise<{ items: Activity[]; total: number }> {
    const [items, total] = await this.repository.findAndCount({
      where: { agency: { id: agencyId }, ...(onlyUnread ? { isRead: false } : {}) },
      order: { createdAt: "DESC", id: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  // Para el contador (badge) de la navegacion.
  countUnreadByAgency(agencyId: number): Promise<number> {
    return this.repository.count({ where: { agency: { id: agencyId }, isRead: false } });
  }

  save(activity: Activity): Promise<Activity> {
    return this.repository.save(activity);
  }
}

export const activityRepository = new ActivityRepository();
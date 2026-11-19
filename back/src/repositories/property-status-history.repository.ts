import { In, Repository } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { PropertyStatus } from "../entities/enums";
import { PropertyStatusHistory } from "../entities/property-status-history.entity";

class PropertyStatusHistoryRepository {
  private get repository(): Repository<PropertyStatusHistory> {
    return AppDataSource.getRepository(PropertyStatusHistory);
  }

  // Historial de una propiedad, del cambio mas viejo al mas nuevo.
  findByProperty(propertyId: number): Promise<PropertyStatusHistory[]> {
    return this.repository.find({ where: { property: { id: propertyId } }, order: { createdAt: "ASC", id: "ASC" } });
  }

  // Cambios de estado de TODAS las propiedades de una inmobiliaria hacia alguno de esos estados,
  // del mas viejo al mas nuevo. Es la fuente de los reportes (no las fechas de la propiedad).
  findByAgencyAndStatuses(agencyId: number, statuses: PropertyStatus[]): Promise<PropertyStatusHistory[]> {
    return this.repository.find({
      where: { property: { agency: { id: agencyId } }, toStatus: In(statuses) },
      relations: { property: true },
      order: { createdAt: "ASC", id: "ASC" },
    });
  }
}

export const propertyStatusHistoryRepository = new PropertyStatusHistoryRepository();

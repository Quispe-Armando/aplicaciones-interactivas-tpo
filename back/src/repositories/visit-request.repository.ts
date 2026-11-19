import { Repository } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { VisitRequestStatus } from "../entities/enums";
import { VisitRequest } from "../entities/visit-request.entity";

class VisitRequestRepository {
  private get repository(): Repository<VisitRequest> {
    return AppDataSource.getRepository(VisitRequest);
  }
  // Soporta la regla "una propiedad con visita Confirmada pendiente no se edita ni se elimina".

  // Devuelve true si la propiedad tiene al menos una visita CONFIRMADA
  // con fecha futura pendiente de realizarse.
  // Lo usa property.service para bloquear la edicion de la propiedad.
  hasConfirmedByProperty(propertyId: number): Promise<boolean> {
    return this.repository.existsBy({
      property: { id: propertyId },
      status: VisitRequestStatus.CONFIRMED,
    });
  }

  // Con la propiedad, su inmobiliaria y el vendedor: para comprobar quien es el dueño (uso interno del service).
  findByIdWithOwner(id: number): Promise<VisitRequest | null> {
    return this.repository.findOne({ where: { id }, relations: { property: { agency: { seller: true } } } });
  }

  // Solicitudes recibidas por una inmobiliaria (de cualquiera de sus propiedades), las mas nuevas primero.
  async findByAgency(agencyId: number, page: number, limit: number, status?: VisitRequestStatus): Promise<{ items: VisitRequest[]; total: number }> {
    const [items, total] = await this.repository.findAndCount({
      where: { property: { agency: { id: agencyId } }, ...(status ? { status } : {}) },
      relations: { property: true },
      order: { createdAt: "DESC", id: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  create(data: Partial<VisitRequest>): VisitRequest {
    return this.repository.create(data);
  }

  save(visitRequest: VisitRequest): Promise<VisitRequest> {
    return this.repository.save(visitRequest);
  }
}

export const visitRequestRepository = new VisitRequestRepository();
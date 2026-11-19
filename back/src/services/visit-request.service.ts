import { runInTransaction } from "../config/transaction";
import { ActivityType, PropertyStatus, VisitRequestStatus } from "../entities/enums";
import { VisitRequest } from "../entities/visit-request.entity";
import { HttpError } from "../errors/http-error";
import { agencyRepository } from "../repositories/agency.repository";
import { propertyRepository } from "../repositories/property.repository";
import { visitRequestRepository } from "../repositories/visit-request.repository";
import { activityService } from "./activity.service";
import { assertValidVisitTransition } from "./visit-request-transitions";

// Estados de la propiedad que admiten pedidos de visita nuevos.
const VISITABLE_STATUSES = [PropertyStatus.PUBLISHED];

// Lo que se le devuelve al cliente. Incluye el contacto de quien pidio la visita,
// por eso solo lo ve el vendedor dueño (los endpoints de lectura son protegidos).
export interface VisitRequestView {
  id: number;
  requesterName: string;
  requesterPhone: string;
  proposedAt: Date;
  message: string | null;
  status: VisitRequestStatus;
  createdAt: Date;
  property?: { id: number; title: string };
}

function toView(visit: VisitRequest): VisitRequestView {
  return {
    id: visit.id,
    requesterName: visit.requesterName,
    requesterPhone: visit.requesterPhone,
    proposedAt: visit.proposedAt,
    message: visit.message,
    status: visit.status,
    createdAt: visit.createdAt,
    ...(visit.property ? { property: { id: visit.property.id, title: visit.property.title } } : {}),
  };
}

export interface CreateVisitInput {
  requesterName: string;
  requesterPhone: string;
  proposedAt: Date;
  message: string | null;
}

class VisitRequestService {
  // El interesado pide la visita sin loguearse. Nace siempre en PENDIENTE.
  async create(propertyId: number, input: CreateVisitInput): Promise<VisitRequestView> {
    const property = await propertyRepository.findByIdWithAgency(propertyId);
    // Un borrador todavia no es publico: para el interesado "no existe".
    if (!property || property.status === PropertyStatus.DRAFT) throw new HttpError(404, "Propiedad no encontrada");
    if (!VISITABLE_STATUSES.includes(property.status)) {
      throw new HttpError(409, "La propiedad no admite solicitudes de visita en este momento");
    }

    // La solicitud y la notificacion para el vendedor se guardan juntas (misma transaccion).
    return runInTransaction(async (manager) => {
      const visit = await manager.save(manager.create(VisitRequest, { ...input, status: VisitRequestStatus.PENDING, property }));
      await activityService.register(manager, {
        type: ActivityType.VISIT_REQUEST,
        sourceId: visit.id,
        agency: property.agency,
        message: `Nueva solicitud de visita de ${input.requesterName} para "${property.title}"`,
      });
      return toView(visit);
    });
  }

  // Confirmar / rechazar / cancelar / marcar realizada. Solo el dueño de la propiedad.
  async changeStatus(visitId: number, sellerId: number, newStatus: VisitRequestStatus): Promise<VisitRequestView> {
    const visit = await visitRequestRepository.findByIdWithOwner(visitId);
    if (!visit) throw new HttpError(404, "Solicitud de visita no encontrada");
    if (visit.property.agency.seller.id !== sellerId) throw new HttpError(403, "La solicitud es de una propiedad de otra inmobiliaria");

    assertValidVisitTransition(visit.status, newStatus);

    visit.status = newStatus;
    return toView(await visitRequestRepository.save(visit));
  }

  // Solicitudes recibidas por la inmobiliaria, con datos de contacto. Solo su dueño.
  async listByAgency(agencyId: number, sellerId: number, page: number, limit: number, status?: VisitRequestStatus) {
    const agency = await agencyRepository.findByIdWithSeller(agencyId);
    if (!agency) throw new HttpError(404, "Inmobiliaria no encontrada");
    if (agency.seller.id !== sellerId) throw new HttpError(403, "La inmobiliaria es de otro vendedor");

    const { items, total } = await visitRequestRepository.findByAgency(agency.id, page, limit, status);
    return { items: items.map(toView), page, limit, total };
  }
}

export const visitRequestService = new VisitRequestService();

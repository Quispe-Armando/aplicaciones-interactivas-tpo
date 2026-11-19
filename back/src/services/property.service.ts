import { runInTransaction } from "../config/transaction";
import { ActivityType, OperationType, PropertyStatus, PropertyType } from "../entities/enums";
import { Property, PropertyImage } from "../entities/property.entity";
import { PropertyStatusHistory } from "../entities/property-status-history.entity";
import { HttpError } from "../errors/http-error";
import { agencyRepository } from "../repositories/agency.repository";
import { PropertyFilters, propertyRepository } from "../repositories/property.repository";
import { propertyStatusHistoryRepository } from "../repositories/property-status-history.repository";
import { visitRequestRepository } from "../repositories/visit-request.repository";
import { activityService } from "./activity.service";
import { PROPERTY_STATUS_LABEL } from "./status-labels";
import { assertValidTransition } from "./property-transitions";
import { PropertyView, toPropertyView } from "./property.view";

// Estados desde los que ya no se editan los datos principales (tpo.md § Propiedad, ciclo de vida).
const NON_EDITABLE_STATUSES = [PropertyStatus.SOLD, PropertyStatus.RENTED, PropertyStatus.CANCELLED];

// Datos editables de una propiedad (lo mismo para crear y para el PUT). El estado NO esta: cambia por la maquina de estados.
export interface PropertyInput {
  title: string;
  description: string;
  type: PropertyType;
  operation: OperationType;
  price: number;
  currency: "ARS" | "USD";
  address: string;
  area: string;
  coveredAreaM2: number | null;
  totalAreaM2: number;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  ageYears: number | null;
  tags: string[];
  images: PropertyImage[];
}

export interface StatusHistoryEntry {
  id: number;
  fromStatus: PropertyStatus | null;
  toStatus: PropertyStatus;
  changedAt: Date;
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

// Los decimales de Postgres se manejan como texto en la entidad.
function toColumns(input: PropertyInput): Partial<Property> {
  return {
    ...input,
    price: String(input.price),
    coveredAreaM2: input.coveredAreaM2 === null ? null : String(input.coveredAreaM2),
    totalAreaM2: String(input.totalAreaM2),
  };
}

class PropertyService {
  // Toda propiedad nueva arranca en BORRADOR, sin importar lo que mande el cliente.
  // La propiedad y el primer registro del historial (sin estado anterior) se guardan juntos.
  async create(sellerId: number, input: PropertyInput): Promise<PropertyView> {
    const agency = await agencyRepository.findBySellerId(sellerId);
    if (!agency) throw new HttpError(403, "El vendedor no tiene inmobiliaria");

    return runInTransaction(async (manager) => {
      const property = await manager.save(manager.create(Property, { ...toColumns(input), status: PropertyStatus.DRAFT, publishedAt: null, agency }));
      await manager.save(manager.create(PropertyStatusHistory, { property, fromStatus: null, toStatus: PropertyStatus.DRAFT }));
      return toPropertyView(property);
    });
  }

  // Detalle publico. Los borradores no se ven: para el publico "todavia no existen".
  async getPublic(id: number): Promise<PropertyView> {
    const property = await propertyRepository.findByIdWithAgency(id);
    if (!property || property.status === PropertyStatus.DRAFT) throw new HttpError(404, "Propiedad no encontrada");
    return toPropertyView(property);
  }

  async update(id: number, sellerId: number, input: PropertyInput): Promise<PropertyView> {
    const property = await this.assertOwner(id, sellerId);

    if (NON_EDITABLE_STATUSES.includes(property.status)) {
      throw new HttpError(409, "No se puede editar una propiedad vendida, alquilada o cancelada");
    }
    if (await visitRequestRepository.hasConfirmedByProperty(property.id)) {
      throw new HttpError(409, "No se puede editar una propiedad con una visita confirmada pendiente");
    }

    Object.assign(property, toColumns(input));
    const saved = await propertyRepository.save(property);
    return toPropertyView(saved);
  }

  // Solo se elimina un borrador. Una propiedad que ya se publico se da de baja cancelandola (asi queda el historial).
  async remove(id: number, sellerId: number): Promise<void> {
    const property = await this.assertOwner(id, sellerId);

    if (property.status !== PropertyStatus.DRAFT) {
      throw new HttpError(409, "Solo se puede eliminar una propiedad en borrador. Si ya fue publicada, cancelala.");
    }
    await propertyRepository.deleteById(property.id);
  }

  // Cambia el estado validando la transicion. El cambio de estado y su registro en el historial
  // (y su aviso en el feed) se guardan en una transaccion: o queda todo, o nada.
  async changeStatus(id: number, sellerId: number, newStatus: PropertyStatus): Promise<PropertyView> {
    const property = await this.assertOwner(id, sellerId);
    const previousStatus = property.status;

    assertValidTransition(previousStatus, newStatus, property.operation);

    // Una propiedad con visita confirmada pendiente no se puede dar de baja (los demas cambios si).
    if (newStatus === PropertyStatus.CANCELLED && (await visitRequestRepository.hasConfirmedByProperty(property.id))) {
      throw new HttpError(409, "No se puede cancelar una propiedad con una visita confirmada pendiente");
    }

    property.status = newStatus;
    // La fecha de publicacion es la de la PRIMERA vez que se publico: pausar y republicar no la cambia.
    if (newStatus === PropertyStatus.PUBLISHED && property.publishedAt === null) {
      property.publishedAt = new Date();
    }

    return runInTransaction(async (manager) => {
      const saved = await manager.save(property);
      // Siempre se agrega un registro nuevo: el historial nunca se modifica.
      const history = await manager.save(manager.create(PropertyStatusHistory, { property: saved, fromStatus: previousStatus, toStatus: newStatus }));
      // Y se avisa en el feed del vendedor (misma transaccion).
      await activityService.register(manager, {
        type: ActivityType.PROPERTY_STATUS_CHANGE,
        sourceId: history.id,
        agency: property.agency,
        message: `"${property.title}" pasó de ${PROPERTY_STATUS_LABEL[previousStatus]} a ${PROPERTY_STATUS_LABEL[newStatus]}`,
      });
      return toPropertyView(saved);
    });
  }

  // Historial de cambios de estado, en orden cronologico. Solo lo ve el dueño.
  async getStatusHistory(id: number, sellerId: number): Promise<StatusHistoryEntry[]> {
    const property = await this.assertOwner(id, sellerId);
    const entries = await propertyStatusHistoryRepository.findByProperty(property.id);
    return entries.map((entry) => ({ id: entry.id, fromStatus: entry.fromStatus, toStatus: entry.toStatus, changedAt: entry.createdAt }));
  }

  async search(filters: PropertyFilters, page: number, limit: number): Promise<Page<PropertyView>> {
    const { items, total } = await propertyRepository.search(filters, page, limit);
    return { items: items.map(toPropertyView), page, limit, total };
  }

  // "Mis propiedades": todas las de la inmobiliaria del token, en cualquier estado.
  async listMine(sellerId: number, page: number, limit: number, status?: PropertyStatus): Promise<Page<PropertyView>> {
    const agency = await agencyRepository.findBySellerId(sellerId);
    if (!agency) throw new HttpError(403, "El vendedor no tiene inmobiliaria");
    const { items, total } = await propertyRepository.findAllByAgency(agency.id, page, limit, status);
    return { items: items.map(toPropertyView), page, limit, total };
  }

  // Una propiedad propia, en cualquier estado (el detalle publico no muestra borradores; el formulario de edicion los necesita).
  async getMine(id: number, sellerId: number): Promise<PropertyView> {
    return toPropertyView(await this.assertOwner(id, sellerId));
  }


  // 404 si no existe, 403 si es de otra inmobiliaria (mismo criterio que assertOwner de Clase 9).
  private async assertOwner(id: number, sellerId: number): Promise<Property> {
    const property = await propertyRepository.findByIdWithOwner(id);
    if (!property) throw new HttpError(404, "Propiedad no encontrada");
    if (property.agency.seller.id !== sellerId) throw new HttpError(403, "La propiedad es de otra inmobiliaria");
    return property;
  }
}

export const propertyService = new PropertyService();

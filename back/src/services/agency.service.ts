import { QueryFailedError } from "typeorm";
import { Agency } from "../entities/agency.entity";
import { PropertyStatus } from "../entities/enums";
import { HttpError } from "../errors/http-error";
import { agencyRepository } from "../repositories/agency.repository";
import { propertyRepository } from "../repositories/property.repository";
import { reviewService, RatingSummary } from "./review.service";
import { sellerRepository } from "../repositories/seller.repository";
import { PropertyView, toPropertyView } from "./property.view";

const PG_UNIQUE_VIOLATION = "23505";

// Estados que impiden eliminar la inmobiliaria.
const BLOCKING_STATUSES = [PropertyStatus.PUBLISHED, PropertyStatus.RESERVED];

export interface UpdateAgencyInput {
  name: string;
  description: string;
  logoUrl: string | null;
  contactPhone: string;
  contactEmail: string;
  officeAddress: string | null;
}

// Perfil publico: nunca incluye datos del vendedor (email, password).
export interface AgencyProfile {
  id: number;
  name: string;
  description: string;
  logoUrl: string | null;
  contactPhone: string;
  contactEmail: string;
  officeAddress: string | null;
  createdAt: Date;
  rating: RatingSummary; // promedio y cantidad de reseñas
}

function toProfile(agency: Agency, rating: RatingSummary): AgencyProfile {
  return {
    id: agency.id,
    name: agency.name,
    description: agency.description,
    logoUrl: agency.logoUrl,
    contactPhone: agency.contactPhone,
    contactEmail: agency.contactEmail,
    officeAddress: agency.officeAddress,
    createdAt: agency.createdAt,
    rating,
  };
}

class AgencyService {
  async getProfile(id: number): Promise<AgencyProfile> {
    const agency = await agencyRepository.findById(id);
    if (!agency) throw new HttpError(404, "Inmobiliaria no encontrada");
    return toProfile(agency, await reviewService.getSummary(agency.id));
  }

  async update(id: number, sellerId: number, input: UpdateAgencyInput): Promise<AgencyProfile> {
    const agency = await this.assertOwner(id, sellerId);

    if (await agencyRepository.existsByNameExcluding(input.name, agency.id)) {
      throw new HttpError(409, "El nombre de fantasía ya existe", [{ field: "name", message: "El nombre de fantasía ya existe" }]);
    }

    Object.assign(agency, input);
    try {
      const saved = await agencyRepository.save(agency);
      return toProfile(saved, await reviewService.getSummary(saved.id));
    } catch (error) {
      // Dos ediciones simultaneas pueden pasar el chequeo de arriba; la base las frena igual.
      if (error instanceof QueryFailedError && (error.driverError as { code?: string } | undefined)?.code === PG_UNIQUE_VIOLATION) {
        throw new HttpError(409, "El nombre de fantasía ya existe", [{ field: "name", message: "El nombre de fantasía ya existe" }]);
      }
      throw error;
    }
  }

  // Elimina la inmobiliaria borrando a su vendedor: la base borra en cascada
  // la inmobiliaria y todo lo que cuelga de ella (propiedades, reseñas, actividad...).
  async remove(id: number, sellerId: number): Promise<void> {
    const agency = await this.assertOwner(id, sellerId);

    const blocking = await propertyRepository.countByAgencyAndStatuses(agency.id, BLOCKING_STATUSES);
    if (blocking > 0) {
      throw new HttpError(
        409,
        `No se puede eliminar la inmobiliaria: tiene ${blocking} propiedad(es) publicada(s) o reservada(s). Pausalas o cancelalas primero.`,
      );
    }

    await sellerRepository.deleteById(sellerId);
  }

  async listPublishedProperties(id: number, page: number, limit: number): Promise<{ items: PropertyView[]; page: number; limit: number; total: number }> {
    if (!(await agencyRepository.findById(id))) throw new HttpError(404, "Inmobiliaria no encontrada");
    const { items, total } = await propertyRepository.findPublishedByAgency(id, page, limit);
    return { items: items.map(toPropertyView), page, limit, total };
  }

  // 404 si no existe, 403 si es de otro vendedor (mismo criterio que assertOwner de Clase 9).
  private async assertOwner(id: number, sellerId: number): Promise<Agency> {
    const agency = await agencyRepository.findByIdWithSeller(id);
    if (!agency) throw new HttpError(404, "Inmobiliaria no encontrada");
    if (agency.seller.id !== sellerId) throw new HttpError(403, "La inmobiliaria es de otro vendedor");
    return agency;
  }
}

export const agencyService = new AgencyService();

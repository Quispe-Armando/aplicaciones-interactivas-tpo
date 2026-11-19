import { Repository } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Agency } from "../entities/agency.entity";

class AgencyRepository {
  private get repository(): Repository<Agency> {
    return AppDataSource.getRepository(Agency);
  }

  findById(id: number): Promise<Agency | null> {
    return this.repository.findOneBy({ id });
  }

  // Incluye el vendedor para poder comprobar quien es el dueño (solo uso interno del service).
  findByIdWithSeller(id: number): Promise<Agency | null> {
    return this.repository.findOne({ where: { id }, relations: { seller: true } });
  }

  save(agency: Agency): Promise<Agency> {
    return this.repository.save(agency);
  }

  // Soporta "el nombre es unico" al editar: ignora a la propia inmobiliaria.
  async existsByNameExcluding(name: string, excludeId: number): Promise<boolean> {
    const other = await this.repository.findOneBy({ name });
    return other !== null && other.id !== excludeId;
  }

  // La inmobiliaria de un vendedor (relacion 1-1, la clave esta en agencies.seller_id).
  findBySellerId(sellerId: number): Promise<Agency | null> {
    return this.repository.findOne({ where: { seller: { id: sellerId } } });
  }

  // Soporta la regla "el nombre de fantasia es unico". La decision (409) es del service.
  existsByName(name: string): Promise<boolean> {
    return this.repository.existsBy({ name });
  }
}

export const agencyRepository = new AgencyRepository();

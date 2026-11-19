import { In, Repository } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { OperationType, PropertyStatus, PropertyType } from "../entities/enums";
import { Property } from "../entities/property.entity";

export interface PropertyFilters {
  type?: PropertyType;
  operation?: OperationType;
  currency?: "ARS" | "USD";
  minPrice?: number;
  maxPrice?: number;
  area?: string;
  rooms?: number;
  amenities?: string[];
  q?: string;
  sort: "price" | "publishedAt" | "totalArea";
  order: "asc" | "desc";
}

// Columna de la entidad por cada criterio de orden permitido (lista cerrada: nunca se usa texto del cliente).
const SORT_COLUMNS = { price: "p.price", publishedAt: "p.publishedAt", totalArea: "p.totalAreaM2" } as const;

// Escapa % y _ para que el texto del usuario se busque literalmente dentro de un LIKE.
const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (char) => `\\${char}`);

class PropertyRepository {
  private get repository(): Repository<Property> {
    return AppDataSource.getRepository(Property);
  }

  findById(id: number): Promise<Property | null> {
    return this.repository.findOneBy({ id });
  }

  // Con la inmobiliaria y su vendedor: para comprobar quien es el dueño (uso interno del service).
  findByIdWithOwner(id: number): Promise<Property | null> {
    return this.repository.findOne({ where: { id }, relations: { agency: { seller: true } } });
  }

  // Con la inmobiliaria (sin vendedor): para el detalle publico.
  findByIdWithAgency(id: number): Promise<Property | null> {
    return this.repository.findOne({ where: { id }, relations: { agency: true } });
  }

  // Sirve tanto para crear como para actualizar.
  save(property: Property): Promise<Property> {
    return this.repository.save(property);
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete({ id });
  }

  create(data: Partial<Property>): Property {
    return this.repository.create(data);
  }

  // Cuantas propiedades de la inmobiliaria estan en alguno de esos estados.
  // Soporta la regla "no se elimina una inmobiliaria con propiedades publicadas o reservadas".
  countByAgencyAndStatuses(agencyId: number, statuses: PropertyStatus[]): Promise<number> {
    return this.repository.count({ where: { agency: { id: agencyId }, status: In(statuses) } });
  }

  // Cantidad de propiedades por estado actual (agregacion con groupBy, como en Clase 4 · 08-query-builder).
  // Solo devuelve los estados que tienen al menos una propiedad.
  async countByStatusForAgency(agencyId: number): Promise<{ status: PropertyStatus; count: number }[]> {
    const rows = await this.repository
      .createQueryBuilder("p")
      .innerJoin("p.agency", "a")
      .select("p.status", "status")
      .addSelect("COUNT(p.id)", "count")
      .where("a.id = :agencyId", { agencyId })
      .groupBy("p.status")
      .getRawMany<{ status: PropertyStatus; count: string }>();
    // Postgres devuelve COUNT como texto: se pasa a numero.
    return rows.map((row) => ({ status: row.status, count: Number(row.count) }));
  }

  // Propiedades publicadas de una inmobiliaria, paginadas (page empieza en 1).
  // Devuelve la pagina y el total SIN paginar (patron findAndCount de Clase 6).
  async findPublishedByAgency(agencyId: number, page: number, limit: number): Promise<{ items: Property[]; total: number }> {
    const [items, total] = await this.repository.findAndCount({
      where: { agency: { id: agencyId }, status: PropertyStatus.PUBLISHED },
      order: { publishedAt: "DESC", id: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  // Todas las propiedades de una inmobiliaria en cualquier estado (para "Mis propiedades").
  async findAllByAgency(agencyId: number, page: number, limit: number, status?: PropertyStatus): Promise<{ items: Property[]; total: number }> {
    const [items, total] = await this.repository.findAndCount({
      where: { agency: { id: agencyId }, ...(status ? { status } : {}) },
      order: { createdAt: "DESC", id: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  // Listado publico: solo PUBLISHED, con filtros combinables (QueryBuilder, como en Clase 7).
  async search(filters: PropertyFilters, page: number, limit: number): Promise<{ items: Property[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.agency", "a")
      .where("p.status = :status", { status: PropertyStatus.PUBLISHED });

    if (filters.type) qb.andWhere("p.type = :type", { type: filters.type });
    if (filters.operation) qb.andWhere("p.operation = :operation", { operation: filters.operation });
    if (filters.currency) qb.andWhere("p.currency = :currency", { currency: filters.currency });
    if (filters.minPrice !== undefined) qb.andWhere("p.price >= :minPrice", { minPrice: filters.minPrice });
    if (filters.maxPrice !== undefined) qb.andWhere("p.price <= :maxPrice", { maxPrice: filters.maxPrice });
    if (filters.area) qb.andWhere("p.area ILIKE :area", { area: `%${escapeLike(filters.area)}%` });
    if (filters.rooms !== undefined) qb.andWhere("p.rooms = :rooms", { rooms: filters.rooms });
    if (filters.q) {
      qb.andWhere("(p.title ILIKE :q OR p.description ILIKE :q)", { q: `%${escapeLike(filters.q)}%` });
    }

    // Los tags se guardan como texto "pileta,cochera": se busca cada amenity entre comas
    // para que "pileta" no coincida con, por ejemplo, "pileta climatizada".
    (filters.amenities ?? []).forEach((amenity, index) => {
      qb.andWhere(`(',' || p.tags || ',') ILIKE :amenity${index}`, { [`amenity${index}`]: `%,${escapeLike(amenity)},%` });
    });

    const direction = filters.order === "asc" ? "ASC" : "DESC";
    qb.orderBy(SORT_COLUMNS[filters.sort], direction, "NULLS LAST").addOrderBy("p.id", "DESC");

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total };
  }
}

export const propertyRepository = new PropertyRepository();

import { Repository } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Review } from "../entities/review.entity";

class ReviewRepository {
  private get repository(): Repository<Review> {
    return AppDataSource.getRepository(Review);
  }

  create(data: Partial<Review>): Review {
    return this.repository.create(data);
  }

  save(review: Review): Promise<Review> {
    return this.repository.save(review);
  }

  // Reseñas de una inmobiliaria, las mas nuevas primero, paginadas (findAndCount, como en Clase 6).
  async findByAgency(agencyId: number, page: number, limit: number): Promise<{ items: Review[]; total: number }> {
    const [items, total] = await this.repository.findAndCount({
      where: { agency: { id: agencyId } },
      order: { createdAt: "DESC", id: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  countByAgency(agencyId: number): Promise<number> {
    return this.repository.count({ where: { agency: { id: agencyId } } });
  }

  // Promedio de calificaciones (null si todavia no tiene reseñas).
  averageRatingByAgency(agencyId: number): Promise<number | null> {
    return this.repository.average("rating", { agency: { id: agencyId } });
  }
}

export const reviewRepository = new ReviewRepository();

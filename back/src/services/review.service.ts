import { runInTransaction } from "../config/transaction";
import { ActivityType } from "../entities/enums";
import { Review } from "../entities/review.entity";
import { HttpError } from "../errors/http-error";
import { agencyRepository } from "../repositories/agency.repository";
import { reviewRepository } from "../repositories/review.repository";
import { activityService } from "./activity.service";

export interface ReviewView {
  id: number;
  authorName: string;
  content: string;
  rating: number;
  createdAt: Date;
}

// Resumen que se muestra en el perfil publico de la inmobiliaria.
export interface RatingSummary {
  average: number | null; // null si todavia no tiene reseñas
  count: number;
}

function toReviewView(review: Review): ReviewView {
  return { id: review.id, authorName: review.authorName, content: review.content, rating: review.rating, createdAt: review.createdAt };
}

class ReviewService {
  // Cualquier interesado puede reseñar, sin loguearse.
  async create(agencyId: number, input: { authorName: string; content: string; rating: number }): Promise<ReviewView> {
    const agency = await agencyRepository.findById(agencyId);
    if (!agency) throw new HttpError(404, "Inmobiliaria no encontrada");

    // La reseña y la notificacion para el vendedor se guardan juntas (misma transaccion).
    return runInTransaction(async (manager) => {
      const review = await manager.save(manager.create(Review, { ...input, agency }));
      await activityService.register(manager, {
        type: ActivityType.REVIEW,
        sourceId: review.id,
        agency,
        message: `Nueva reseña de ${input.authorName}: ${input.rating}/5`,
      });
      return toReviewView(review);
    });
  }

  async listByAgency(agencyId: number, page: number, limit: number) {
    if (!(await agencyRepository.findById(agencyId))) throw new HttpError(404, "Inmobiliaria no encontrada");

    const { items, total } = await reviewRepository.findByAgency(agencyId, page, limit);
    return { items: items.map(toReviewView), page, limit, total, rating: await this.getSummary(agencyId) };
  }

  // Promedio con un decimal (4.3) y cantidad de reseñas.
  async getSummary(agencyId: number): Promise<RatingSummary> {
    const [average, count] = await Promise.all([reviewRepository.averageRatingByAgency(agencyId), reviewRepository.countByAgency(agencyId)]);
    return { average: average === null ? null : Math.round(Number(average) * 10) / 10, count };
  }
}

export const reviewService = new ReviewService();

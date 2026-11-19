import { request } from "../api/client";
import type { Review, ReviewInput } from "../api/types";

export const reviewsService = {
  // Publico: el interesado no se loguea.
  create: (agencyId: number, input: ReviewInput) => request<Review>(`/agencies/${agencyId}/reviews`, { method: "POST", body: input, auth: false }),
};

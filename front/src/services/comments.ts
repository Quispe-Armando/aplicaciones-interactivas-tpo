import { request } from "../api/client";
import type { Comment, CommentInput } from "../api/types";

export const commentsService = {
  // Publico: el interesado no se loguea.
  create: (propertyId: number, input: CommentInput) =>
    request<Comment>(`/properties/${propertyId}/comments`, { method: "POST", body: input, auth: false }),

  // Solo el dueño de la propiedad. Una sola respuesta por comentario (la segunda da 409).
  reply: (commentId: number, reply: string) => request<Comment>(`/comments/${commentId}/reply`, { method: "PATCH", body: { reply } }),
};

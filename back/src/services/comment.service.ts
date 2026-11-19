import { runInTransaction } from "../config/transaction";
import { ActivityType, PropertyStatus } from "../entities/enums";
import { Comment } from "../entities/comment.entity";
import { Property } from "../entities/property.entity";
import { HttpError } from "../errors/http-error";
import { commentRepository } from "../repositories/comment.repository";
import { agencyRepository } from "../repositories/agency.repository";
import { propertyRepository } from "../repositories/property.repository";
import { activityService } from "./activity.service";

// Lo que se le devuelve al cliente: nunca incluye la propiedad ni su vendedor.
export interface CommentView {
  id: number;
  authorName: string;
  content: string;
  reply: string | null;
  createdAt: Date;
}

// Para el panel del vendedor: ademas dice en que propiedad se hizo la consulta.
export interface ReceivedCommentView extends CommentView {
  property: { id: number; title: string };
}

function toCommentView(comment: Comment): CommentView {
  return { id: comment.id, authorName: comment.authorName, content: comment.content, reply: comment.reply, createdAt: comment.createdAt };
}

class CommentService {
  // Los borradores todavia no son publicos: para el interesado "no existen" (404).
  // Una propiedad vendida, alquilada o cancelada sigue admitiendo comentarios (tpo.md).
  private async getVisibleProperty(propertyId: number): Promise<Property> {
    const property = await propertyRepository.findByIdWithAgency(propertyId);
    if (!property || property.status === PropertyStatus.DRAFT) throw new HttpError(404, "Propiedad no encontrada");
    return property;
  }

  async create(propertyId: number, input: { authorName: string; content: string }): Promise<CommentView> {
    const property = await this.getVisibleProperty(propertyId);
    // El comentario y la notificacion para el vendedor se guardan juntos (misma transaccion).
    return runInTransaction(async (manager) => {
      const comment = await manager.save(manager.create(Comment, { authorName: input.authorName, content: input.content, reply: null, property }));
      await activityService.register(manager, {
        type: ActivityType.COMMENT,
        sourceId: comment.id,
        agency: property.agency,
        message: `Nueva consulta de ${input.authorName} en "${property.title}"`,
      });
      return toCommentView(comment);
    });
  }

  async listByProperty(propertyId: number): Promise<CommentView[]> {
    const property = await this.getVisibleProperty(propertyId);
    return (await commentRepository.findByProperty(property.id)).map(toCommentView);
  }

  // Consultas recibidas por la inmobiliaria, de todas sus propiedades. Solo su dueño.
  async listByAgency(agencyId: number, sellerId: number, page: number, limit: number, answered?: boolean) {
    const agency = await agencyRepository.findByIdWithSeller(agencyId);
    if (!agency) throw new HttpError(404, "Inmobiliaria no encontrada");
    if (agency.seller.id !== sellerId) throw new HttpError(403, "La inmobiliaria es de otro vendedor");

    const { items, total } = await commentRepository.findByAgency(agency.id, page, limit, answered);
    const views: ReceivedCommentView[] = items.map((comment) => ({ ...toCommentView(comment), property: { id: comment.property.id, title: comment.property.title } }));
    return { items: views, page, limit, total };
  }

  // La respuesta se guarda en el mismo comentario (un solo nivel, sin hilos) y se da una sola vez.
  async reply(commentId: number, sellerId: number, reply: string): Promise<CommentView> {
    const comment = await commentRepository.findByIdWithOwner(commentId);
    if (!comment) throw new HttpError(404, "Comentario no encontrado");
    if (comment.property.agency.seller.id !== sellerId) throw new HttpError(403, "El comentario es de una propiedad de otra inmobiliaria");
    if (comment.reply !== null) throw new HttpError(409, "El comentario ya tiene una respuesta");

    comment.reply = reply;
    return toCommentView(await commentRepository.save(comment));
  }
}

export const commentService = new CommentService();

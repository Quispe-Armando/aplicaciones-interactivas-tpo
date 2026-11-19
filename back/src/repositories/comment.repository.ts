import { IsNull, Not, Repository } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Comment } from "../entities/comment.entity";

class CommentRepository {
  private get repository(): Repository<Comment> {
    return AppDataSource.getRepository(Comment);
  }

  // Con la propiedad, su inmobiliaria y el vendedor: para comprobar quien es el dueño (uso interno del service).
  findByIdWithOwner(id: number): Promise<Comment | null> {
    return this.repository.findOne({ where: { id }, relations: { property: { agency: { seller: true } } } });
  }

  // Comentarios de una propiedad, del mas viejo al mas nuevo.
  findByProperty(propertyId: number): Promise<Comment[]> {
    return this.repository.find({ where: { property: { id: propertyId } }, order: { createdAt: "ASC", id: "ASC" } });
  }

  // Consultas recibidas por TODAS las propiedades de una inmobiliaria (mas nuevas primero), con su propiedad.
  // answered: true = solo las respondidas, false = solo las pendientes, undefined = todas.
  async findByAgency(agencyId: number, page: number, limit: number, answered?: boolean): Promise<{ items: Comment[]; total: number }> {
    const [items, total] = await this.repository.findAndCount({
      where: { property: { agency: { id: agencyId } }, ...(answered === undefined ? {} : { reply: answered ? Not(IsNull()) : IsNull() }) },
      relations: { property: true },
      order: { createdAt: "DESC", id: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  create(data: Partial<Comment>): Comment {
    return this.repository.create(data);
  }

  save(comment: Comment): Promise<Comment> {
    return this.repository.save(comment);
  }
}

export const commentRepository = new CommentRepository();

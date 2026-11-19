import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Property } from "./property.entity";

// Consulta de un interesado sobre una propiedad. La respuesta del vendedor
// vive en la misma fila (un unico nivel, sin hilos).
@Entity("comments")
export class Comment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  authorName!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "text", nullable: true })
  reply!: string | null;

  @ManyToOne(() => Property, { nullable: false, onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn({ name: "property_id" })
  property!: Property;

  @CreateDateColumn()
  createdAt!: Date;
}

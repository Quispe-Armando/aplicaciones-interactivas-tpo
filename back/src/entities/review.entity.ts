import { Check, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Agency } from "./agency.entity";

// Reseña publica de un interesado sobre una inmobiliaria.
@Entity("reviews")
@Check(`"rating" >= 1 AND "rating" <= 5`)
export class Review {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  authorName!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "smallint" })
  rating!: number;

  @ManyToOne(() => Agency, { nullable: false, onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn({ name: "agency_id" })
  agency!: Agency;

  @CreateDateColumn()
  createdAt!: Date;
}
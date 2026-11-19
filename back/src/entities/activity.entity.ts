import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ActivityType } from "./enums";
import { Agency } from "./agency.entity";

// Evento del feed de novedades de una inmobiliaria.
//
// sourceId es el id de la fila que origino el evento, segun el tipo:
//   COMMENT                 -> comments.id
//   VISIT_REQUEST           -> visit_requests.id
//   REVIEW                  -> reviews.id
//   PROPERTY_STATUS_CHANGE  -> property_status_history.id
// No es una clave foranea porque apunta a tablas distintas segun el tipo.
//
// message guarda el texto que muestra el feed ("Nueva consulta en ..."), asi el
// listado no necesita unir cuatro tablas distintas.
@Entity("activities")
export class Activity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "enum", enum: ActivityType })
  type!: ActivityType;

  @Column({ type: "int" })
  sourceId!: number;

  @Column({ length: 255 })
  message!: string;

  @Column({ default: false })
  isRead!: boolean;

  @ManyToOne(() => Agency, { nullable: false, onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn({ name: "agency_id" })
  agency!: Agency;

  @CreateDateColumn()
  createdAt!: Date;
}

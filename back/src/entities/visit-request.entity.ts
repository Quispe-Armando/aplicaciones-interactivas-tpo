import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { VisitRequestStatus } from "./enums";
import { Property } from "./property.entity";

// Pedido de un interesado para conocer una propiedad en persona.
@Entity("visit_requests")
export class VisitRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  requesterName!: string;

  @Column({ length: 40 })
  requesterPhone!: string;

  // Fecha y hora propuesta. Que sea futura se valida en la API, no en la base.
  @Column({ type: "timestamp" })
  proposedAt!: Date;

  @Column({ type: "text", nullable: true })
  message!: string | null;

  @Column({ type: "enum", enum: VisitRequestStatus, default: VisitRequestStatus.PENDING })
  status!: VisitRequestStatus;

  @ManyToOne(() => Property, { nullable: false, onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn({ name: "property_id" })
  property!: Property;

  @CreateDateColumn()
  createdAt!: Date;
}
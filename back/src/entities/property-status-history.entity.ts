import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Property } from "./property.entity";
import { PropertyStatus } from "./enums";

@Entity("property_status_history")
export class PropertyStatusHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  //null en el primer registro: la creaión de la propiedad  (no hay estado anterior).
  @Column({ type: "enum", enum: PropertyStatus, nullable: true })
  fromStatus!: PropertyStatus | null;

  @Column({ type: "enum", enum: PropertyStatus })
  toStatus!: PropertyStatus;

  @ManyToOne(() => Property, { nullable: false, onDelete: "CASCADE", onUpdate: "CASCADE" }) // se añadio onUpdate: "CASCADE"
  @JoinColumn({ name: "property_id" })
  property!: Property;

  @CreateDateColumn()
  createdAt!: Date;
}

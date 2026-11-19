import { Check, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Agency } from "./agency.entity";
import { OperationType, PropertyStatus, PropertyType } from "./enums";
import { check } from "zod";

// Una foto de la galeria. El orden de las fotos es el orden del arreglo y
// exactamente una tiene isCover = true (la validacion vive en el servicio).
export interface PropertyImage {
  url: string;
  isCover: boolean;
}

@Entity("properties")
@Check(`"price" > 0`)
@Check(`"totalAreaM2" > 0`)
@Check(`"coveredAreaM2" IS NULL OR "coveredAreaM2" > 0`)
export class Property {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 160 })
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "enum", enum: PropertyType })
  type!: PropertyType;

  @Column({ type: "enum", enum: OperationType })
  operation!: OperationType;

  @Column({ type: "decimal", precision: 14, scale: 2 })
  price!: string;

  @Column({ type: "varchar", length: 3 })
  currency!: "ARS" | "USD";

  @Column({ length: 255 })
  address!: string;

  @Column({ length: 120 })
  area!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  coveredAreaM2!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  totalAreaM2!: string;

  @Column({ type: "smallint", nullable: true })
  rooms!: number | null;

  @Column({ type: "smallint", nullable: true })
  bedrooms!: number | null;

  @Column({ type: "smallint", nullable: true })
  bathrooms!: number | null;

  @Column({ type: "smallint", nullable: true })
  ageYears!: number | null;

  @Column({ type: "simple-array", default: "" })
  tags!: string[];

  @Column({ type: "enum", enum: PropertyStatus, default: PropertyStatus.DRAFT })
  status!: PropertyStatus;

    // Galeria de fotos (minimo una, con portada), guardada como JSON embebido.
  @Column({ type: "jsonb", default: () => "'[]'" })
  images!: PropertyImage[];

  // Primera vez que paso a PUBLISHED. Sirve para ordenar por fecha de publicacion.
  @Column({ type: "timestamp", nullable: true })
  publishedAt!: Date | null;

  @ManyToOne(() => Agency, { nullable: false,
  onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn({ name: "agency_id" })
  agency!: Agency;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

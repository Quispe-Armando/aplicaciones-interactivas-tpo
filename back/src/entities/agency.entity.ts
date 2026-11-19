import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Seller } from "./seller.entity";

@Entity("agencies")
export class Agency {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 120 })
  name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "varchar", nullable: true, length: 500 })
  logoUrl!: string | null;

  @Column({ length: 40 })
  contactPhone!: string;

  @Column({ length: 255 })
  contactEmail!: string;

  @Column({ type: "varchar", nullable: true, length: 255 })
  officeAddress!: string | null;
/*
  @OneToOne(() => Seller, { nullable: false })
  @JoinColumn({ name: "seller_id" })
  seller!: Seller;
*/
  // Si se elimina el Seller, se elimina su Agency (y, en cascada, todo lo que
  // cuelga de ella). El servicio de "eliminar inmobiliaria" borra al Seller.
  @OneToOne(() => Seller, { nullable: false, onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn({ name: "seller_id" })
  seller!: Seller; 

  @CreateDateColumn()
  createdAt!: Date;
}

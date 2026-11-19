import { Repository } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Seller } from "../entities/seller.entity";

class SellerRepository {
  private get repository(): Repository<Seller> {
    return AppDataSource.getRepository(Seller);
  }

  findById(id: number): Promise<Seller | null> {
    return this.repository.findOneBy({ id });
  }

  findByEmail(email: string): Promise<Seller | null> {
    return this.repository.findOneBy({ email });
  }

  // Soporta la regla "el email es unico". La decision (409) es del service.
  existsByEmail(email: string): Promise<boolean> {
    return this.repository.existsBy({ email });
  }

  // Borra al vendedor; la base elimina en cascada su inmobiliaria y todo lo que cuelga de ella.
  async deleteById(id: number): Promise<void> {
    await this.repository.delete({ id });
  }
}

export const sellerRepository = new SellerRepository();

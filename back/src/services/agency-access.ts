import { HttpError } from "../errors/http-error";
import { agencyRepository } from "../repositories/agency.repository";

// Regla comun de los endpoints "de la inmobiliaria" (feed, reportes): 404 si la inmobiliaria
// no existe, 403 si es de otro vendedor. El id de la URL no prueba nada: lo dice el token (Clase 9).
export async function assertAgencyOwner(agencyId: number, sellerId: number): Promise<void> {
  const agency = await agencyRepository.findByIdWithSeller(agencyId);
  if (!agency) throw new HttpError(404, "Inmobiliaria no encontrada");
  if (agency.seller.id !== sellerId) throw new HttpError(403, "La inmobiliaria es de otro vendedor");
}

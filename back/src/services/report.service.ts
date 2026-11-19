import { PropertyStatus } from "../entities/enums";
import { propertyRepository } from "../repositories/property.repository";
import { propertyStatusHistoryRepository } from "../repositories/property-status-history.repository";
import { assertAgencyOwner } from "./agency-access";
import { computeAverageTimeOnMarket, computeMonthly, MonthlyRow, StatusEvent } from "./report-calculations";

// Estados del historial que los reportes necesitan: publicacion y cierre.
const REPORT_STATUSES = [PropertyStatus.PUBLISHED, PropertyStatus.SOLD, PropertyStatus.RENTED];

class ReportService {
  // Cantidad de propiedades por estado ACTUAL (sale de la tabla de propiedades). Siempre devuelve los 7 estados.
  async statusSummary(agencyId: number, sellerId: number): Promise<{ items: { status: PropertyStatus; count: number }[]; total: number }> {
    await assertAgencyOwner(agencyId, sellerId);

    const counts = new Map((await propertyRepository.countByStatusForAgency(agencyId)).map((row) => [row.status, row.count]));
    const items = Object.values(PropertyStatus).map((status) => ({ status, count: counts.get(status) ?? 0 }));
    return { items, total: items.reduce((sum, item) => sum + item.count, 0) };
  }

  // Publicaciones nuevas y ventas/alquileres por mes (desde el historial de estados).
  async monthly(agencyId: number, sellerId: number): Promise<{ items: MonthlyRow[] }> {
    await assertAgencyOwner(agencyId, sellerId);
    return { items: computeMonthly(await this.loadEvents(agencyId)) };
  }

  // Dias promedio entre Publicada y Vendida/Alquilada (desde el historial de estados).
  async averageTimeOnMarket(agencyId: number, sellerId: number): Promise<{ averageDays: number | null; closedCount: number }> {
    await assertAgencyOwner(agencyId, sellerId);
    return computeAverageTimeOnMarket(await this.loadEvents(agencyId));
  }

  private async loadEvents(agencyId: number): Promise<StatusEvent[]> {
    const rows = await propertyStatusHistoryRepository.findByAgencyAndStatuses(agencyId, REPORT_STATUSES);
    return rows.map((row) => ({ propertyId: row.property.id, toStatus: row.toStatus, at: row.createdAt }));
  }
}

export const reportService = new ReportService();

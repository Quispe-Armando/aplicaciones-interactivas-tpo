import type { Request, Response } from "express";
import { reportService } from "../services/report.service";
import { parseId } from "../validation/parse-id";

// Los metodos no usan `this`, asi que se pueden pasar directo al router.
class ReportController {
  async statusSummary(request: Request, response: Response): Promise<void> {
    response.json(await reportService.statusSummary(parseId(request.params.id), request.sellerId!));
  }

  async monthly(request: Request, response: Response): Promise<void> {
    response.json(await reportService.monthly(parseId(request.params.id), request.sellerId!));
  }

  async averageTimeOnMarket(request: Request, response: Response): Promise<void> {
    response.json(await reportService.averageTimeOnMarket(parseId(request.params.id), request.sellerId!));
  }
}

export const reportController = new ReportController();

import { request } from "../api/client";
import type { Health } from "../api/types";

export const healthService = {
  check: (signal?: AbortSignal) => request<Health>("/health", { auth: false, signal }),
};

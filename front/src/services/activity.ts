import { request } from "../api/client";
import type { Activity, Page, PageParams } from "../api/types";

export const activityService = {
  // Solo el dueño. unread: true deja solo las no leidas.
  list: (
    agencyId: number,
    params: PageParams & { unread?: boolean } = {},
    signal?: AbortSignal,
  ) =>
    request<Page<Activity>>(`/agencies/${agencyId}/activity`, {
      query: params,
      signal,
    }),

  unreadCount: (agencyId: number, signal?: AbortSignal) =>
    request<{ unread: number }>(`/agencies/${agencyId}/activity/unread-count`, {
      signal,
    }),

  markAsRead: (id: number) =>
    request<Activity>(`/activity/${id}/read`, { method: "PATCH" }),
};

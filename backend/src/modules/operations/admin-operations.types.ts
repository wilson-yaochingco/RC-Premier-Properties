import type {
  AdminAuditListRequest,
  AdminAuditListResponse,
  AdminDashboardResponse,
  AdminStaffListRequest,
  AdminStaffListResponse,
  AdminViewingCalendarResponse,
} from "@rc/shared";

export interface AdminViewingCalendarRequest {
  start: string;
  end: string;
}

export interface AdminOperationsService {
  dashboard(): Promise<AdminDashboardResponse>;
  viewingCalendar(
    request: AdminViewingCalendarRequest,
  ): Promise<AdminViewingCalendarResponse>;
  auditEvents(request: AdminAuditListRequest): Promise<AdminAuditListResponse>;
  staff(request: AdminStaffListRequest): Promise<AdminStaffListResponse>;
}

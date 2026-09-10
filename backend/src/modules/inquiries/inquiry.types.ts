import type {
  AddInquiryNoteRequest,
  AdminInquiryDetail,
  AdminInquiryListRequest,
  AdminInquiryListResponse,
  AdminInquirySearchItem,
  AdminInquirySearchRequest,
  AdminInquirySearchResponse,
  AdminInquiryTransitionRequest,
  CreateInquiryRequest,
  CreateInquiryResponse,
  InquiryStatus,
  InquirySource,
  InquiryType,
  UpdateViewingRequestRequest,
  UpdateInquiryStatusRequest,
  ViewingRequestStatus,
} from "@rc/shared";
import type { SecurityAuditEventInput } from "../auth/auth.types.js";

export const INQUIRY_NOTIFICATION_STATUSES = [
  "pending",
  "sending",
  "retry-pending",
  "delivered",
  "terminal-failure",
] as const;
export type InquiryNotificationStatus = (typeof INQUIRY_NOTIFICATION_STATUSES)[number];

export interface InquiryNotificationEntity {
  /** Stable, non-sensitive identity supplied to providers as their idempotency key. */
  notificationId: string;
  status: InquiryNotificationStatus;
  attempts: number;
  nextAttemptAt?: Date;
  lastAttemptAt?: Date;
  deliveredAt?: Date;
  lastErrorCode?: string;
  leaseId?: string;
  leaseUntil?: Date;
}

export interface InquiryStatusHistoryEntity {
  fromStatus?: InquiryStatus;
  toStatus: InquiryStatus;
  changedByStaffIdentity?: unknown;
  changedAt: Date;
}

export interface InquiryNoteEntity {
  _id: unknown;
  note: string;
  authorStaffIdentity: unknown;
  createdAt: Date;
}

export interface ViewingStatusHistoryEntity {
  fromStatus?: ViewingRequestStatus;
  toStatus: ViewingRequestStatus;
  requestedDate: string;
  requestedTime: string;
  changedByStaffIdentity?: unknown;
  changedAt: Date;
}

export interface ViewingRequestEntity {
  status: ViewingRequestStatus;
  requestedDate: string;
  requestedTime: string;
  statusHistory: ViewingStatusHistoryEntity[];
}

export interface InquiryEntity {
  name: string;
  email: string;
  phone?: string;
  inquiryType: InquiryType;
  source: InquirySource;
  propertyId?: string;
  subject?: string;
  message?: string;
  viewingRequest?: ViewingRequestEntity;
  privacyConsent: boolean;
  privacyConsentAt: Date;
  status: InquiryStatus;
  statusBeforeSpam?: Exclude<InquiryStatus, "spam">;
  statusHistory: InquiryStatusHistoryEntity[];
  internalNotes: InquiryNoteEntity[];
  archivedAt?: Date;
  archivedByStaffIdentity?: unknown;
  idempotencyKeyHash?: string;
  notification: InquiryNotificationEntity;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

export interface ParsedInquiry {
  data: Omit<CreateInquiryRequest, "website">;
  isHoneypotSubmission: boolean;
}

export interface InquiryService {
  create(
    request: Omit<CreateInquiryRequest, "website">,
    idempotencyKey?: string,
  ): Promise<CreateInquiryResponse>;
}

export interface InquiryNotificationStateStore {
  markInitialDelivered(
    inquiryId: string,
    notificationId: string,
    leaseId: string,
    attemptedAt: Date,
  ): Promise<void>;
  markInitialFailed(
    inquiryId: string,
    notificationId: string,
    leaseId: string,
    attemptedAt: Date,
    nextAttemptAt: Date,
    errorCode: string,
  ): Promise<void>;
}

export interface ViewingPropertyRepository {
  isKnownPropertyId(propertyId: string): Promise<boolean>;
  isRequestablePropertyId(propertyId: string): Promise<boolean>;
}

export interface AdminInquiryRecord extends InquiryEntity {
  _id: unknown;
}

export interface InquiryAdminRepository {
  list(
    request: AdminInquiryListRequest,
  ): Promise<{ records: AdminInquiryRecord[]; total: number }>;
  search(request: AdminInquirySearchRequest): Promise<AdminInquirySearchItem[]>;
  findById(id: string): Promise<AdminInquiryRecord | null>;
  updateStatus(
    id: string,
    expectedVersion: number,
    currentStatus: InquiryStatus,
    status: InquiryStatus,
    actorStaffIdentityId: string,
    occurredAt: Date,
    statusBeforeSpam?: Exclude<InquiryStatus, "spam"> | null,
  ): Promise<AdminInquiryRecord | null>;
  updateViewingRequest(
    id: string,
    expectedVersion: number,
    currentViewingStatus: ViewingRequestStatus,
    input: Pick<
      UpdateViewingRequestRequest,
      "status" | "requestedDate" | "requestedTime"
    >,
    actorStaffIdentityId: string,
    occurredAt: Date,
    currentInquiryStatus: InquiryStatus,
    nextInquiryStatus: InquiryStatus,
  ): Promise<AdminInquiryRecord | null>;
  addNote(
    id: string,
    expectedVersion: number,
    note: string,
    actorStaffIdentityId: string,
    occurredAt: Date,
  ): Promise<AdminInquiryRecord | null>;
  archive(
    id: string,
    expectedVersion: number,
    actorStaffIdentityId: string,
    occurredAt: Date,
  ): Promise<AdminInquiryRecord | null>;
  restore(id: string, expectedVersion: number): Promise<AdminInquiryRecord | null>;
}

export interface InquiryAuditRecorder {
  recordAudit(event: SecurityAuditEventInput): Promise<void>;
}

export interface InquiryMutationContext {
  actorStaffIdentityId: string;
  requestId: string;
  occurredAt?: Date;
}

export interface AdminInquiryService {
  list(request: AdminInquiryListRequest): Promise<AdminInquiryListResponse>;
  search(request: AdminInquirySearchRequest): Promise<AdminInquirySearchResponse>;
  detail(id: string): Promise<AdminInquiryDetail | null>;
  updateStatus(
    id: string,
    input: UpdateInquiryStatusRequest,
    context: InquiryMutationContext,
  ): Promise<AdminInquiryDetail | null>;
  updateViewingRequest(
    id: string,
    input: UpdateViewingRequestRequest,
    context: InquiryMutationContext,
  ): Promise<AdminInquiryDetail | null>;
  markSpam(
    id: string,
    input: AdminInquiryTransitionRequest,
    context: InquiryMutationContext,
  ): Promise<AdminInquiryDetail | null>;
  markNotSpam(
    id: string,
    input: AdminInquiryTransitionRequest,
    context: InquiryMutationContext,
  ): Promise<AdminInquiryDetail | null>;
  addNote(
    id: string,
    input: AddInquiryNoteRequest,
    context: InquiryMutationContext,
  ): Promise<AdminInquiryDetail | null>;
  archive(
    id: string,
    input: AdminInquiryTransitionRequest,
    context: InquiryMutationContext,
  ): Promise<AdminInquiryDetail | null>;
  restore(
    id: string,
    input: AdminInquiryTransitionRequest,
    context: InquiryMutationContext,
  ): Promise<AdminInquiryDetail | null>;
}

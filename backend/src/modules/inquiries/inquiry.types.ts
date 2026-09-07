import type {
  AddInquiryNoteRequest,
  AdminInquiryDetail,
  AdminInquiryListRequest,
  AdminInquiryListResponse,
  AdminInquiryTransitionRequest,
  CreateInquiryRequest,
  CreateInquiryResponse,
  InquiryStatus,
  InquirySource,
  InquiryType,
  UpdateInquiryStatusRequest,
} from "@rc/shared";
import type { SecurityAuditEventInput } from "../auth/auth.types.js";

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

export interface InquiryEntity {
  name: string;
  email: string;
  phone?: string;
  inquiryType: InquiryType;
  source: InquirySource;
  propertyId?: string;
  subject?: string;
  message: string;
  privacyConsent: boolean;
  privacyConsentAt: Date;
  status: InquiryStatus;
  statusBeforeSpam?: Exclude<InquiryStatus, "spam">;
  statusHistory: InquiryStatusHistoryEntity[];
  internalNotes: InquiryNoteEntity[];
  archivedAt?: Date;
  archivedByStaffIdentity?: unknown;
  idempotencyKeyHash?: string;
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

export interface AdminInquiryRecord extends InquiryEntity {
  _id: unknown;
}

export interface InquiryAdminRepository {
  list(
    request: AdminInquiryListRequest,
  ): Promise<{ records: AdminInquiryRecord[]; total: number }>;
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
  detail(id: string): Promise<AdminInquiryDetail | null>;
  updateStatus(
    id: string,
    input: UpdateInquiryStatusRequest,
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

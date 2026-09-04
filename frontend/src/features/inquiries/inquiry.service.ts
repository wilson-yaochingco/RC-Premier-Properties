import {
  API_PREFIX,
  type CreateInquiryRequest,
  type CreateInquiryResponse,
} from "@rc/shared";
import { apiRequest } from "@/services/api-client";

export function createInquiry(
  request: CreateInquiryRequest,
  signal?: AbortSignal,
): Promise<CreateInquiryResponse> {
  return apiRequest<CreateInquiryResponse>(`${API_PREFIX}/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
}

/**
 * web.target.web_target_types (Web Target 타입)
 * ============================================
 * sendEvent personalization 응답·오퍼 JSON 최소 계약 타입.
 *
 * [Main Functions]
 * ===========
 * - 타입 정의만 (OfferPayload, ParsedOffer, TargetFetchResult)
 *
 * [Dependencies]
 * =========
 * - 없음
 */

/** Target Form-based JSON 오퍼 최소 계약 (PRD 3.2) */
export interface OfferPayload {
  type?: string;
  title?: string;
  body?: string;
  [key: string]: unknown;
}

export interface ParsedOffer {
  scope: string;
  payload: OfferPayload | null;
  rawItem: unknown;
}

export interface TargetFetchResult {
  propositions: unknown[];
  offers: ParsedOffer[];
  rawResponse: unknown;
}

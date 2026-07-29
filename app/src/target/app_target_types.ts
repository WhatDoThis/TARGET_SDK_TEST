/**
 * app.target.app_target_types (App Target 타입)
 * ============================================
 * Optimize proposition/오퍼 JSON 최소 계약 타입.
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
  offers: ParsedOffer[];
  rawPropositions: unknown;
}

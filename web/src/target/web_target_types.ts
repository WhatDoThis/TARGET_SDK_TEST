/**
 * web.target.web_target_types (Web Target 타입)
 * ============================================
 * sendEvent personalization 응답·오퍼 JSON 최소 계약 및 Target 요청 파라미터 타입.
 *
 * [Main Functions]
 * ===========
 * - 타입 정의만 (TestNum, OfferPayload, EventPopupOffer, ParsedOffer, TargetFetchResult)
 *
 * [Dependencies]
 * =========
 * - 없음
 */

/** data.__adobe.target.testNum — mbox성 요청 파라미터 (1|2|3) */
export type TestNum = "1" | "2" | "3";

/** Target Form-based JSON 오퍼 최소 계약 (PRD 3.2 + event-popup) */
export interface OfferPayload {
  type?: string;
  title?: string;
  body?: string;
  buttonText?: string;
  [key: string]: unknown;
}

/** type === "event-popup" 모달용 */
export interface EventPopupOffer {
  title?: string;
  body?: string;
  buttonText?: string;
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

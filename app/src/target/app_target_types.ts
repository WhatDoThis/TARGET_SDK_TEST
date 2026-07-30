/**
 * app.target.app_target_types (App Target 타입)
 * ============================================
 * Optimize proposition/오퍼 JSON·testNum·event-popup 타입.
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

/** Target Form-based JSON 오퍼 최소 계약 (+ event-popup) */
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
  offers: ParsedOffer[];
  rawPropositions: unknown;
}

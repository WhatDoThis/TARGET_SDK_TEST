/**
 * app.03_target.app_target_types (3단계 · Target 타입)
 * ==================================================
 * Optimize 요청 파라미터·오퍼 JSON·팝업 계약 타입만 정의한다.
 *
 * [Main Functions]
 * ===========
 * - 타입: TestNum, OfferPayload, EventPopupOffer, ParsedOffer, TargetFetchResult
 *
 * [Dependencies]
 * =========
 * - 없음
 */

/** data.__adobe.target.testNum — Target Custom mbox 파라미터 (1|2|3) */
export type TestNum = "1" | "2" | "3";

/** Form-based JSON 오퍼. type==="event-popup" 이면 UI 모달 */
export interface OfferPayload {
  type?: string;
  title?: string;
  body?: string;
  buttonText?: string;
  [key: string]: unknown;
}

/** event-popup 모달에 넘기는 필드 */
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

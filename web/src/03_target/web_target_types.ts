/**
 * web.03_target.web_target_types (3단계 · Target 타입)
 * ==================================================
 * sendEvent 응답·오퍼 JSON·팝업·testNum 타입만 정의한다.
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
  propositions: unknown[];
  offers: ParsedOffer[];
  rawResponse: unknown;
}

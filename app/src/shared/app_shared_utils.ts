/**
 * app.shared.app_shared_utils (App 공통 유틸)
 * ==========================================
 * App 채널 도메인 패키지가 공유하는 순수 함수 모음.
 *
 * [Main Functions]
 * ===========
 * - 1. isBlank — 빈 문자열/공백 판별
 * - 2. prettyJson — JSON pretty print
 * - 3. safeErrorMessage — 예외 메시지 추출
 *
 * [Dependencies]
 * =========
 * - 없음
 */

// 1.
export function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

// 2.
export function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

// 3.
export function safeErrorMessage(error: unknown, location: string): string {
  if (error instanceof Error) {
    return `[${location}] ${error.message}`;
  }
  return `[${location}] ${String(error)}`;
}

/**
 * app.shared.app_shared_utils (App 공통 유틸)
 * ==========================================
 * 도메인 폴더(01~04)가 공유하는 순수 헬퍼. 초기화~렌더 순서 밖에 둔다.
 *
 * [Main Functions]
 * ===========
 * - 1. isBlank — null/공백 문자열 판별
 * - 2. prettyJson — Raw JSON 표시용 pretty print
 * - 3. safeErrorMessage — 예외를 `[location] message` 문자열로 변환
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

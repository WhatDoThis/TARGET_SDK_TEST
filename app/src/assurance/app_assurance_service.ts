/**
 * app.assurance.app_assurance_service (Assurance 세션 연결)
 * ========================================================
 * Mobile: Deep link URL(`앱스킴://…adb_validation_sessionid=`)로 startSession.
 * Quick Connect 무인자 API는 debug 빌드 전용(EAS preview에서는 no-op).
 *
 * [Main Functions]
 * ===========
 * - 1. connectAssuranceSession — Session/Deep link URL로 PIN 오버레이 시작
 * - 2. startAssuranceQuickConnect — debug 전용 무인자 Quick Connect
 * - 3. isAssuranceSessionUrl — sessionid 쿼리 포함 여부
 * - HARDCODED_ASSURANCE_SESSION_URL — Dev 세션 하드코딩 (init 자동 연결)
 *
 * [Dependencies]
 * =========
 * - @adobe/react-native-aepassurance
 * - shared/app_shared_utils
 */

import { Assurance } from "@adobe/react-native-aepassurance";
import { isBlank, safeErrorMessage } from "../shared/app_shared_utils";

/** Expo app.json scheme — Assurance Base URL도 이것과 동일해야 함 */
export const ASSURANCE_APP_SCHEME = "aepsdktargettest";

/**
 * Dev 하드코딩 Assurance 세션 URL (붙여넣기 회피).
 * 세션 만료 시 Assurance에서 새 링크를 받아 이 상수만 교체.
 */
export const HARDCODED_ASSURANCE_SESSION_URL =
  "aepsdktargettest://?adb_validation_sessionid=<ASSURANCE_SESSION_ID>";

// 3.
export function isAssuranceSessionUrl(url: string): boolean {
  if (isBlank(url)) {
    return false;
  }
  return /[?&]adb_validation_sessionid=/i.test(url.trim());
}

// 1.
export function connectAssuranceSession(sessionUrl: string): void {
  if (isBlank(sessionUrl)) {
    throw new Error(
      "[connectAssuranceSession] URL empty — Assurance Deep link 세션의 앱 스킴 링크를 붙여넣기"
    );
  }

  const url = sessionUrl.trim();

  // 웹 Base URL 세션은 Mobile SDK가 무시함
  if (/^https?:\/\//i.test(url) && !url.toLowerCase().includes("adobeassurance")) {
    throw new Error(
      "[connectAssuranceSession] 웹 URL(https://ajo…)은 Mobile Assurance용이 아님. " +
        `Assurance에서 Base URL=${ASSURANCE_APP_SCHEME}:// 로 새 Deep link 세션을 만들고 ` +
        `생성된 ${ASSURANCE_APP_SCHEME}://…?adb_validation_sessionid=… 링크를 사용하세요.`
    );
  }

  if (!isAssuranceSessionUrl(url)) {
    throw new Error(
      "[connectAssuranceSession] adb_validation_sessionid 없는 URL — Assurance가 만든 세션 링크를 그대로 사용"
    );
  }

  try {
    Assurance.startSession(url);
    console.info("[connectAssuranceSession] startSession(url)", url);
  } catch (error) {
    throw new Error(safeErrorMessage(error, "connectAssuranceSession"));
  }
}

// 2.
export function startAssuranceQuickConnect(): void {
  try {
    // 공식: 무인자 startSession = Quick Connect, debug 빌드만. release/preview는 no-op.
    (Assurance as { startSession: (url?: string) => void }).startSession();
    console.info("[startAssuranceQuickConnect] startSession() called");
  } catch (error) {
    throw new Error(safeErrorMessage(error, "startAssuranceQuickConnect"));
  }
}

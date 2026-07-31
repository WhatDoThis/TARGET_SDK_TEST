/**
 * app.assurance.app_assurance_service (Assurance — 디버그 전용)
 * ============================================================
 * 수락 기준이 아님. Deep link URL로 startSession.
 * 세션 URL 하드코딩 금지 — UI/ env로 수동 전달.
 *
 * [Main Functions]
 * ===========
 * - 1. connectAssuranceSession — Session/Deep link URL로 PIN 오버레이
 * - 2. startAssuranceQuickConnect — debug 빌드 전용 무인자 API
 * - 3. isAssuranceSessionUrl — sessionid 쿼리 포함 여부
 *
 * [Dependencies]
 * =========
 * - @adobe/react-native-aepassurance
 * - shared/app_shared_utils
 */

import { Assurance } from "@adobe/react-native-aepassurance";
import { isBlank, safeErrorMessage } from "../shared/app_shared_utils";

/** Expo app.json scheme — Assurance Base URL과 동일해야 함 */
export const ASSURANCE_APP_SCHEME = "aepsdktargettest";

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
      "[connectAssuranceSession] URL empty — Assurance Deep link 세션 링크를 붙여넣기"
    );
  }

  const url = sessionUrl.trim();

  if (/^https?:\/\//i.test(url) && !url.toLowerCase().includes("adobeassurance")) {
    throw new Error(
      `[connectAssuranceSession] 웹 https URL은 Mobile용 아님. Base URL=${ASSURANCE_APP_SCHEME}:// 세션 사용`
    );
  }

  if (!isAssuranceSessionUrl(url)) {
    throw new Error(
      "[connectAssuranceSession] adb_validation_sessionid 없는 URL"
    );
  }

  try {
    Assurance.startSession(url);
    console.info("[connectAssuranceSession] startSession(url)");
  } catch (error) {
    throw new Error(safeErrorMessage(error, "connectAssuranceSession"));
  }
}

// 2.
export function startAssuranceQuickConnect(): void {
  try {
    (Assurance as { startSession: (url?: string) => void }).startSession();
    console.info("[startAssuranceQuickConnect] startSession()");
  } catch (error) {
    throw new Error(safeErrorMessage(error, "startAssuranceQuickConnect"));
  }
}

/**
 * app.assurance.app_assurance_service (Assurance 세션 연결)
 * ========================================================
 * Assurance 웹의 Session URL로 startSession을 호출한다.
 * Available Devices가 비는 경우 = 이 호출이 아직 안 된 상태.
 *
 * [Main Functions]
 * ===========
 * - 1. connectAssuranceSession — Session URL로 Assurance 연결 시작
 *
 * [Dependencies]
 * =========
 * - @adobe/react-native-aepassurance
 * - shared/app_shared_utils
 */

import { Assurance } from "@adobe/react-native-aepassurance";
import { isBlank, safeErrorMessage } from "../shared/app_shared_utils";

// 1.
export function connectAssuranceSession(sessionUrl: string): void {
  if (isBlank(sessionUrl)) {
    throw new Error(
      "[connectAssuranceSession] Session URL empty — Assurance 웹에서 URL 복사 후 붙여넣기"
    );
  }

  try {
    const url = sessionUrl.trim();
    Assurance.startSession(url);
    console.info("[connectAssuranceSession] startSession called");
  } catch (error) {
    throw new Error(safeErrorMessage(error, "connectAssuranceSession"));
  }
}

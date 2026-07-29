/**
 * app.identity.app_identity_service (App ECID 조회)
 * ================================================
 * Edge Identity로 Experience Cloud ID를 조회한다 (Could).
 *
 * [Main Functions]
 * ===========
 * - 1. fetchEcid — ECID 문자열 반환 (실패 시 null)
 *
 * [Dependencies]
 * =========
 * - @adobe/react-native-aepedgeidentity
 * - shared/app_shared_utils
 */

import { Identity as EdgeIdentity } from "@adobe/react-native-aepedgeidentity";
import { safeErrorMessage } from "../shared/app_shared_utils";

// 1.
export async function fetchEcid(): Promise<string | null> {
  try {
    const experienceCloudId = await EdgeIdentity.getExperienceCloudId();
    return experienceCloudId ?? null;
  } catch (error) {
    console.warn(safeErrorMessage(error, "fetchEcid"));
    return null;
  }
}

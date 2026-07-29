/**
 * web.identity.web_identity_service (Web ECID 조회)
 * ================================================
 * alloy getIdentity로 Experience Cloud ID를 조회한다 (Could).
 *
 * [Main Functions]
 * ===========
 * - 1. fetchEcid — ECID 문자열 반환 (실패 시 null)
 *
 * [Dependencies]
 * =========
 * - init/web_init
 * - shared/web_shared_utils
 */

import { getAlloy } from "../init/web_init";
import { safeErrorMessage } from "../shared/web_shared_utils";

// 1.
export async function fetchEcid(): Promise<string | null> {
  try {
    const alloy = getAlloy();
    const result = (await alloy("getIdentity")) as {
      identity?: { ECID?: string };
    };
    return result?.identity?.ECID ?? null;
  } catch (error) {
    console.warn(safeErrorMessage(error, "fetchEcid"));
    return null;
  }
}

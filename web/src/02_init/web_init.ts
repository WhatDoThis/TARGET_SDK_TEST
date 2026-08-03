/**
 * web.02_init.web_init (2단계 · AEP Web SDK 초기화)
 * =================================================
 * alloy 인스턴스 생성 후 configure를 1회만 수행한다.
 *
 * [Main Functions]
 * ===========
 * - 1. initWebSdk — alloy configure (datastreamId, orgId, edgeDomain?)
 * - 2. getAlloy — 초기화된 alloy 커맨드 반환
 *
 * [Dependencies]
 * =========
 * - @adobe/alloy
 * - 01_config/web_config
 * - shared/web_shared_utils
 */

import { createInstance } from "@adobe/alloy";
import type { WebConfig } from "../01_config/web_config";
import { isBlank, safeErrorMessage } from "../shared/web_shared_utils";

type AlloyCommand = (
  command: string,
  options?: Record<string, unknown>
) => Promise<unknown>;

let alloyInstance: AlloyCommand | null = null;
let configured = false;

// 1.
export async function initWebSdk(config: WebConfig): Promise<void> {
  if (configured && alloyInstance) {
    return;
  }

  try {
    alloyInstance = createInstance({ name: "alloy" });

    const configureOptions: Record<string, unknown> = {
      datastreamId: config.adobeEdge.datastreamId,
      orgId: config.adobeEdge.orgId,
      debugEnabled: config.debug.debugEnabled,
    };

    // 1st-party/FPC 도메인이 있을 때만 edgeDomain 주입
    if (!isBlank(config.adobeEdge.edgeDomain)) {
      configureOptions.edgeDomain = config.adobeEdge.edgeDomain.trim();
    }

    await alloyInstance("configure", configureOptions);
    configured = true;
  } catch (error) {
    alloyInstance = null;
    configured = false;
    throw new Error(safeErrorMessage(error, "initWebSdk"));
  }
}

// 2.
export function getAlloy(): AlloyCommand {
  if (!alloyInstance || !configured) {
    throw new Error("[getAlloy] Web SDK is not configured. Call initWebSdk first.");
  }
  return alloyInstance;
}

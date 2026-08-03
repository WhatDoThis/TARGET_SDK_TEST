/**
 * app.02_init.app_init (2단계 · AEP Mobile SDK 초기화)
 * ====================================================
 * initializeWithAppId → (선택) DEBUG updateConfiguration → ECID 수신까지 대기.
 * ECID는 Fetch 전 본선 준비 신호. DEBUG override는 Troubleshooting 전용.
 *
 * [Main Functions]
 * ===========
 * - 1. initMobileSdk — LogLevel + 확장 로드 + initializeWithAppId + OPT_IN
 * - 2. waitForEdgeReady — Edge Identity ECID 폴링(최대 45s)
 *
 * [Dependencies]
 * =========
 * - @adobe/react-native-aepcore
 * - @adobe/react-native-aepedge
 * - @adobe/react-native-aepedgeidentity
 * - @adobe/react-native-aepoptimize
 * - 01_config/app_config
 * - shared/app_shared_utils
 */

import { MobileCore, LogLevel, PrivacyStatus } from "@adobe/react-native-aepcore";
import { Edge } from "@adobe/react-native-aepedge";
import { Identity as EdgeIdentity } from "@adobe/react-native-aepedgeidentity";
import { Optimize } from "@adobe/react-native-aepoptimize";
import type { AppConfig } from "../01_config/app_config";
import { isBlank, safeErrorMessage } from "../shared/app_shared_utils";

const EDGE_READY_WAIT_MS = 45000;
const EDGE_READY_POLL_MS = 500;

let initialized = false;

export interface EdgeReadyInfo {
  ecid: string;
}

// 1.
export async function initMobileSdk(config: AppConfig): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    MobileCore.setLogLevel(LogLevel.DEBUG);

    // RN AEP: import 부수효과로 네이티브 확장을 EventHub에 등록
    void Edge;
    void EdgeIdentity;
    void Optimize;

    const appId = config.adobeMobile.adobeMobileAppId.trim();
    await MobileCore.initializeWithAppId(appId);
    MobileCore.setPrivacyStatus(PrivacyStatus.OPT_IN);

    // Troubleshooting only — 값은 app/.env 또는 EAS Secrets에서만 (Git 하드코딩 금지)
    // 키: EXPO_PUBLIC_DEBUG_EXPERIENCE_CLOUD_ORG / _EDGE_CONFIG_ID / _EDGE_DOMAIN
    const debugOverrides: Record<string, string> = {};
    if (!isBlank(config.debug.experienceCloudOrg)) {
      debugOverrides["experienceCloud.org"] =
        config.debug.experienceCloudOrg.trim();
    }
    if (!isBlank(config.debug.edgeConfigId)) {
      debugOverrides["edge.configId"] = config.debug.edgeConfigId.trim();
    }
    if (!isBlank(config.debug.edgeDomain)) {
      debugOverrides["edge.domain"] = config.debug.edgeDomain.trim();
    }
    if (Object.keys(debugOverrides).length > 0) {
      await MobileCore.updateConfiguration(debugOverrides);
      console.warn(
        "[initMobileSdk] Troubleshooting overrides applied (source=env/example, not source code)"
      );
    }

    initialized = true;
  } catch (error) {
    initialized = false;
    throw new Error(safeErrorMessage(error, "initMobileSdk"));
  }
}

// 2.
export async function waitForEdgeReady(): Promise<EdgeReadyInfo> {
  if (!initialized) {
    throw new Error("[waitForEdgeReady] call initMobileSdk first");
  }

  const deadline = Date.now() + EDGE_READY_WAIT_MS;

  while (Date.now() < deadline) {
    try {
      const ecid = await EdgeIdentity.getExperienceCloudId();
      if (!isBlank(ecid)) {
        return { ecid: ecid.trim() };
      }
    } catch {
      // SDK 콜백 timeout은 설정 준비 전 흔함 — 폴링으로 재시도
    }
    await sleep(EDGE_READY_POLL_MS);
  }

  throw new Error(
    `[waitForEdgeReady] ECID unavailable within ${EDGE_READY_WAIT_MS}ms. ` +
      "Check Tags Publish / appId / device network, or Troubleshooting experienceCloud.org override."
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

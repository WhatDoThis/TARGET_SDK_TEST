/**
 * app.init.app_init (AEP Mobile SDK 초기화 — 공식 골든 패스)
 * ========================================================
 * initializeWithAppId 후 Tags 원격 설정을 ECID로 확인한다(본선 init 준비 신호).
 * DEBUG 시 edge.* + experienceCloud.org 를 updateConfiguration으로 주입해 기기 Tags 미적용을 가른다.
 *
 * [Main Functions]
 * ===========
 * - 1. initMobileSdk — setLogLevel + initializeWithAppId (+ 선택 debug config override)
 * - 2. waitForEdgeReady — Edge Identity ECID 수신까지 대기(설정·네트워크 준비)
 * - 3. getLastInitDiagnostics — ECID 실패 시 UI/로그용 진단 스냅샷
 *
 * [Dependencies]
 * =========
 * - @adobe/react-native-aepcore
 * - @adobe/react-native-aepedge
 * - @adobe/react-native-aepedgeidentity
 * - @adobe/react-native-aepoptimize
 * - config/app_config
 * - shared/app_shared_utils
 */

import { MobileCore, LogLevel, PrivacyStatus } from "@adobe/react-native-aepcore";
import { Edge } from "@adobe/react-native-aepedge";
import { Identity as EdgeIdentity } from "@adobe/react-native-aepedgeidentity";
import { Optimize } from "@adobe/react-native-aepoptimize";
import type { AppConfig } from "../config/app_config";
import { isBlank, safeErrorMessage } from "../shared/app_shared_utils";

/** 첫 실행은 Tags 원격 JSON 다운로드가 필요해 여유를 둔다 */
const EDGE_READY_WAIT_MS = 45000;
const EDGE_READY_POLL_MS = 500;

let initialized = false;
let lastAppId = "";
let lastDebugOverrides: Record<string, string> = {};
let lastEcidAttemptError = "";
let lastEcidEmptyCount = 0;

export interface EdgeReadyInfo {
  ecid: string;
}

export interface InitDiagnostics {
  initialized: boolean;
  appId: string;
  debugOverrides: Record<string, string>;
  lastEcidAttemptError: string;
  lastEcidEmptyCount: number;
  waitMs: number;
}

// 3.
export function getLastInitDiagnostics(): InitDiagnostics {
  return {
    initialized,
    appId: lastAppId,
    debugOverrides: { ...lastDebugOverrides },
    lastEcidAttemptError,
    lastEcidEmptyCount,
    waitMs: EDGE_READY_WAIT_MS,
  };
}

// 1.
export async function initMobileSdk(config: AppConfig): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    MobileCore.setLogLevel(LogLevel.DEBUG);

    void Edge;
    void EdgeIdentity;
    void Optimize;

    lastAppId = config.adobeMobile.adobeMobileAppId.trim();
    console.info("[initMobileSdk] appId=", lastAppId);

    await MobileCore.initializeWithAppId(lastAppId);
    MobileCore.setPrivacyStatus(PrivacyStatus.OPT_IN);

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
    lastDebugOverrides = debugOverrides;
    if (Object.keys(debugOverrides).length > 0) {
      await MobileCore.updateConfiguration(debugOverrides);
      console.warn("[initMobileSdk] DEBUG config overrides", debugOverrides);
    }

    initialized = true;
    console.info("[initMobileSdk] initializeWithAppId done");
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
  lastEcidAttemptError = "";
  lastEcidEmptyCount = 0;

  while (Date.now() < deadline) {
    try {
      const ecid = await EdgeIdentity.getExperienceCloudId();
      if (!isBlank(ecid)) {
        console.info("[waitForEdgeReady] ecid=", ecid);
        return { ecid: ecid.trim() };
      }
      lastEcidEmptyCount += 1;
    } catch (error) {
      lastEcidAttemptError = safeErrorMessage(error, "getExperienceCloudId");
      console.warn("[waitForEdgeReady]", lastEcidAttemptError);
    }
    await sleep(EDGE_READY_POLL_MS);
  }

  // Adobe: experienceCloud.org 없는 설정이면 Identity 준비 실패 → callback.timeout 반복
  // CDN 소스는 OK일 수 있음 — 기기 미적용 vs Identity 등록은 org+edge override로 가름
  const hint =
    "CAUSE: 기기에서 Identity 준비 실패(Tags 미적용 또는 EdgeIdentity 미응답). " +
    "① Raw.debugOverrides에 experienceCloudOrg 있는지(없으면 옛 APK) " +
    "② uninstall 후 재설치·다른 망 ③ adb logcat -s AdobeExperienceSDK:V " +
    "④ org override 후에도 실패면 Identity 네이티브 등록 점검";

  throw new Error(
    `[waitForEdgeReady] Edge Identity ECID unavailable within ${EDGE_READY_WAIT_MS}ms. ` +
      `appId=${lastAppId || "(empty)"} · empty=${lastEcidEmptyCount} · ` +
      `lastError=${lastEcidAttemptError || "(none)"} · ${hint}`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

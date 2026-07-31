/**
 * app.init.app_init (AEP Mobile SDK 초기화 — 공식 골든 패스)
 * ========================================================
 * initializeWithAppId 후 Tags 원격 설정(edge.configId) 다운로드를 ECID로 확인한다.
 * Fetch를 init 직후 호출하면 config 미수신으로 general.unexpected가 날 수 있다.
 *
 * [Main Functions]
 * ===========
 * - 1. initMobileSdk — setLogLevel + initializeWithAppId (+ 선택 debug edge override)
 * - 2. waitForEdgeReady — Edge Identity ECID 수신까지 대기(설정·네트워크 준비)
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

const EDGE_READY_WAIT_MS = 20000;
const EDGE_READY_POLL_MS = 400;

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

    void Edge;
    void EdgeIdentity;
    void Optimize;

    await MobileCore.initializeWithAppId(config.adobeMobile.adobeMobileAppId);
    MobileCore.setPrivacyStatus(PrivacyStatus.OPT_IN);

    const debugOverrides: Record<string, string> = {};
    if (!isBlank(config.debug.edgeConfigId)) {
      debugOverrides["edge.configId"] = config.debug.edgeConfigId.trim();
    }
    if (!isBlank(config.debug.edgeDomain)) {
      debugOverrides["edge.domain"] = config.debug.edgeDomain.trim();
    }
    if (Object.keys(debugOverrides).length > 0) {
      await MobileCore.updateConfiguration(debugOverrides);
      console.warn("[initMobileSdk] DEBUG edge overrides", debugOverrides);
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

  while (Date.now() < deadline) {
    try {
      const ecid = await EdgeIdentity.getExperienceCloudId();
      if (!isBlank(ecid)) {
        console.info("[waitForEdgeReady] ecid=", ecid);
        return { ecid: ecid.trim() };
      }
    } catch (error) {
      console.warn("[waitForEdgeReady] getExperienceCloudId", error);
    }
    await sleep(EDGE_READY_POLL_MS);
  }

  throw new Error(
    "[waitForEdgeReady] Edge Identity ECID unavailable within timeout. " +
      "Tags Dev Publish·appId·기기 네트워크·Edge Datastream(Dev)을 확인하세요."
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

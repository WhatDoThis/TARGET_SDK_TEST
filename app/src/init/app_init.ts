/**
 * app.init.app_init (AEP Mobile SDK 초기화)
 * ========================================
 * initializeWithAppId 후 privacy OPT_IN + edge.configId/domain을 강제한다.
 * Consent pending / Tags datastream 미주입이면 Optimize가 영구 대기한다.
 *
 * [Main Functions]
 * ===========
 * - 1. initMobileSdk — initializeWithAppId + Edge 설정 + 확장 버전 점검
 *
 * [Dependencies]
 * =========
 * - @adobe/react-native-aepcore
 * - @adobe/react-native-aepedge
 * - @adobe/react-native-aepedgeidentity
 * - @adobe/react-native-aepoptimize
 * - @adobe/react-native-aepassurance (선택)
 * - config/app_config
 * - shared/app_shared_utils
 */

import { MobileCore, LogLevel, PrivacyStatus } from "@adobe/react-native-aepcore";
import { Edge } from "@adobe/react-native-aepedge";
import { Identity as EdgeIdentity } from "@adobe/react-native-aepedgeidentity";
import { Optimize } from "@adobe/react-native-aepoptimize";
import { Assurance } from "@adobe/react-native-aepassurance";
import type { AppConfig } from "../config/app_config";
import { isBlank, safeErrorMessage } from "../shared/app_shared_utils";

const DEFAULT_EDGE_DOMAIN = "edge.adobedc.net";

let initialized = false;

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

    // Edge 요청 차단의 가장 흔한 원인: privacy / Consent collect=n
    MobileCore.setPrivacyStatus(PrivacyStatus.OPT_IN);

    const edgeDomain = !isBlank(config.adobeMobile.edgeDomain)
      ? config.adobeMobile.edgeDomain.trim()
      : DEFAULT_EDGE_DOMAIN;

    const runtimeConfig: Record<string, string> = {
      "edge.domain": edgeDomain,
    };

    // Tags Edge datastream이 Dev에 안 붙었을 때 코드로 보정
    if (!isBlank(config.adobeMobile.edgeConfigId)) {
      runtimeConfig["edge.configId"] = config.adobeMobile.edgeConfigId.trim();
    }

    await MobileCore.updateConfiguration(runtimeConfig);
    console.info("[initMobileSdk] runtime config", runtimeConfig);

    await sleep(2000);

    const versions = await readExtensionVersions();
    console.info("[initMobileSdk] extension versions", versions);

    if (isBlank(versions.optimize) || versions.optimize === "unavailable") {
      throw new Error(
        "[initMobileSdk] Optimize extension unavailable after initializeWithAppId."
      );
    }
    if (isBlank(versions.edge) || versions.edge === "unavailable") {
      throw new Error(
        "[initMobileSdk] Edge extension unavailable after initializeWithAppId."
      );
    }

    if (!isBlank(config.assurance.assuranceSessionUrl)) {
      Assurance.startSession(config.assurance.assuranceSessionUrl.trim());
    }

    initialized = true;
    console.info("[initMobileSdk] success", versions);
  } catch (error) {
    initialized = false;
    throw new Error(safeErrorMessage(error, "initMobileSdk"));
  }
}

async function readExtensionVersions(): Promise<Record<string, string>> {
  const [optimize, edge, edgeIdentity] = await Promise.all([
    safeVersion(() => Optimize.extensionVersion()),
    safeVersion(() => Edge.extensionVersion()),
    safeVersion(() => EdgeIdentity.extensionVersion()),
  ]);
  return { optimize, edge, edgeIdentity };
}

async function safeVersion(fn: () => Promise<string>): Promise<string> {
  try {
    return await fn();
  } catch {
    return "unavailable";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

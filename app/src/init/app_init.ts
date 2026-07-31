/**
 * app.init.app_init (AEP Mobile SDK 초기화)
 * ========================================
 * AEP RN 7.x: MobileCore.initializeWithAppId로 번들 확장을 자동 등록한다.
 * Edge/Optimize 패키지를 import해 네이티브 모듈이 번들에 포함되도록 한다.
 *
 * [Main Functions]
 * ===========
 * - 1. initMobileSdk — initializeWithAppId + 확장 버전 점검
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

import { MobileCore, LogLevel } from "@adobe/react-native-aepcore";
import { Edge } from "@adobe/react-native-aepedge";
import { Identity as EdgeIdentity } from "@adobe/react-native-aepedgeidentity";
import { Optimize } from "@adobe/react-native-aepoptimize";
import { Assurance } from "@adobe/react-native-aepassurance";
import type { AppConfig } from "../config/app_config";
import { isBlank, safeErrorMessage } from "../shared/app_shared_utils";

let initialized = false;

// 1.
export async function initMobileSdk(config: AppConfig): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    MobileCore.setLogLevel(LogLevel.DEBUG);

    // import 참조 유지 — 트리셰이킹으로 네이티브 모듈이 빠지지 않게 함
    void Edge;
    void EdgeIdentity;
    void Optimize;

    await MobileCore.initializeWithAppId(config.adobeMobile.adobeMobileAppId);

    if (!isBlank(config.adobeMobile.edgeDomain)) {
      await MobileCore.updateConfiguration({
        "edge.domain": config.adobeMobile.edgeDomain.trim(),
      });
    }

    // Tags 원격 설정 반영·확장 ready 여유
    await sleep(1500);

    const versions = await readExtensionVersions();
    console.info("[initMobileSdk] extension versions", versions);

    if (isBlank(versions.optimize) || versions.optimize === "unavailable") {
      throw new Error(
        "[initMobileSdk] Optimize extension unavailable after initializeWithAppId. Rebuild APK with @adobe/react-native-aepoptimize linked."
      );
    }

    if (!isBlank(config.assurance.assuranceSessionUrl)) {
      Assurance.startSession(config.assurance.assuranceSessionUrl.trim());
    }

    initialized = true;
    console.info("[initMobileSdk] MobileCore.initializeWithAppId success", versions);
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

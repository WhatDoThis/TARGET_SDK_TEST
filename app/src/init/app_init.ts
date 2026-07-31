/**
 * app.init.app_init (AEP Mobile SDK 초기화)
 * ========================================
 * AEP RN 7.x: MobileCore.initializeWithAppId로 번들 확장을 자동 등록한다.
 * Tags FPC domain이 불안정할 수 있어 Dev 스모크 시 edge.adobedc.net으로 덮어쓸 수 있다.
 *
 * [Main Functions]
 * ===========
 * - 1. initMobileSdk — initializeWithAppId + edge.domain + 확장 버전 점검
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

/** Adobe 기본 Edge 호스트 — Tags FPC 도메인 장애 시 Dev 우회용 */
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

    // Tags에 설정된 FPC domain이 폰에서 안 열리면 Optimize 콜백이 영구히 안 옴.
    // env edgeDomain가 있으면 그걸 쓰고, 없으면 Adobe 기본 호스트로 강제.
    const edgeDomain = !isBlank(config.adobeMobile.edgeDomain)
      ? config.adobeMobile.edgeDomain.trim()
      : DEFAULT_EDGE_DOMAIN;
    await MobileCore.updateConfiguration({
      "edge.domain": edgeDomain,
    });
    console.info("[initMobileSdk] edge.domain=", edgeDomain);

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

/**
 * app.init.app_init (AEP Mobile SDK 초기화)
 * ========================================
 * MobileCore + Edge / EdgeIdentity / Optimize 확장을 1회 등록·초기화한다.
 * 클래식 AEPTarget(retrieveLocationContent)는 사용하지 않는다.
 *
 * [Main Functions]
 * ===========
 * - 1. initMobileSdk — 확장 등록 + MobileCore.configureWithAppId
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

    await registerExtensions();

    if (!isBlank(config.adobeMobile.edgeDomain)) {
      MobileCore.updateConfiguration({
        "edge.domain": config.adobeMobile.edgeDomain.trim(),
      });
    }

    MobileCore.configureWithAppId(config.adobeMobile.adobeMobileAppId);

    if (!isBlank(config.assurance.assuranceSessionUrl)) {
      Assurance.startSession(config.assurance.assuranceSessionUrl.trim());
    }

    initialized = true;
    console.info("[initMobileSdk] MobileCore configure success");
  } catch (error) {
    initialized = false;
    throw new Error(safeErrorMessage(error, "initMobileSdk"));
  }
}

function registerExtensions(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      MobileCore.registerExtensions(
        [Edge, EdgeIdentity, Optimize, Assurance],
        () => {
          resolve();
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

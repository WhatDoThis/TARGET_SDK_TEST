/**
 * app.init.app_init (AEP Mobile SDK 초기화)
 * ========================================
 * AEP RN 7.x: MobileCore.initializeWithAppId로 번들 확장을 자동 등록한다.
 * 클래식 AEPTarget / registerExtensions+configureWithAppId 패턴은 사용하지 않는다.
 *
 * [Main Functions]
 * ===========
 * - 1. initMobileSdk — initializeWithAppId (+ 선택 edge.domain)
 *
 * [Dependencies]
 * =========
 * - @adobe/react-native-aepcore
 * - @adobe/react-native-aepassurance (선택)
 * - config/app_config
 * - shared/app_shared_utils
 */

import { MobileCore, LogLevel } from "@adobe/react-native-aepcore";
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

    // 7.x: npm에 설치된 Edge / EdgeIdentity / Optimize 등을 자동 등록 + Tags 설정 다운로드
    await MobileCore.initializeWithAppId(config.adobeMobile.adobeMobileAppId);

    if (!isBlank(config.adobeMobile.edgeDomain)) {
      await MobileCore.updateConfiguration({
        "edge.domain": config.adobeMobile.edgeDomain.trim(),
      });
    }

    if (!isBlank(config.assurance.assuranceSessionUrl)) {
      Assurance.startSession(config.assurance.assuranceSessionUrl.trim());
    }

    initialized = true;
    console.info("[initMobileSdk] MobileCore.initializeWithAppId success");
  } catch (error) {
    initialized = false;
    throw new Error(safeErrorMessage(error, "initMobileSdk"));
  }
}

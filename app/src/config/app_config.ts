/**
 * app.config.app_config (App Dev 환경설정 로드)
 * ============================================
 * app/env/config.dev.json을 로드·검증한다. Mobile / Target / Assurance 그룹.
 *
 * [Main Functions]
 * ===========
 * - 1. loadAppConfig — Dev 설정 로드 및 필수 키 검증
 *
 * [Dependencies]
 * =========
 * - app/env/config.dev.json
 * - shared/app_shared_utils
 */

import configDev from "../../env/config.dev.json";
import { isBlank } from "../shared/app_shared_utils";

export interface AppAdobeMobileConfig {
  /** Tags Mobile Dev Environment File ID */
  adobeMobileAppId: string;
  /** 빈 문자열이면 Tags/SDK 기본 도메인. 있으면 edge.domain 주입 */
  edgeDomain: string;
}

export interface AppTargetConfig {
  decisionScope: string;
}

export interface AppAssuranceConfig {
  assuranceSessionUrl: string;
}

export interface AppConfig {
  adobeMobile: AppAdobeMobileConfig;
  target: AppTargetConfig;
  assurance: AppAssuranceConfig;
}

// 1.
export function loadAppConfig(): AppConfig {
  const config = configDev as AppConfig;

  if (isBlank(config.adobeMobile?.adobeMobileAppId)) {
    throw new Error("[loadAppConfig] adobeMobile.adobeMobileAppId is required");
  }
  if (isBlank(config.target?.decisionScope)) {
    throw new Error("[loadAppConfig] target.decisionScope is required");
  }

  const looksLikePlaceholder = config.adobeMobile.adobeMobileAppId.includes("<");
  if (looksLikePlaceholder) {
    console.warn(
      "[loadAppConfig] Placeholder adobeMobileAppId. Replace app/env/config.dev.json after Tags Dev publish."
    );
  }

  return config;
}

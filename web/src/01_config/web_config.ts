/**
 * web.01_config.web_config (1단계 · Dev 환경설정)
 * ==============================================
 * web/env/config.dev.json 로드·검증. adobeEdge / target / debug 그룹.
 *
 * [Main Functions]
 * ===========
 * - 1. loadWebConfig — Dev 설정 로드 및 필수 키 검증
 *
 * [Dependencies]
 * =========
 * - web/env/config.dev.json
 * - shared/web_shared_utils
 */

import configDev from "../../env/config.dev.json";
import { isBlank } from "../shared/web_shared_utils";

export interface WebAdobeEdgeConfig {
  orgId: string;
  datastreamId: string;
  /** 빈 문자열이면 SDK 기본 edge.adobedc.net */
  edgeDomain: string;
}

export interface WebTargetConfig {
  decisionScope: string;
}

export interface WebDebugConfig {
  debugEnabled: boolean;
}

export interface WebConfig {
  adobeEdge: WebAdobeEdgeConfig;
  target: WebTargetConfig;
  debug: WebDebugConfig;
}

// 1.
export function loadWebConfig(): WebConfig {
  const config = configDev as WebConfig;

  if (isBlank(config.adobeEdge?.orgId)) {
    throw new Error("[loadWebConfig] adobeEdge.orgId is required");
  }
  if (isBlank(config.adobeEdge?.datastreamId)) {
    throw new Error("[loadWebConfig] adobeEdge.datastreamId is required");
  }
  if (isBlank(config.target?.decisionScope)) {
    throw new Error("[loadWebConfig] target.decisionScope is required");
  }

  const looksLikePlaceholder =
    config.adobeEdge.orgId.includes("<") ||
    config.adobeEdge.datastreamId.includes("<");

  if (looksLikePlaceholder) {
    console.warn(
      "[loadWebConfig] Placeholder values detected. Replace web/env/config.dev.json before real Edge calls."
    );
  }

  return config;
}

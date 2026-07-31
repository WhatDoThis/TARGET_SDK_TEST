/**
 * app.config.app_config (App Dev 환경설정 로드 — 골든 패스)
 * ========================================================
 * 본선: adobeMobileAppId + decisionScope.
 * debug.* / assurance는 Troubleshooting·수동 디버그용.
 *
 * [Main Functions]
 * ===========
 * - 1. loadAppConfig — example + EXPO_PUBLIC_* 병합·검증
 *
 * [Dependencies]
 * =========
 * - app/env/config.dev.example.json
 * - EXPO_PUBLIC_ADOBE_MOBILE_APP_ID / DECISION_SCOPE
 * - EXPO_PUBLIC_DEBUG_EDGE_CONFIG_ID / DEBUG_EDGE_DOMAIN (부록)
 * - EXPO_PUBLIC_ASSURANCE_SESSION_URL (디버그, 선택)
 * - shared/app_shared_utils
 */

import configExample from "../../env/config.dev.example.json";
import { isBlank } from "../shared/app_shared_utils";

export interface AppAdobeMobileConfig {
  /** Tags Mobile Dev Environment File ID */
  adobeMobileAppId: string;
}

export interface AppTargetConfig {
  decisionScope: string;
}

export interface AppDebugConfig {
  /** 부록: Tags edge.configId 우회 */
  edgeConfigId: string;
  /** 부록: Tags edge.domain 우회 */
  edgeDomain: string;
}

export interface AppAssuranceConfig {
  /** 디버그 전용 — 하드코딩 금지, 수동/ env만 */
  assuranceSessionUrl: string;
}

export interface AppConfig {
  adobeMobile: AppAdobeMobileConfig;
  target: AppTargetConfig;
  debug: AppDebugConfig;
  assurance: AppAssuranceConfig;
}

// 1.
export function loadAppConfig(): AppConfig {
  const base = configExample as {
    adobeMobile: { adobeMobileAppId: string };
    target: { decisionScope: string };
    debug?: { edgeConfigId?: string; edgeDomain?: string };
    assurance?: { assuranceSessionUrl?: string };
  };

  const config: AppConfig = {
    adobeMobile: {
      adobeMobileAppId:
        readEnv("EXPO_PUBLIC_ADOBE_MOBILE_APP_ID") ||
        base.adobeMobile.adobeMobileAppId,
    },
    target: {
      decisionScope:
        readEnv("EXPO_PUBLIC_DECISION_SCOPE") || base.target.decisionScope,
    },
    debug: {
      edgeConfigId:
        readEnv("EXPO_PUBLIC_DEBUG_EDGE_CONFIG_ID") ??
        base.debug?.edgeConfigId ??
        "",
      edgeDomain:
        readEnv("EXPO_PUBLIC_DEBUG_EDGE_DOMAIN") ??
        base.debug?.edgeDomain ??
        "",
    },
    assurance: {
      assuranceSessionUrl:
        readEnv("EXPO_PUBLIC_ASSURANCE_SESSION_URL") ??
        base.assurance?.assuranceSessionUrl ??
        "",
    },
  };

  if (isBlank(config.adobeMobile.adobeMobileAppId)) {
    throw new Error("[loadAppConfig] adobeMobile.adobeMobileAppId is required");
  }
  if (isBlank(config.target.decisionScope)) {
    throw new Error("[loadAppConfig] target.decisionScope is required");
  }

  if (config.adobeMobile.adobeMobileAppId.includes("<")) {
    console.warn(
      "[loadAppConfig] Placeholder adobeMobileAppId. Set EXPO_PUBLIC_ADOBE_MOBILE_APP_ID."
    );
  }

  return config;
}

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

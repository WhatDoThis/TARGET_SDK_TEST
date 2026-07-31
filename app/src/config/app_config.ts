/**
 * app.config.app_config (App Dev 환경설정 로드)
 * ============================================
 * 커밋되는 config.dev.example.json을 로드하고,
 * EXPO_PUBLIC_* 환경변수로 덮어쓴다. (EAS는 gitignore된 config.dev.json을 업로드하지 않음)
 *
 * [Main Functions]
 * ===========
 * - 1. loadAppConfig — example + env 병합·검증
 *
 * [Dependencies]
 * =========
 * - app/env/config.dev.example.json
 * - EXPO_PUBLIC_ADOBE_MOBILE_APP_ID / EDGE_CONFIG_ID / EDGE_DOMAIN / DECISION_SCOPE
 * - shared/app_shared_utils
 */

import configExample from "../../env/config.dev.example.json";
import { HARDCODED_ASSURANCE_SESSION_URL } from "../assurance/app_assurance_service";
import { isBlank } from "../shared/app_shared_utils";

export interface AppAdobeMobileConfig {
  /** Tags Mobile Dev Environment File ID */
  adobeMobileAppId: string;
  /** Datastream UUID → edge.configId (Tags 주입 실패 시 코드로 강제) */
  edgeConfigId: string;
  /** 빈 문자열이면 edge.adobedc.net 강제. 있으면 그 값 */
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
  const base = configExample as AppConfig;
  const config: AppConfig = {
    adobeMobile: {
      adobeMobileAppId:
        readEnv("EXPO_PUBLIC_ADOBE_MOBILE_APP_ID") ||
        base.adobeMobile.adobeMobileAppId,
      edgeConfigId:
        readEnv("EXPO_PUBLIC_EDGE_CONFIG_ID") ??
        base.adobeMobile.edgeConfigId ??
        "",
      edgeDomain:
        readEnv("EXPO_PUBLIC_EDGE_DOMAIN") ?? base.adobeMobile.edgeDomain,
    },
    target: {
      decisionScope:
        readEnv("EXPO_PUBLIC_DECISION_SCOPE") || base.target.decisionScope,
    },
    assurance: {
      assuranceSessionUrl:
        readEnv("EXPO_PUBLIC_ASSURANCE_SESSION_URL") ||
        base.assurance.assuranceSessionUrl ||
        HARDCODED_ASSURANCE_SESSION_URL,
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
      "[loadAppConfig] Placeholder adobeMobileAppId. Set EXPO_PUBLIC_ADOBE_MOBILE_APP_ID (EAS env or app/.env)."
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

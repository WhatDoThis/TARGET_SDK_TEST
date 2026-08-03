/**
 * app.01_config.app_config (1단계 · Dev 환경설정)
 * ==============================================
 * 본선: adobeMobileAppId + decisionScope (EXPO_PUBLIC_* 또는 env/config.dev.example.json).
 * debug.* 는 Troubleshooting 전용 — 공개 Git에는 실값을 넣지 않는다.
 *
 * [값 넣는 위치 — 공개 레포에 커밋 금지]
 * ================================
 * 1) 로컬/CI: app/.env  (gitignore) — 아래 EXPO_PUBLIC_* 키
 * 2) EAS 클라우드 빌드: Expo 대시보드 Secrets 또는 빌드 직전 eas.json env를
 *    로컬에서만 채운 뒤 커밋하지 않음 (권장: EAS Secrets)
 * 3) example JSON: app/env/config.dev.example.json 은 플레이스홀더만 유지
 *
 * [Main Functions]
 * ===========
 * - 1. loadAppConfig — example + EXPO_PUBLIC_* 병합 (실값 smoke 하드코딩 없음)
 *
 * [Dependencies]
 * =========
 * - app/env/config.dev.example.json
 * - shared/app_shared_utils
 */

import configExample from "../../env/config.dev.example.json";
import { isBlank } from "../shared/app_shared_utils";

export interface AppAdobeMobileConfig {
  adobeMobileAppId: string;
}

export interface AppTargetConfig {
  decisionScope: string;
}

/**
 * Troubleshooting only (골든 패스 아님).
 * Tags 원격설정이 기기에 안 올 때 updateConfiguration용.
 * 값은 코드에 하드코딩하지 말고 EXPO_PUBLIC_DEBUG_* / .env 로만 주입.
 */
export interface AppDebugConfig {
  edgeConfigId: string;
  edgeDomain: string;
  experienceCloudOrg: string;
  edgeSource: "env" | "example" | "none";
}

export interface AppConfig {
  adobeMobile: AppAdobeMobileConfig;
  target: AppTargetConfig;
  debug: AppDebugConfig;
}

// 1.
export function loadAppConfig(): AppConfig {
  const base = configExample as {
    adobeMobile: { adobeMobileAppId: string };
    target: { decisionScope: string };
    debug?: {
      edgeConfigId?: string;
      edgeDomain?: string;
      experienceCloudOrg?: string;
    };
  };

  // Tags Mobile Environment File ID — Data Collection → Tags → Environment
  const envAppId = readEnv("EXPO_PUBLIC_ADOBE_MOBILE_APP_ID");
  // Target Location 문자열 — 활동 Location과 동일
  const envScope = readEnv("EXPO_PUBLIC_DECISION_SCOPE");

  // Troubleshooting: Datastream UUID — Data Collection → Datastreams
  const envConfigId = readEnv("EXPO_PUBLIC_DEBUG_EDGE_CONFIG_ID");
  // Troubleshooting: Edge host — 보통 edge.adobedc.net 또는 샌드박스 FPC 도메인
  const envDomain = readEnv("EXPO_PUBLIC_DEBUG_EDGE_DOMAIN");
  // Troubleshooting: IMS org — Tags CDN JSON의 experienceCloud.org 와 동일 형식 (…@AdobeOrg)
  const envOrg = readEnv("EXPO_PUBLIC_DEBUG_EXPERIENCE_CLOUD_ORG");

  const exampleConfigId = base.debug?.edgeConfigId?.trim() || "";
  const exampleDomain = base.debug?.edgeDomain?.trim() || "";
  const exampleOrg = base.debug?.experienceCloudOrg?.trim() || "";

  const edgeConfigId = envConfigId || exampleConfigId;
  const edgeDomain = envDomain || exampleDomain;
  const experienceCloudOrg = envOrg || exampleOrg;

  let edgeSource: AppDebugConfig["edgeSource"] = "none";
  if (envConfigId || envOrg || envDomain) {
    edgeSource = "env";
  } else if (exampleConfigId || exampleOrg || exampleDomain) {
    edgeSource = "example";
  }

  const config: AppConfig = {
    adobeMobile: {
      adobeMobileAppId: envAppId || base.adobeMobile.adobeMobileAppId,
    },
    target: {
      decisionScope: envScope || base.target.decisionScope,
    },
    debug: {
      edgeConfigId,
      edgeDomain,
      experienceCloudOrg,
      edgeSource,
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
      "[loadAppConfig] Placeholder adobeMobileAppId. " +
        "Set EXPO_PUBLIC_ADOBE_MOBILE_APP_ID in app/.env (gitignored) or EAS Secrets — never commit real IDs."
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

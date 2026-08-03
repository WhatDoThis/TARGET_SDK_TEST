/**
 * app.01_config.app_config (1단계 · Dev 환경설정)
 * ==============================================
 * 본선: adobeMobileAppId + decisionScope.
 * debug.* 는 Troubleshooting 전용(EAS EXPO_PUBLIC 또는 smoke 폴백) — 고객 골든 패스 아님.
 *
 * [Main Functions]
 * ===========
 * - 1. loadAppConfig — example JSON + EXPO_PUBLIC_* + smoke fallback 병합
 *
 * [Dependencies]
 * =========
 * - app/env/config.dev.example.json
 * - shared/app_shared_utils
 */

import configExample from "../../env/config.dev.example.json";
import { isBlank } from "../shared/app_shared_utils";

// --- Troubleshooting only (골든 패스 아님): Tags 미적용 시 ECID/Edge 우회 ---
const SMOKE_EDGE_CONFIG_ID = "<DATASTREAM_UUID>";
const SMOKE_EDGE_DOMAIN = "edge.adobedc.net";
const SMOKE_EXPERIENCE_CLOUD_ORG = "<IMS_ORG>@AdobeOrg";

export interface AppAdobeMobileConfig {
  adobeMobileAppId: string;
}

export interface AppTargetConfig {
  decisionScope: string;
}

/** Troubleshooting: edge/org 로컬 주입용 */
export interface AppDebugConfig {
  edgeConfigId: string;
  edgeDomain: string;
  experienceCloudOrg: string;
  edgeSource: "env" | "example" | "smoke-fallback";
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

  const envConfigId = readEnv("EXPO_PUBLIC_DEBUG_EDGE_CONFIG_ID");
  const envDomain = readEnv("EXPO_PUBLIC_DEBUG_EDGE_DOMAIN");
  const envOrg = readEnv("EXPO_PUBLIC_DEBUG_EXPERIENCE_CLOUD_ORG");
  const exampleConfigId = base.debug?.edgeConfigId?.trim() || "";
  const exampleDomain = base.debug?.edgeDomain?.trim() || "";
  const exampleOrg = base.debug?.experienceCloudOrg?.trim() || "";

  let edgeConfigId = envConfigId || exampleConfigId;
  let edgeDomain = envDomain || exampleDomain;
  let experienceCloudOrg = envOrg || exampleOrg;
  let edgeSource: AppDebugConfig["edgeSource"] =
    envConfigId || envOrg
      ? "env"
      : exampleConfigId || exampleOrg
        ? "example"
        : "smoke-fallback";

  // env/example이 비면 smoke로 채워 현재 Dev 연결을 유지한다
  if (isBlank(edgeConfigId)) {
    edgeConfigId = SMOKE_EDGE_CONFIG_ID;
    edgeSource = "smoke-fallback";
  }
  if (isBlank(edgeDomain)) {
    edgeDomain = SMOKE_EDGE_DOMAIN;
    if (edgeSource !== "env") {
      edgeSource = "smoke-fallback";
    }
  }
  if (isBlank(experienceCloudOrg)) {
    experienceCloudOrg = SMOKE_EXPERIENCE_CLOUD_ORG;
    if (edgeSource !== "env") {
      edgeSource = "smoke-fallback";
    }
  }

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

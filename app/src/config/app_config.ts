/**
 * app.config.app_config (App Dev 환경설정 로드 — 골든 패스)
 * ========================================================
 * 본선: adobeMobileAppId + decisionScope.
 * debug edge.* / experienceCloud.org 는 EAS EXPO_PUBLIC 또는 SMOKE 폴백(ECID 진단용).
 *
 * [Main Functions]
 * ===========
 * - 1. loadAppConfig — example + EXPO_PUBLIC_* + smoke fallback 병합
 *
 * [Dependencies]
 * =========
 * - app/env/config.dev.example.json
 * - EXPO_PUBLIC_* / shared/app_shared_utils
 */

import configExample from "../../env/config.dev.example.json";
import { isBlank } from "../shared/app_shared_utils";

/** EAS env가 번들에 안 실려도 ECID 진단용으로 쓰이는 Dev smoke 값 */
const SMOKE_EDGE_CONFIG_ID = "<DATASTREAM_UUID>";
/** 샌드박스 FPC DNS 의심 시 Adobe 기본 호스트로 먼저 검증 */
const SMOKE_EDGE_DOMAIN = "edge.adobedc.net";
/** Tags CDN JSON과 동일 — edge.* 만으로는 ECID 진단이 불완전 */
const SMOKE_EXPERIENCE_CLOUD_ORG = "<IMS_ORG>@AdobeOrg";

export interface AppAdobeMobileConfig {
  adobeMobileAppId: string;
}

export interface AppTargetConfig {
  decisionScope: string;
}

export interface AppDebugConfig {
  edgeConfigId: string;
  edgeDomain: string;
  experienceCloudOrg: string;
  /** env에서 왔는지 smoke 폴백인지 */
  edgeSource: "env" | "example" | "smoke-fallback";
}

export interface AppAssuranceConfig {
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
    debug?: {
      edgeConfigId?: string;
      edgeDomain?: string;
      experienceCloudOrg?: string;
    };
    assurance?: { assuranceSessionUrl?: string };
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
  let edgeSource: AppDebugConfig["edgeSource"] = envConfigId || envOrg
    ? "env"
    : exampleConfigId || exampleOrg
      ? "example"
      : "smoke-fallback";

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

  console.info("[loadAppConfig] debug edge", config.debug);
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

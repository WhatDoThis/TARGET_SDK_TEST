/**
 * app.init.app_init (AEP Mobile SDK 초기화)
 * ========================================
 * initializeWithAppId 후 privacy OPT_IN + edge.configId/domain.
 * Assurance는 orgId가 SDK에 로드된 뒤에만 연결 (조기 startSession → 무한 대기 방지).
 *
 * [Main Functions]
 * ===========
 * - 1. initMobileSdk — initializeWithAppId + Edge 설정 + 확장 버전 점검
 * - 2. waitForExperienceCloudOrg — Assurance 전 org 준비 대기
 *
 * [Dependencies]
 * =========
 * - @adobe/react-native-aepcore
 * - @adobe/react-native-aepedge
 * - @adobe/react-native-aepedgeidentity
 * - @adobe/react-native-aepoptimize
 * - config/app_config
 * - shared/app_shared_utils
 */

import { MobileCore, LogLevel, PrivacyStatus } from "@adobe/react-native-aepcore";
import { Edge } from "@adobe/react-native-aepedge";
import { Identity as EdgeIdentity } from "@adobe/react-native-aepedgeidentity";
import { Optimize } from "@adobe/react-native-aepoptimize";
import type { AppConfig } from "../config/app_config";
import { isBlank, safeErrorMessage } from "../shared/app_shared_utils";

const DEFAULT_EDGE_DOMAIN = "edge.adobedc.net";
const ORG_WAIT_MS = 15000;
const ORG_POLL_MS = 500;

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

    MobileCore.setPrivacyStatus(PrivacyStatus.OPT_IN);

    const edgeDomain = !isBlank(config.adobeMobile.edgeDomain)
      ? config.adobeMobile.edgeDomain.trim()
      : DEFAULT_EDGE_DOMAIN;

    const runtimeConfig: Record<string, string> = {
      "edge.domain": edgeDomain,
    };

    if (!isBlank(config.adobeMobile.edgeConfigId)) {
      runtimeConfig["edge.configId"] = config.adobeMobile.edgeConfigId.trim();
    }

    await MobileCore.updateConfiguration(runtimeConfig);
    console.info("[initMobileSdk] runtime config", runtimeConfig);

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

    // Assurance는 App에서 org 확인 후 버튼/자동 연결 — 여기서 startSession 하지 않음
    // (org 미수신 상태에서 startSession → Invalid Configuration / 웹 무한로딩)

    initialized = true;
    console.info("[initMobileSdk] success", versions);
  } catch (error) {
    initialized = false;
    throw new Error(safeErrorMessage(error, "initMobileSdk"));
  }
}

// 2.
export async function waitForExperienceCloudOrg(): Promise<string> {
  const deadline = Date.now() + ORG_WAIT_MS;

  while (Date.now() < deadline) {
    try {
      const identities = await MobileCore.getSdkIdentities();
      const org = extractOrgId(identities);
      if (!isBlank(org)) {
        console.info("[waitForExperienceCloudOrg] org=", org);
        return org;
      }
      console.info("[waitForExperienceCloudOrg] waiting…", identities);
    } catch (error) {
      console.warn("[waitForExperienceCloudOrg] getSdkIdentities failed", error);
    }
    await sleep(ORG_POLL_MS);
  }

  throw new Error(
    "[waitForExperienceCloudOrg] experienceCloud.org unavailable — Tags Dev Publish / appId / 네트워크 확인. Assurance는 org 없이 연결 불가."
  );
}

function extractOrgId(identities: string): string | null {
  if (isBlank(identities)) {
    return null;
  }
  try {
    const parsed = JSON.parse(identities) as {
      companyContexts?: Array<{ namespace?: string; value?: string }>;
    };
    const ctx = parsed.companyContexts?.find(
      (c) => c.namespace === "imsOrgId" || c.namespace === "orgId"
    );
    if (ctx?.value) {
      return ctx.value;
    }
  } catch {
    // fall through — string scan
  }
  const match = identities.match(
    /[0-9A-F]{24}@AdobeOrg|[0-9A-Za-z]+@[Aa]dobe[Oo]rg/
  );
  return match?.[0] ?? null;
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

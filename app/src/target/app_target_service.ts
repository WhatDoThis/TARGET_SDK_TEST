/**
 * app.target.app_target_service (App Optimize Target)
 * ==================================================
 * Optimize updatePropositions → getPropositions로 JSON 오퍼를 수신·파싱한다.
 * testNum은 data.__adobe.target 요청 파라미터(Map, mbox성).
 *
 * [Main Functions]
 * ===========
 * - 1. fetchTargetOffers — scope + testNum 개인화 요청
 * - 2. parsePropositionMap — Map/객체 → OfferPayload 목록
 * - 3. decodeOfferContent — string/이중string/array content 디코드
 * - 4. parseEventPopup — type===event-popup 추출
 *
 * [Dependencies]
 * =========
 * - @adobe/react-native-aepoptimize
 * - target/app_target_types
 * - shared/app_shared_utils
 */

import { DecisionScope, Optimize } from "@adobe/react-native-aepoptimize";
import type {
  EventPopupOffer,
  OfferPayload,
  ParsedOffer,
  TargetFetchResult,
  TestNum,
} from "./app_target_types";
import { safeErrorMessage } from "../shared/app_shared_utils";

const ALLOWED_TEST_NUMS: TestNum[] = ["1", "2", "3"];
const EVENT_POPUP_TYPE = "event-popup";
const UPDATE_WAIT_MS = 25000;

// 3.
export function decodeOfferContent(content: unknown): unknown {
  let value = content;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
      if (typeof value === "string") {
        value = JSON.parse(value);
      }
    } catch {
      return { body: content };
    }
  }
  return value;
}

// 2.
export function parsePropositionMap(propositions: unknown): ParsedOffer[] {
  const offers: ParsedOffer[] = [];
  const entries = toEntries(propositions);

  for (const [scope, proposition] of entries) {
    const items = extractItems(proposition);
    if (items.length === 0) {
      offers.push({ scope, payload: null, rawItem: proposition });
      continue;
    }

    for (const item of items) {
      const decoded = decodeOfferContent(extractRawContent(item));
      if (Array.isArray(decoded)) {
        for (const entry of decoded) {
          offers.push({
            scope,
            payload:
              entry != null && typeof entry === "object"
                ? (entry as OfferPayload)
                : null,
            rawItem: item,
          });
        }
        continue;
      }

      offers.push({
        scope,
        payload:
          decoded != null && typeof decoded === "object"
            ? (decoded as OfferPayload)
            : null,
        rawItem: item,
      });
    }
  }

  return offers;
}

// 4.
export function parseEventPopup(offers: ParsedOffer[]): EventPopupOffer | null {
  for (const offer of offers) {
    if (offer.payload?.type !== EVENT_POPUP_TYPE) {
      continue;
    }
    return {
      title: trimOrUndefined(offer.payload.title),
      body: trimOrUndefined(offer.payload.body),
      buttonText: trimOrUndefined(offer.payload.buttonText),
    };
  }
  return null;
}

// 1.
export async function fetchTargetOffers(
  decisionScope: string,
  testNum: TestNum
): Promise<TargetFetchResult> {
  if (!decisionScope.trim()) {
    throw new Error("[fetchTargetOffers] decisionScope is empty");
  }
  if (!ALLOWED_TEST_NUMS.includes(testNum)) {
    throw new Error(
      `[fetchTargetOffers] testNum invalid: ${String(testNum)} (allowed 1|2|3)`
    );
  }

  try {
    const optimizeVersion = await safeOptimizeVersion();
    if (optimizeVersion === "unavailable") {
      throw new Error(
        "[fetchTargetOffers] Optimize.extensionVersion unavailable — native module not linked"
      );
    }

    const scopes = [new DecisionScope(decisionScope)];
    // RN 브릿지는 Map을 기대함 (plain object면 콜백이 안 올 수 있음)
    const data = buildTargetDataMap(testNum);

    const updateError = await waitForUpdatePropositions(scopes, data);
    const propositions = await Optimize.getPropositions(scopes);
    const offers = parsePropositionMap(propositions);
    const rawPropositions = serializePropositions(propositions);

    if (updateError && offers.length === 0) {
      throw new Error(
        `[fetchTargetOffers] updatePropositions failed: ${updateError} · optimize=${optimizeVersion} · scope=${decisionScope} · testNum=${testNum}`
      );
    }

    return {
      offers,
      rawPropositions: {
        optimizeVersion,
        decisionScope,
        testNum,
        warning: updateError,
        response: rawPropositions,
      },
    };
  } catch (error) {
    throw new Error(safeErrorMessage(error, "fetchTargetOffers"));
  }
}

function buildTargetDataMap(testNum: TestNum): Map<string, unknown> {
  const targetParameters = new Map<string, string>();
  targetParameters.set("testNum", testNum);

  const adobe = new Map<string, unknown>();
  adobe.set("target", targetParameters);

  const data = new Map<string, unknown>();
  data.set("__adobe", adobe);
  return data;
}

function waitForUpdatePropositions(
  scopes: DecisionScope[],
  data: Map<string, unknown>
): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (errorMessage: string | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(errorMessage);
    };

    const timer = setTimeout(() => {
      finish(
        [
          "client wait exceeded before Optimize callback",
          "1) Tags Dev Publish에 Optimize+Edge+EdgeIdentity 포함 여부",
          "2) Edge Development Datastream = Target ON",
          "3) Edge Domain DNS (문제 시 Tags Domain 비우고 재게시)",
          "4) APK가 최신 init(initializeWithAppId) 빌드인지",
        ].join(" · ")
      );
    }, UPDATE_WAIT_MS);

    try {
      // 콜백이 누락되는 환경 대비 — proposition update 이벤트로도 완료 처리
      Optimize.onPropositionUpdate({
        call: () => {
          clearTimeout(timer);
          finish(null);
        },
      });

      Optimize.updatePropositions(
        scopes,
        undefined,
        data,
        () => {
          clearTimeout(timer);
          finish(null);
        },
        (error: unknown) => {
          clearTimeout(timer);
          finish(formatOptimizeError(error));
        }
      );
    } catch (error) {
      clearTimeout(timer);
      finish(formatOptimizeError(error));
    }
  });
}

async function safeOptimizeVersion(): Promise<string> {
  try {
    return await Optimize.extensionVersion();
  } catch {
    return "unavailable";
  }
}

function formatOptimizeError(error: unknown): string {
  if (error == null) {
    return "unknown Optimize error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  try {
    const record = error as {
      type?: string;
      title?: string;
      detail?: string;
      message?: string;
    };
    const parts = [record.type, record.title, record.detail, record.message]
      .filter((part) => typeof part === "string" && part.trim().length > 0)
      .join(" · ");
    if (parts.length > 0) {
      return parts;
    }
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function toEntries(propositions: unknown): Array<[string, unknown]> {
  if (propositions instanceof Map) {
    return Array.from(propositions.entries()).map(([key, value]) => [
      String((key as { name?: string })?.name ?? key),
      value,
    ]);
  }

  if (propositions != null && typeof propositions === "object") {
    return Object.entries(propositions as Record<string, unknown>);
  }

  return [];
}

function extractItems(proposition: unknown): unknown[] {
  if (proposition == null || typeof proposition !== "object") {
    return [];
  }

  const prop = proposition as {
    items?: unknown[];
    getItems?: () => unknown[];
  };

  if (typeof prop.getItems === "function") {
    const items = prop.getItems();
    return Array.isArray(items) ? items : [];
  }

  return Array.isArray(prop.items) ? prop.items : [];
}

function extractRawContent(item: unknown): unknown {
  if (item == null || typeof item !== "object") {
    return null;
  }

  const offer = item as {
    content?: unknown;
    getContent?: () => unknown;
    data?: { content?: unknown };
  };

  if (typeof offer.getContent === "function") {
    return offer.getContent();
  }
  if (offer.content != null) {
    return offer.content;
  }
  if (offer.data?.content != null) {
    return offer.data.content;
  }
  return null;
}

function serializePropositions(propositions: unknown): unknown {
  if (propositions instanceof Map) {
    const obj: Record<string, unknown> = {};
    propositions.forEach((value, key) => {
      obj[String((key as { name?: string })?.name ?? key)] = value;
    });
    return obj;
  }
  return propositions;
}

function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

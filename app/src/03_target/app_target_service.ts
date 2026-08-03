/**
 * app.03_target.app_target_service (3단계 · 요청·반환)
 * ==================================================
 * updatePropositions → 콜백/캐시 → JSON 오퍼 파싱.
 * Fetch마다 data.__adobe.target.testNum 을 전송해 Target 오디언스와 매칭한다.
 *
 * [Main Functions]
 * ===========
 * - 1. fetchTargetOffers — scope + testNum 개인화 요청
 * - 2. parsePropositionMap — Map/객체 → OfferPayload 목록
 * - 3. decodeOfferContent — string/이중 JSON/array content 디코드
 * - 4. parseEventPopup — type===event-popup 추출
 *
 * [Dependencies]
 * =========
 * - @adobe/react-native-aepoptimize
 * - 03_target/app_target_types
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
const UPDATE_WAIT_MS = 15000;

// 3.
export function decodeOfferContent(content: unknown): unknown {
  let value = content;
  // Target JSON 오퍼는 string 또는 이중 stringify 로 올 수 있음
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
        "[fetchTargetOffers] Optimize unavailable — native module not linked"
      );
    }

    const scopes = [new DecisionScope(decisionScope)];
    // Web과 동일: mbox 파라미터로 Target Custom 오디언스(testNum)에 전달
    const dataWithTestNum = {
      __adobe: {
        target: {
          testNum: String(testNum),
        },
      },
    };

    Optimize.clearCachedPropositions();
    const updateResult = await updatePropositionsOnce(scopes, dataWithTestNum);

    if (updateResult.error) {
      throw new Error(
        [
          `[fetchTargetOffers] ${updateResult.error}`,
          `optimize=${optimizeVersion}`,
          `scope=${decisionScope}`,
          `testNum=${testNum}`,
        ].join(" · ")
      );
    }

    const propositions =
      updateResult.propositions ?? (await Optimize.getPropositions(scopes));
    const offers = parsePropositionMap(propositions);
    const hasPayload = offers.some((o) => o.payload != null);

    return {
      offers,
      rawPropositions: {
        optimizeVersion,
        decisionScope,
        testNum,
        sentData: dataWithTestNum,
        updatePath: updateResult.path,
        warning: hasPayload
          ? null
          : "empty offers — Location=aep-app-test-scope Live, audience testNum, Property Token",
        response: serializePropositions(propositions),
      },
    };
  } catch (error) {
    throw new Error(safeErrorMessage(error, "fetchTargetOffers"));
  }
}

interface UpdateResult {
  propositions: unknown | null;
  error: string | null;
  path: string;
}

function updatePropositionsOnce(
  scopes: DecisionScope[],
  data: Record<string, unknown> | undefined
): Promise<UpdateResult> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: UpdateResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        propositions: null,
        error: "updatePropositions timeout",
        path: "timeout",
      });
    }, UPDATE_WAIT_MS);

    // 캐시 갱신 알림 또는 onSuccess 중 먼저 오는 쪽으로 완료 처리
    try {
      Optimize.onPropositionUpdate({
        call: (propositions: unknown) => {
          finish({
            propositions,
            error: null,
            path: "onPropositionUpdate",
          });
        },
      });
    } catch (error) {
      console.warn("[fetchTargetOffers] onPropositionUpdate", error);
    }

    try {
      Optimize.updatePropositions(
        scopes,
        undefined,
        data,
        (propositions: unknown) => {
          finish({
            propositions,
            error: null,
            path: "updatePropositions-onSuccess",
          });
        },
        (error: unknown) => {
          finish({
            propositions: null,
            error: formatOptimizeError(error),
            path: "onError",
          });
        }
      );
    } catch (error) {
      finish({
        propositions: null,
        error: formatOptimizeError(error),
        path: "updatePropositions-throw",
      });
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

/**
 * app.target.app_target_service (App Optimize Target)
 * ==================================================
 * Adobe 샘플앱과 동일: onPropositionUpdate + updatePropositions → getPropositions.
 * testNum은 data.__adobe.target (plain object — RN 브릿지 호환).
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
const UPDATE_WAIT_MS = 20000;
const POLL_INTERVAL_MS = 1000;

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
    // Adobe 샘플: onPropositionUpdate 등록 → updatePropositions(콜백 없이) → getPropositions
    const data = {
      __adobe: {
        target: {
          testNum: String(testNum),
        },
      },
    };

    const updateResult = await runUpdatePropositions(scopes, data);
    const propositions =
      updateResult.propositions ?? (await Optimize.getPropositions(scopes));
    const offers = parsePropositionMap(propositions);

    if (offers.length === 0 && updateResult.error) {
      throw new Error(
        `[fetchTargetOffers] ${updateResult.error} · optimize=${optimizeVersion} · scope=${decisionScope} · testNum=${testNum}`
      );
    }

    return {
      offers,
      rawPropositions: {
        optimizeVersion,
        decisionScope,
        testNum,
        updatePath: updateResult.path,
        warning: updateResult.error,
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

function runUpdatePropositions(
  scopes: DecisionScope[],
  data: Record<string, unknown>
): Promise<UpdateResult> {
  return new Promise((resolve) => {
    let settled = false;
    let latestFromEvent: unknown | null = null;

    const finish = (result: UpdateResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      clearInterval(pollTimer);
      resolve(result);
    };

    // 1) Adobe 샘플 권장: proposition 업데이트 이벤트
    try {
      Optimize.onPropositionUpdate({
        call: (propositions: unknown) => {
          latestFromEvent = propositions;
          finish({
            propositions,
            error: null,
            path: "onPropositionUpdate",
          });
        },
      });
    } catch (error) {
      console.warn("[fetchTargetOffers] onPropositionUpdate failed", error);
    }

    // 2) 샘플처럼 콜백 없는 update 호출 (5-arg 콜백이 브릿지에서 먹통인 경우 회피)
    try {
      Optimize.updatePropositions(scopes, undefined, data);
    } catch (error) {
      finish({
        propositions: null,
        error: formatOptimizeError(error),
        path: "updatePropositions-throw",
      });
      return;
    }

    // 3) 폴링: 캐시에 들어오면 성공 처리
    const pollTimer = setInterval(() => {
      void (async () => {
        try {
          const cached = await Optimize.getPropositions(scopes);
          if (hasAnyProposition(cached) || latestFromEvent != null) {
            finish({
              propositions: latestFromEvent ?? cached,
              error: null,
              path: latestFromEvent != null ? "onPropositionUpdate" : "poll-getPropositions",
            });
          }
        } catch {
          // pending update 중 get이 실패할 수 있음 — 무시하고 다음 폴링
        }
      })();
    }, POLL_INTERVAL_MS);

    const timer = setTimeout(() => {
      finish({
        propositions: latestFromEvent,
        error: [
          "no Optimize response within timeout",
          "Tags Optimize v1.1.2 + Edge Dev datastream OK여도 edge.domain DNS가 막히면 동일 증상",
          "앱은 edge.adobedc.net 강제 적용본으로 재빌드 필요",
          "Assurance로 Edge 요청 여부 확인 권장",
        ].join(" · "),
        path: "timeout",
      });
    }, UPDATE_WAIT_MS);
  });
}

function hasAnyProposition(propositions: unknown): boolean {
  if (propositions instanceof Map) {
    return propositions.size > 0;
  }
  if (propositions != null && typeof propositions === "object") {
    return Object.keys(propositions as object).length > 0;
  }
  return false;
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

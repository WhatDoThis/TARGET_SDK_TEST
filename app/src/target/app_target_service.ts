/**
 * app.target.app_target_service (App Optimize Target)
 * ==================================================
 * updatePropositions → getPropositions.
 * data는 plain nested object (RN 브릿지). Map으로 general.unexpected 나는 경우 회피.
 * 1차: data 없이 요청 → 2차: testNum 포함 재시도.
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
const POLL_INTERVAL_MS = 800;

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
    // Android/RN 샘플과 동일: plain nested object (Map 중첩은 브릿지에서 unexpected 유발 가능)
    const dataWithTestNum = {
      __adobe: {
        target: {
          testNum: String(testNum),
        },
      },
    };

    Optimize.clearCachedPropositions();

    // 1차: 파라미터 없이 (통신·Target 매칭만 검증)
    let updateResult = await runUpdatePropositions(scopes, undefined);
    let attempt = "no-data";

    // 2차: general.unexpected 등 실패 시 testNum plain object로 재시도
    if (updateResult.path === "onError" || updateResult.path === "timeout") {
      Optimize.clearCachedPropositions();
      updateResult = await runUpdatePropositions(scopes, dataWithTestNum);
      attempt = "with-testNum";
    } else if (
      !hasAnyProposition(updateResult.propositions) &&
      updateResult.path !== "timeout"
    ) {
      // 빈 성공이면 testNum 넣어 재요청 (오퍼가 파라미터 기반일 수 있음)
      Optimize.clearCachedPropositions();
      const withData = await runUpdatePropositions(scopes, dataWithTestNum);
      if (
        withData.path !== "onError" &&
        withData.path !== "timeout" &&
        hasAnyProposition(withData.propositions)
      ) {
        updateResult = withData;
        attempt = "with-testNum-after-empty";
      }
    }

    const propositions =
      updateResult.propositions ?? (await Optimize.getPropositions(scopes));
    const offers = parsePropositionMap(propositions);

    if (updateResult.path === "onError" || updateResult.path === "timeout") {
      throw new Error(
        [
          `[fetchTargetOffers] ${updateResult.error ?? "Optimize failed"}`,
          `optimize=${optimizeVersion}`,
          `scope=${decisionScope}`,
          `testNum=${testNum}`,
          `attempt=${attempt}`,
          "general.unexpected = Edge/Optimize가 응답했으나 실패(timeout 아님).",
          "Assurance에서 personalization 응답 오류·Target Location Live·클래식 Target 확장 잔존 여부 확인",
        ].join(" · ")
      );
    }

    return {
      offers,
      rawPropositions: {
        optimizeVersion,
        decisionScope,
        testNum,
        attempt,
        updatePath: updateResult.path,
        warning:
          offers.length === 0 || offers.every((o) => o.payload == null)
            ? "Optimize OK but empty — Target Location/audience/testNum/Live 확인"
            : updateResult.error,
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
  data: Record<string, unknown> | undefined
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
      try {
        Optimize.updatePropositions(scopes, undefined, data);
      } catch (inner) {
        finish({
          propositions: null,
          error: formatOptimizeError(inner ?? error),
          path: "updatePropositions-throw",
        });
        return;
      }
    }

    const pollTimer = setInterval(() => {
      void (async () => {
        try {
          const cached = await Optimize.getPropositions(scopes);
          if (hasAnyProposition(cached) || latestFromEvent != null) {
            finish({
              propositions: latestFromEvent ?? cached,
              error: null,
              path:
                latestFromEvent != null
                  ? "onPropositionUpdate"
                  : "poll-getPropositions",
            });
          }
        } catch {
          // ignore
        }
      })();
    }, POLL_INTERVAL_MS);

    const timer = setTimeout(() => {
      finish({
        propositions: latestFromEvent,
        error:
          "no Optimize/Edge response (timeout). Edge 요청이 Assurance에 없으면 privacy·edge.configId·edge.domain·Tags Dev publish 문제",
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

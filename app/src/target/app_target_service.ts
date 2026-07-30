/**
 * app.target.app_target_service (App Optimize Target)
 * ==================================================
 * Optimize updatePropositions → getPropositions로 JSON 오퍼를 수신·파싱한다.
 * testNum은 data.__adobe.target 요청 파라미터(mbox성, profile./entity. 아님).
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
 * - Adobe: data.__adobe.target page/mbox params
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
    const scopes = [new DecisionScope(decisionScope)];
    // mbox성 파라미터 — profile./entity. 접두사 없음
    const data = {
      __adobe: {
        target: {
          testNum,
        },
      },
    };

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void): void => {
        if (settled) {
          return;
        }
        settled = true;
        fn();
      };

      try {
        Optimize.updatePropositions(
          scopes,
          undefined,
          data,
          () => finish(resolve),
          (error: unknown) =>
            finish(() =>
              reject(
                new Error(
                  `[fetchTargetOffers] updatePropositions failed: ${String(error)}`
                )
              )
            )
        );
      } catch (error) {
        console.warn(
          "[fetchTargetOffers] updatePropositions callback unavailable",
          error
        );
      }

      setTimeout(() => finish(resolve), 3000);
    });

    const propositions = await Optimize.getPropositions(scopes);

    return {
      offers: parsePropositionMap(propositions),
      rawPropositions: serializePropositions(propositions),
    };
  } catch (error) {
    throw new Error(safeErrorMessage(error, "fetchTargetOffers"));
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

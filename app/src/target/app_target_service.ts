/**
 * app.target.app_target_service (App Optimize Target)
 * ==================================================
 * Optimize updatePropositions → getPropositions로 JSON 오퍼를 수신·파싱한다.
 *
 * [Main Functions]
 * ===========
 * - 1. fetchTargetOffers — scope 기준 개인화 요청
 * - 2. parsePropositionMap — Map/객체 → OfferPayload 목록
 *
 * [Dependencies]
 * =========
 * - @adobe/react-native-aepoptimize
 * - target/app_target_types
 * - shared/app_shared_utils
 */

import { DecisionScope, Optimize } from "@adobe/react-native-aepoptimize";
import type {
  OfferPayload,
  ParsedOffer,
  TargetFetchResult,
} from "./app_target_types";
import { safeErrorMessage } from "../shared/app_shared_utils";

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
      offers.push({
        scope,
        payload: extractPayload(item),
        rawItem: item,
      });
    }
  }

  return offers;
}

// 1.
export async function fetchTargetOffers(
  decisionScope: string
): Promise<TargetFetchResult> {
  if (!decisionScope.trim()) {
    throw new Error("[fetchTargetOffers] decisionScope is empty");
  }

  try {
    const scopes = [new DecisionScope(decisionScope)];

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
          undefined,
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
        // 콜백 시그니처 미지원 환경: 요청만 디스패치 후 getPropositions로 이어감
        console.warn(
          "[fetchTargetOffers] updatePropositions callback unavailable",
          error
        );
      }

      // getPropositions가 pending update를 기다리므로 상한 대기 후 진행
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
      String(key?.name ?? key),
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

function extractPayload(item: unknown): OfferPayload | null {
  if (item == null || typeof item !== "object") {
    return null;
  }

  const offer = item as {
    content?: unknown;
    getContent?: () => unknown;
    data?: { content?: unknown };
  };

  let content: unknown = null;
  if (typeof offer.getContent === "function") {
    content = offer.getContent();
  } else if (offer.content != null) {
    content = offer.content;
  } else if (offer.data?.content != null) {
    content = offer.data.content;
  }

  if (typeof content === "string") {
    try {
      return JSON.parse(content) as OfferPayload;
    } catch {
      return { body: content };
    }
  }

  if (content != null && typeof content === "object") {
    return content as OfferPayload;
  }

  return null;
}

function serializePropositions(propositions: unknown): unknown {
  if (propositions instanceof Map) {
    const obj: Record<string, unknown> = {};
    propositions.forEach((value, key) => {
      obj[String(key?.name ?? key)] = value;
    });
    return obj;
  }
  return propositions;
}

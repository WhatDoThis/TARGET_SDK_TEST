/**
 * web.03_target.web_target_service (3단계 · 요청·반환)
 * ==================================================
 * alloy sendEvent로 decision scope를 요청하고 JSON 오퍼를 파싱한다.
 * testNum은 data.__adobe.target (mbox 파라미터, profile./entity. 아님).
 *
 * [Main Functions]
 * ===========
 * - 1. fetchTargetOffers — sendEvent + decisionScopes + testNum
 * - 2. parsePropositions — propositions → OfferPayload 목록
 * - 3. decodeOfferContent — string/이중 JSON content 디코드
 *
 * [Dependencies]
 * =========
 * - 02_init/web_init
 * - 03_target/web_target_types
 * - shared/web_shared_utils
 */

import { getAlloy } from "../02_init/web_init";
import type {
  OfferPayload,
  ParsedOffer,
  TargetFetchResult,
  TestNum,
} from "./web_target_types";
import { safeErrorMessage } from "../shared/web_shared_utils";

const ALLOWED_TEST_NUMS: TestNum[] = ["1", "2", "3"];

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
export function parsePropositions(propositions: unknown[]): ParsedOffer[] {
  const offers: ParsedOffer[] = [];

  for (const proposition of propositions) {
    if (proposition == null || typeof proposition !== "object") {
      continue;
    }

    const prop = proposition as {
      scope?: string;
      items?: Array<{ data?: { content?: unknown } }>;
    };
    const scope = prop.scope ?? "(unknown-scope)";
    const items = Array.isArray(prop.items) ? prop.items : [];

    if (items.length === 0) {
      offers.push({ scope, payload: null, rawItem: null });
      continue;
    }

    for (const item of items) {
      const decoded = decodeOfferContent(item?.data?.content);
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

      const payload =
        decoded != null && typeof decoded === "object"
          ? (decoded as OfferPayload)
          : null;
      offers.push({ scope, payload, rawItem: item });
    }
  }

  return offers;
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
    const alloy = getAlloy();
    // profile./entity. 접두사 없음 → 요청(mbox) 파라미터
    const rawResponse = await alloy("sendEvent", {
      renderDecisions: false,
      personalization: {
        decisionScopes: [decisionScope],
        sendDisplayEvent: false,
      },
      xdm: {
        eventType: "decisioning.propositionFetch",
        web: {
          webPageDetails: {
            name: "aep-web-sdk-target-test",
          },
        },
      },
      data: {
        __adobe: {
          target: {
            testNum,
          },
        },
      },
    });

    const response = (rawResponse ?? {}) as { propositions?: unknown[] };
    const propositions = Array.isArray(response.propositions)
      ? response.propositions
      : [];

    return {
      propositions,
      offers: parsePropositions(propositions),
      rawResponse,
    };
  } catch (error) {
    throw new Error(safeErrorMessage(error, "fetchTargetOffers"));
  }
}

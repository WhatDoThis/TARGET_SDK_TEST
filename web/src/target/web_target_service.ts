/**
 * web.target.web_target_service (Web Target 개인화)
 * ================================================
 * alloy sendEvent로 decision scope를 요청하고 proposition/JSON 오퍼를 파싱한다.
 *
 * [Main Functions]
 * ===========
 * - 1. fetchTargetOffers — renderDecisions:false + decisionScopes 요청
 * - 2. parsePropositions — propositions → OfferPayload 추출
 *
 * [Dependencies]
 * =========
 * - init/web_init
 * - target/web_target_types
 * - shared/web_shared_utils
 */

import { getAlloy } from "../init/web_init";
import type {
  OfferPayload,
  ParsedOffer,
  TargetFetchResult,
} from "./web_target_types";
import { safeErrorMessage } from "../shared/web_shared_utils";

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
      const content = item?.data?.content;
      let payload: OfferPayload | null = null;

      if (typeof content === "string") {
        try {
          payload = JSON.parse(content) as OfferPayload;
        } catch {
          payload = { body: content };
        }
      } else if (content != null && typeof content === "object") {
        payload = content as OfferPayload;
      }

      offers.push({ scope, payload, rawItem: item });
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
    const alloy = getAlloy();
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

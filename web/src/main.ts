/**
 * web.main (Web 엔트리)
 * =====================
 * config → init → UI 오케스트레이션. testNum 선택 후 sendEvent. 백엔드 호출 없음.
 *
 * [Main Functions]
 * ===========
 * - 1. bootstrap — SDK 초기화 후 UI 마운트
 *
 * [Dependencies]
 * =========
 * - config/web_config
 * - init/web_init
 * - target/web_target_service
 * - identity/web_identity_service
 * - ui/web_ui
 */

import "./ui/styles.css";
import { loadWebConfig } from "./config/web_config";
import { initWebSdk } from "./init/web_init";
import { fetchTargetOffers } from "./target/web_target_service";
import { fetchEcid } from "./identity/web_identity_service";
import {
  getSelectedTestNum,
  mountUi,
  parseEventPopup,
  renderDebug,
  renderOffers,
  setBusy,
  setStatus,
  showEventPopup,
} from "./ui/web_ui";
import { safeErrorMessage } from "./shared/web_shared_utils";

// 1.
async function bootstrap(): Promise<void> {
  const root = document.getElementById("app");
  if (!root) {
    throw new Error("[bootstrap] #app root not found");
  }

  const config = loadWebConfig();
  const handles = mountUi(root, {
    decisionScope: config.target.decisionScope,
    onFetch: () => {
      void handleFetch(handles, config.target.decisionScope);
    },
    onIdentity: () => {
      void handleIdentity(handles);
    },
  });

  try {
    setStatus("Configuring alloy…");
    await initWebSdk(config);
    setStatus("SDK configured. Select testNum and Fetch offers.", "ok");
  } catch (error) {
    setStatus(safeErrorMessage(error, "bootstrap"), "err");
    renderDebug({ error: String(error) });
  }
}

async function handleFetch(
  handles: ReturnType<typeof mountUi>,
  decisionScope: string
): Promise<void> {
  setBusy(handles, true);
  const testNum = getSelectedTestNum(handles);
  setStatus(`sendEvent… testNum=${testNum}`);

  try {
    const result = await fetchTargetOffers(decisionScope, testNum);
    renderOffers(result.offers);
    const eventPopup = parseEventPopup(result.offers);
    showEventPopup(eventPopup);
    renderDebug({
      request: {
        decisionScope,
        testNum,
        data: { __adobe: { target: { testNum } } },
      },
      eventPopup,
      response: result.rawResponse,
    });

    const first = result.offers[0]?.payload;
    if (eventPopup) {
      setStatus(
        `event-popup (testNum=${testNum}): ${eventPopup.title ?? "이벤트 대상"}`,
        "ok"
      );
    } else if (first?.title || first?.body) {
      setStatus(
        `Offer received (testNum=${testNum}): ${first.title ?? "(title)"}`,
        "ok"
      );
    } else {
      setStatus(
        `sendEvent OK · testNum=${testNum} · propositions=${result.propositions.length} (no JSON title/body)`,
        "ok"
      );
    }
  } catch (error) {
    setStatus(safeErrorMessage(error, "handleFetch"), "err");
    renderDebug({ error: String(error) });
  } finally {
    setBusy(handles, false);
  }
}

async function handleIdentity(
  handles: ReturnType<typeof mountUi>
): Promise<void> {
  setBusy(handles, true);
  try {
    const ecid = await fetchEcid();
    setStatus(ecid ? `ECID: ${ecid}` : "ECID unavailable", ecid ? "ok" : "err");
  } finally {
    setBusy(handles, false);
  }
}

void bootstrap();

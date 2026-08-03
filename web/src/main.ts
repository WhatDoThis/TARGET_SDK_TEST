/**
 * web.main (오케스트레이션 · init → Fetch → 렌더)
 * ==============================================
 * 1 config → 2 init(alloy) → 3 target sendEvent → 4 UI.
 * KPI: testNum 매칭 오퍼(특히 event-popup) 표시.
 *
 * [Main Functions]
 * ===========
 * - 1. bootstrap — SDK 초기화 후 UI 마운트
 *
 * [Dependencies]
 * =========
 * - 01_config/web_config
 * - 02_init/web_init
 * - 03_target/web_target_service
 * - 04_ui/web_ui
 * - shared/web_shared_utils
 */

import "./04_ui/styles.css";
import { loadWebConfig } from "./01_config/web_config";
import { initWebSdk } from "./02_init/web_init";
import { fetchTargetOffers } from "./03_target/web_target_service";
import {
  getSelectedTestNum,
  mountUi,
  parseEventPopup,
  renderDebug,
  renderOffers,
  setBusy,
  setStatus,
  showEventPopup,
} from "./04_ui/web_ui";
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
        `Offer (testNum=${testNum}): ${first.title ?? "(title)"}`,
        "ok"
      );
    } else {
      setStatus(
        `Empty offers · testNum=${testNum} · propositions=${result.propositions.length}`,
        "info"
      );
    }
  } catch (error) {
    setStatus(safeErrorMessage(error, "handleFetch"), "err");
    renderDebug({ error: String(error) });
  } finally {
    setBusy(handles, false);
  }
}

void bootstrap();

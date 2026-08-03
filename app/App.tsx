/**
 * app.App (오케스트레이션 · init → Fetch → 렌더)
 * ==============================================
 * 1 config → 2 init(ECID) → 3 target Fetch → 4 UI.
 * KPI: testNum 매칭 오퍼(특히 event-popup) 표시.
 *
 * [Main Functions]
 * ===========
 * - 1. App — 초기화·Fetch 핸들러·화면 연결
 *
 * [Dependencies]
 * =========
 * - 01_config/app_config
 * - 02_init/app_init
 * - 03_target/app_target_service
 * - 04_ui/AppScreen
 * - shared/app_shared_utils
 */

import React, { useEffect, useState } from "react";
import { loadAppConfig } from "./src/01_config/app_config";
import { initMobileSdk, waitForEdgeReady } from "./src/02_init/app_init";
import {
  fetchTargetOffers,
  parseEventPopup,
} from "./src/03_target/app_target_service";
import type {
  EventPopupOffer,
  ParsedOffer,
  TestNum,
} from "./src/03_target/app_target_types";
import { AppScreen } from "./src/04_ui/AppScreen";
import { safeErrorMessage } from "./src/shared/app_shared_utils";

const config = loadAppConfig();

// 1.
export default function App(): React.JSX.Element {
  const [status, setStatus] = useState("Initializing…");
  const [statusKind, setStatusKind] = useState<"ok" | "err" | "info">("info");
  const [busy, setBusy] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const [testNum, setTestNum] = useState<TestNum>("3");
  const [offers, setOffers] = useState<ParsedOffer[]>([]);
  const [debugPayload, setDebugPayload] = useState<unknown>({ phase: "boot" });
  const [eventPopup, setEventPopup] = useState<EventPopupOffer | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await initMobileSdk(config);
        if (cancelled) {
          return;
        }
        setStatus("Waiting for ECID…");
        const ready = await waitForEdgeReady();
        if (cancelled) {
          return;
        }
        setSdkReady(true);
        setStatus(
          `SDK ready · ecid=${ready.ecid} · scope=${config.target.decisionScope}`
        );
        setStatusKind("ok");
        setDebugPayload({
          phase: "ready",
          ecid: ready.ecid,
          decisionScope: config.target.decisionScope,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setStatus(safeErrorMessage(error, "App.init"));
        setStatusKind("err");
        setDebugPayload({ phase: "failed", error: String(error) });
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onFetch = async (): Promise<void> => {
    if (!sdkReady) {
      return;
    }
    setBusy(true);
    setStatus(`Fetching… testNum=${testNum}`);
    setStatusKind("info");

    try {
      const result = await fetchTargetOffers(
        config.target.decisionScope,
        testNum
      );
      const popup = parseEventPopup(result.offers);
      setOffers(result.offers);
      setEventPopup(popup);
      setDebugPayload({
        request: {
          decisionScope: config.target.decisionScope,
          testNum,
        },
        eventPopup: popup,
        response: result.rawPropositions,
      });

      if (popup) {
        setStatus(
          `event-popup (testNum=${testNum}): ${popup.title ?? "이벤트 대상"}`
        );
        setStatusKind("ok");
      } else {
        const first = result.offers[0]?.payload;
        if (first?.title || first?.body) {
          setStatus(
            `Offer (testNum=${testNum}): ${first.title ?? "(title)"}`
          );
          setStatusKind("ok");
        } else {
          setStatus(
            "Empty offers — check Location Live / audience testNum / Property Token"
          );
          setStatusKind("info");
        }
      }
    } catch (error) {
      setStatus(safeErrorMessage(error, "App.onFetch"));
      setStatusKind("err");
      setDebugPayload({ error: String(error) });
      setEventPopup(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen
      decisionScope={config.target.decisionScope}
      status={status}
      statusKind={statusKind}
      busy={busy || !sdkReady}
      testNum={testNum}
      onTestNumChange={setTestNum}
      offers={offers}
      debugPayload={debugPayload}
      eventPopup={eventPopup}
      onClosePopup={() => setEventPopup(null)}
      onFetch={() => {
        void onFetch();
      }}
    />
  );
}

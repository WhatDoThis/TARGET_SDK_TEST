/**
 * app.App (App 루트 오케스트레이션)
 * ================================
 * config → init → Assurance(딥링크/Quick Connect) → Optimize fetch → event-popup.
 * 네이티브 모듈 경로(WebView 아님). 백엔드 없음.
 *
 * [Main Functions]
 * ===========
 * - 1. App — 초기화·Assurance/Fetch/ECID/팝업 핸들러
 *
 * [Dependencies]
 * =========
 * - react / react-native
 * - config/app_config
 * - init/app_init
 * - assurance/app_assurance_service
 * - target/app_target_service
 * - identity/app_identity_service
 * - ui/AppScreen
 */

import React, { useEffect, useState } from "react";
import { Linking } from "react-native";
import { loadAppConfig } from "./src/config/app_config";
import { initMobileSdk } from "./src/init/app_init";
import {
  ASSURANCE_APP_SCHEME,
  connectAssuranceSession,
  isAssuranceSessionUrl,
  startAssuranceQuickConnect,
} from "./src/assurance/app_assurance_service";
import {
  fetchTargetOffers,
  parseEventPopup,
} from "./src/target/app_target_service";
import type {
  EventPopupOffer,
  ParsedOffer,
  TestNum,
} from "./src/target/app_target_types";
import { fetchEcid } from "./src/identity/app_identity_service";
import { AppScreen } from "./src/ui/AppScreen";
import { safeErrorMessage } from "./src/shared/app_shared_utils";

const config = loadAppConfig();

// 1.
export default function App(): React.JSX.Element {
  const [status, setStatus] = useState("Initializing Mobile SDK…");
  const [statusKind, setStatusKind] = useState<"ok" | "err" | "info">("info");
  const [busy, setBusy] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const [testNum, setTestNum] = useState<TestNum>("3");
  const [assuranceUrl, setAssuranceUrl] = useState(
    config.assurance.assuranceSessionUrl
  );
  const [offers, setOffers] = useState<ParsedOffer[]>([]);
  const [debugPayload, setDebugPayload] = useState<unknown>({});
  const [eventPopup, setEventPopup] = useState<EventPopupOffer | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await initMobileSdk(config);
        if (cancelled) {
          return;
        }
        setSdkReady(true);
        setStatus(
          `SDK configured. Assurance Base URL = ${ASSURANCE_APP_SCHEME}://`
        );
        setStatusKind("ok");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setStatus(safeErrorMessage(error, "App.init"));
        setStatusKind("err");
        setDebugPayload({ error: String(error) });
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

  // 앱 스킴 딥링크로 열린 경우 startSession(url)
  useEffect(() => {
    if (!sdkReady) {
      return;
    }

    const handleUrl = (url: string | null): void => {
      if (!url || !isAssuranceSessionUrl(url)) {
        return;
      }
      try {
        setAssuranceUrl(url);
        connectAssuranceSession(url);
        setStatus("Assurance deeplink → PIN 입력 후 Connect");
        setStatusKind("info");
      } catch (error) {
        setStatus(safeErrorMessage(error, "App.Linking"));
        setStatusKind("err");
      }
    };

    void Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });
    return () => {
      sub.remove();
    };
  }, [sdkReady]);

  const onFetch = async (): Promise<void> => {
    setBusy(true);
    setStatus(`updatePropositions… testNum=${testNum}`);
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
          data: { __adobe: { target: { testNum } } },
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
            `Offer received (testNum=${testNum}): ${first.title ?? "(title)"}`
          );
        } else {
          setStatus(
            `Optimize OK · testNum=${testNum} · offers=${result.offers.length}`
          );
        }
        setStatusKind("ok");
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

  const onIdentity = async (): Promise<void> => {
    setBusy(true);
    try {
      const ecid = await fetchEcid();
      setStatus(ecid ? `ECID: ${ecid}` : "ECID unavailable");
      setStatusKind(ecid ? "ok" : "err");
    } finally {
      setBusy(false);
    }
  };

  const onAssuranceConnect = (): void => {
    try {
      connectAssuranceSession(assuranceUrl);
      setStatus("Assurance startSession(url) — 앱 PIN 입력 후 웹 Connect");
      setStatusKind("info");
    } catch (error) {
      setStatus(safeErrorMessage(error, "App.onAssuranceConnect"));
      setStatusKind("err");
    }
  };

  const onAssuranceQuickConnect = (): void => {
    try {
      startAssuranceQuickConnect();
      setStatus(
        "Quick Connect 호출됨 (debug APK만 동작). 웹 Available Devices에서 기기 선택"
      );
      setStatusKind("info");
    } catch (error) {
      setStatus(safeErrorMessage(error, "App.onAssuranceQuickConnect"));
      setStatusKind("err");
    }
  };

  return (
    <AppScreen
      decisionScope={config.target.decisionScope}
      status={status}
      statusKind={statusKind}
      busy={busy}
      testNum={testNum}
      onTestNumChange={setTestNum}
      assuranceUrl={assuranceUrl}
      onAssuranceUrlChange={setAssuranceUrl}
      onAssuranceConnect={onAssuranceConnect}
      onAssuranceQuickConnect={onAssuranceQuickConnect}
      offers={offers}
      debugPayload={debugPayload}
      eventPopup={eventPopup}
      onClosePopup={() => setEventPopup(null)}
      onFetch={() => {
        void onFetch();
      }}
      onIdentity={() => {
        void onIdentity();
      }}
    />
  );
}

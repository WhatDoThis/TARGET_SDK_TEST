/**
 * app.App (App 루트 — 공식 골든 패스)
 * ==================================
 * init → Edge ready(ECID) → Fetch(Optimize) → 오퍼 표시.
 * ECID 실패 시 diagnostics(appId·lastError)를 Raw JSON에 노출. Assurance는 디버그 수동만.
 *
 * [Main Functions]
 * ===========
 * - 1. App — 초기화·Fetch/ECID/Assurance 핸들러
 *
 * [Dependencies]
 * =========
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
import {
  getLastInitDiagnostics,
  initMobileSdk,
  waitForEdgeReady,
} from "./src/init/app_init";
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
        setStatus("Waiting Edge Identity (Tags config download)…");
        const ready = await waitForEdgeReady();
        if (cancelled) {
          return;
        }
        setSdkReady(true);
        setStatus(
          `SDK ready · ecid=${ready.ecid} · scope=${config.target.decisionScope} · Fetch`
        );
        setStatusKind("ok");
        setDebugPayload({
          path: "official-golden-path",
          appId: config.adobeMobile.adobeMobileAppId,
          decisionScope: config.target.decisionScope,
          ecid: ready.ecid,
          debugOverrides: config.debug,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setStatus(safeErrorMessage(error, "App.init"));
        setStatusKind("err");
        setDebugPayload({
          error: String(error),
          path: "official-golden-path",
          diagnostics: getLastInitDiagnostics(),
          hint:
            "ECID timeout = Tags config not on device yet (not Target). " +
            "Check Dev Publish / appId / Edge Datastream. " +
            "Temp: EXPO_PUBLIC_DEBUG_EDGE_CONFIG_ID + rebuild.",
        });
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
        setStatus("Assurance deeplink → PIN (debug)");
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
          setStatusKind("ok");
        } else {
          setStatus(
            `Optimize responded · empty offers · check Target Location=aep-app-test-scope Live`
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
      setStatus(
        `Assurance (debug) · Base=${ASSURANCE_APP_SCHEME}:// · enter PIN`
      );
      setStatusKind("info");
    } catch (error) {
      setStatus(safeErrorMessage(error, "App.onAssuranceConnect"));
      setStatusKind("err");
    }
  };

  const onAssuranceQuickConnect = (): void => {
    try {
      startAssuranceQuickConnect();
      setStatus("Quick Connect (debug APK only)");
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

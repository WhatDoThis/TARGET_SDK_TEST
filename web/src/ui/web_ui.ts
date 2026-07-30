/**
 * web.ui.web_ui (Web 테스트 UI)
 * ============================
 * testNum 선택·오퍼 카드·event-popup 모달·원시 JSON 디버그를 렌더한다.
 *
 * [Main Functions]
 * ===========
 * - 1. mountUi — 루트 DOM 구성
 * - 2. setStatus — 상태 배너 갱신
 * - 3. renderOffers — 오퍼 카드 표시
 * - 4. renderDebug — 원시 JSON pretty print
 * - 5. setBusy — 버튼 활성/비활성
 * - 6. getSelectedTestNum — testNum 셀렉트 값
 * - 7. parseEventPopup — type===event-popup 추출
 * - 8. showEventPopup / hideEventPopup — 모달 표시·닫기
 *
 * [Dependencies]
 * =========
 * - target/web_target_types
 * - shared/web_shared_utils
 */

import type {
  EventPopupOffer,
  OfferPayload,
  ParsedOffer,
  TestNum,
} from "../target/web_target_types";
import { prettyJson } from "../shared/web_shared_utils";

const EVENT_POPUP_TYPE = "event-popup";
const POPUP_ROOT_ID = "event-popup-root";

export interface UiHandles {
  fetchButton: HTMLButtonElement;
  identityButton: HTMLButtonElement;
  testNumSelect: HTMLSelectElement;
}

export interface MountUiOptions {
  onFetch: () => void;
  onIdentity: () => void;
  decisionScope: string;
}

// 1.
export function mountUi(root: HTMLElement, options: MountUiOptions): UiHandles {
  root.innerHTML = `
    <main class="page">
      <h1>AEP Web SDK · Target Test</h1>
      <p class="sub">scope: <code>${options.decisionScope}</code> · Edge Network · headless JSON</p>
      <div class="row controls">
        <label class="field" for="testNum">
          <span>testNum</span>
          <select id="testNum" name="testNum">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3" selected>3</option>
          </select>
        </label>
        <button id="btn-fetch" type="button">Fetch offers (sendEvent)</button>
        <button id="btn-identity" class="secondary" type="button">Get ECID</button>
      </div>
      <div id="status" class="status">Ready</div>
      <div id="offers"></div>
      <label for="debug">Raw response</label>
      <pre id="debug">{}</pre>
    </main>
    <div id="${POPUP_ROOT_ID}"></div>
  `;

  const fetchButton = root.querySelector("#btn-fetch") as HTMLButtonElement;
  const identityButton = root.querySelector("#btn-identity") as HTMLButtonElement;
  const testNumSelect = root.querySelector("#testNum") as HTMLSelectElement;

  fetchButton.addEventListener("click", options.onFetch);
  identityButton.addEventListener("click", options.onIdentity);

  return { fetchButton, identityButton, testNumSelect };
}

// 2.
export function setStatus(message: string, kind: "ok" | "err" | "info" = "info"): void {
  const el = document.getElementById("status");
  if (!el) {
    return;
  }
  el.textContent = message;
  el.className = `status${kind === "info" ? "" : ` ${kind}`}`;
}

// 3.
export function renderOffers(offers: ParsedOffer[]): void {
  const el = document.getElementById("offers");
  if (!el) {
    return;
  }

  if (offers.length === 0) {
    el.innerHTML = `<div class="offer"><p>No propositions for this scope. Check Target activity publish + decisionScope.</p></div>`;
    return;
  }

  el.innerHTML = offers
    .map((offer) => {
      const title = offer.payload?.title ?? "(no title)";
      const body = offer.payload?.body ?? "(no body)";
      const type = offer.payload?.type ?? "-";
      return `
        <article class="offer">
          <h2>${escapeHtml(String(title))}</h2>
          <p>${escapeHtml(String(body))}</p>
          <div class="meta">scope=${escapeHtml(offer.scope)} · type=${escapeHtml(String(type))}</div>
        </article>
      `;
    })
    .join("");
}

// 4.
export function renderDebug(value: unknown): void {
  const el = document.getElementById("debug");
  if (!el) {
    return;
  }
  el.textContent = prettyJson(value);
}

// 5.
export function setBusy(handles: UiHandles, busy: boolean): void {
  handles.fetchButton.disabled = busy;
  handles.identityButton.disabled = busy;
  handles.testNumSelect.disabled = busy;
}

// 6.
export function getSelectedTestNum(handles: UiHandles): TestNum {
  const value = handles.testNumSelect.value;
  if (value === "1" || value === "2" || value === "3") {
    return value;
  }
  return "3";
}

// 7.
export function parseEventPopup(offers: ParsedOffer[]): EventPopupOffer | null {
  for (const offer of offers) {
    const candidates = flattenCandidates(offer.payload);
    for (const candidate of candidates) {
      if (candidate?.type !== EVENT_POPUP_TYPE) {
        continue;
      }
      return {
        title: trimOrUndefined(candidate.title),
        body: trimOrUndefined(candidate.body),
        buttonText: trimOrUndefined(candidate.buttonText),
      };
    }
  }
  return null;
}

// 8.
export function showEventPopup(offer: EventPopupOffer | null): void {
  const root = document.getElementById(POPUP_ROOT_ID);
  if (!root) {
    return;
  }
  if (!offer) {
    root.innerHTML = "";
    return;
  }

  const title = offer.title || "이벤트 대상";
  const body = offer.body || "축하합니다!";
  const buttonText = offer.buttonText || "확인";

  root.innerHTML = `
    <div class="event-popup-backdrop" role="dialog" aria-modal="true">
      <div class="event-popup-card">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
        <button type="button" id="event-popup-close">${escapeHtml(buttonText)}</button>
      </div>
    </div>
  `;

  const closeBtn = root.querySelector("#event-popup-close");
  closeBtn?.addEventListener("click", () => {
    hideEventPopup();
  });
}

export function hideEventPopup(): void {
  const root = document.getElementById(POPUP_ROOT_ID);
  if (root) {
    root.innerHTML = "";
  }
}

function flattenCandidates(payload: OfferPayload | null): OfferPayload[] {
  if (payload == null) {
    return [];
  }
  return [payload];
}

function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

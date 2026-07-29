/**
 * web.ui.web_ui (Web 테스트 UI)
 * ============================
 * SDK 상태·오퍼 title/body·원시 JSON 디버그 영역을 렌더한다.
 *
 * [Main Functions]
 * ===========
 * - 1. mountUi — 루트 DOM 구성
 * - 2. setStatus — 상태 배너 갱신
 * - 3. renderOffers — 오퍼 카드 표시
 * - 4. renderDebug — 원시 JSON pretty print
 * - 5. setBusy — 버튼 활성/비활성
 *
 * [Dependencies]
 * =========
 * - target/web_target_types
 * - shared/web_shared_utils
 */

import type { ParsedOffer } from "../target/web_target_types";
import { prettyJson } from "../shared/web_shared_utils";

export interface UiHandles {
  fetchButton: HTMLButtonElement;
  identityButton: HTMLButtonElement;
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
      <div class="row">
        <button id="btn-fetch" type="button">Fetch offers (sendEvent)</button>
        <button id="btn-identity" class="secondary" type="button">Get ECID</button>
      </div>
      <div id="status" class="status">Ready</div>
      <div id="offers"></div>
      <label for="debug">Raw response</label>
      <pre id="debug">{}</pre>
    </main>
  `;

  const fetchButton = root.querySelector("#btn-fetch") as HTMLButtonElement;
  const identityButton = root.querySelector("#btn-identity") as HTMLButtonElement;

  fetchButton.addEventListener("click", options.onFetch);
  identityButton.addEventListener("click", options.onIdentity);

  return { fetchButton, identityButton };
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
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

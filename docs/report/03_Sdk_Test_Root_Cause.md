# 03 SDK Test Root Cause — App ECID/Optimize 실패 분석·해결

> **목적:** Datastream·Tags·빌드 이후에도 KPI(오퍼 표시)가 안 될 때 **어느 레이어가 깨졌는지** 판정하고 **해결 순서**를 고정한다.  
> **KPI:** `aep-app-test-scope` JSON 오퍼 표시.  
> **스냅샷 일자:** 2026-07-31

---

## 0. 현황 스냅샷 (2026-07-31)

| 항목 | 목표 | 현재 |
|------|------|------|
| Tags CDN JSON (File ID) | org + edge.configId 제공 | **OK** — HTTP 200 실측 |
| App init 준비 (ECID) | `SDK ready · ecid=…` | **FAIL** — `waitForEdgeReady` timeout |
| Optimize Fetch | proposition 수신 | **미도달** (ECID 게이트) |
| KPI 오퍼 UI | title/body 또는 event-popup | **미달성** |

```text
[OK]  APK + AEP packages + initializeWithAppId
[OK]  Tags CDN 소스 (experienceCloud.org / edge.configId / edge.domain)
[FAIL] 기기에서 Edge Identity ECID 수신   ← 현재 병목 (init 준비 실패)
[?]   기기→assets.adobedtm.com 적용 / Identity EventHub 응답
[미도달] Optimize → Target → UI
```

**한 줄:** 콘솔·CDN 설정은 살아 있다. **기기 런타임에서 Identity 준비가 안 되어 init이 실패**하고, Fetch/Target은 아직 판단 구간이 아니다.

---

## 1. 원인 분석

### 1.1 직접 원인

`app/src/init/app_init.ts`의 `waitForEdgeReady`가  
`EdgeIdentity.getExperienceCloudId()`를 최대 45초 재시도해도 비어 있거나 `general.callback.timeout`만 반복 → **App.init 실패 · Fetch 비활성**.

ECID는 Fetch용 “추가 검사”가 아니라, 로그 **#17→#19**에서 정한 **본선 init 준비 신호**다.

| 이력 | 내용 |
|------|------|
| #17 | org(`getSdkIdentities`) 대기 — 없으면 Assurance/준비 실패 |
| #19 | Edge-only에서 org 부재 = **오탐** → **ECID로 준비 판정 교체** |
| #22 | `waitForEdgeReady(ECID)` 고정 |
| 현재 | 그 ECID조차 미수신 → init 준비의 본선 신호 실패 |

org를 안 기다리고 ECID도 안 받으면 init 단계에서 깨졌던 것과 같은 계열이다.  
“게이트를 새로 깔아서 후퇴했다”가 아니라 **준비 실패가 해소되지 않은 상태**다.

### 1.2 Adobe CDN은 정상 (소스 제외)

File ID `<org>/<property>/launch-xxxx-development` 실측:

| 키 | 값 |
|----|-----|
| `experienceCloud.org` | `<IMS_ORG>@AdobeOrg` |
| `edge.configId` | `<DATASTREAM_UUID>` |
| `edge.domain` | `<sandbox>.data.adobedc.net` |
| HTTP | **200** |

→ “Publish 안 함 / File ID 오타 / Datastream 비어 있음”은 **CDN 기준으로 제외**.  
문제는 **기기가 이 JSON을 적용하지 못하거나, Edge Identity가 응답하지 않는 것**.

### 1.3 가설 순위

| 순위 | 가설 | 근거 |
|------|------|------|
| A | 기기에서 Tags 설정 **미적용** (망·캐시·옛 APK) | CDN OK vs 기기 ECID fail; Raw에 `debugOverrides` 없으면 옛 APK |
| B | Edge Identity **EventHub 미응답**/등록 이상 | 45s 재시도 후에도 timeout — 단순 첫 호출 레이스 아님 |
| C | `edge.*` only override의 한계 | `experienceCloud.org` 없이 edge만 넣으면 Identity 준비 진단이 불완전 |
| D | (이후) Target/unexpected | ECID 통과 전에는 **판단 금지** |

### 1.4 과거 `general.unexpected`의 위치

edge override 등으로 Optimize가 Edge까지 간 적 있음 = **네이티브 Optimize·Edge 경로 부분 증명**.  
ECID 준비 완료의 증거는 아님. 현재 병목 판정에 쓰지 않는다.

### 1.5 잘못된 진단 교정

| 잘못된 가정 | 교정 |
|-------------|------|
| `DEBUG_EDGE_CONFIG_ID`만으로 ECID 치료/확정 | edge만으로는 **org 미주입**. org까지 override해야 Tags 미적용 vs Identity 등록을 가름 |
| Raw에 debugOverrides 없음 = env 버그 | 최신 코드는 실패 시에도 노출 → **옛 APK** 신호 |
| ECID 대기가 불필요한 허들 | 로그상 **init 본선 준비 신호** (org 오탐 대체) |

---

## 2. 해결 방안 (실행 순서)

### Step 0 — 새 APK 강제 (전제)

```bash
cd app && npx eas-cli build --platform android --profile preview --non-interactive
```

- **기존 앱 삭제 후** 설치 (설정 캐시 제거).
- 기동 Raw에 반드시:

```json
"debugOverrides": {
  "edgeConfigId": "3c324af6-…",
  "edgeDomain": "edge.adobedc.net",
  "experienceCloudOrg": "<IMS_ORG>@AdobeOrg",
  "edgeSource": "env" 
}
```

없으면 이후 검증 무효 (옛 바이너리).

### Step 1 — org 포함 debug override (진단 + 임시 해소)

Troubleshooting 전용. `updateConfiguration`에 아래를 **함께** 넣는다 (코드/EAS에 반영됨).

| 키 | 값 |
|----|-----|
| `experienceCloud.org` | CDN과 동일 org |
| `edge.configId` | Datastream UUID |
| `edge.domain` | 1차 `edge.adobedc.net` (샌드박스 DNS 분리) |

| 기동 결과 | 판정 | 다음 |
|-----------|------|------|
| `ecid=…` 성공 | 기기에서 Tags JSON **미적용**이 주원인 | Step 2 망/캐시 → 본선은 Tags만으로 재검증 |
| 여전히 ECID timeout | Identity **네이티브/EventHub** | Step 3 logcat |
| Raw에 override 없음 | 옛 APK | Step 0 반복 |

### Step 2 — 기기망·캐시

1. 셀룰러/다른 Wi‑Fi로 `assets.adobedtm.com` 재시도  
2. 앱 **uninstall** 후 재설치  
3. 법인 VPN·Private DNS OFF 후 재시험

### Step 3 — logcat으로 A/B 확정

```powershell
adb logcat -s AdobeExperienceSDK:V *:S
```

| logcat | 조치 |
|--------|------|
| `…/launch-a47665d87020-development.json` 200 후 org 반영 | Tags OK → Identity 등록/교착 점검 |
| 동일 URL 실패/404/timeout | 기기→CDN 망 해결 |
| `waiting for configuration with valid 'experienceCloud.org'` | 설정 shared state 미수신 — override·망 |
| `EdgeIdentity … waiting for its state change` | 클래식 Identity 대기 교착 — 패키지/등록 확인 |
| EdgeIdentity `extensionVersion` 없음 | 네이티브 링크·`void EdgeIdentity`·재 prebuild |

### Step 4 — ECID 통과 후 (비로소 Target)

1. Fetch  
2. `general.unexpected` → §3 콘솔 (클래식 Target 잔존, Location Live, Datastream)  
3. empty offers → Location=`aep-app-test-scope` · Live · audience  
4. title/body → **KPI 성공**

### Step 5 — 골든 패스 복귀 (수락용)

ECID가 **org override 덕에만** 뜨면:

1. DEBUG override 제거 (또는 env 비움)  
2. Tags Dev Publish + File ID만으로 재빌드  
3. 동일 기기에서 ECID → Fetch 재확인  

고객 가이드 본선은 계속: `initializeWithAppId` + Tags Edge (Datastream 코드 하드코딩 없음).

---

## 3. `general.unexpected` (ECID 통과 후만)

1. 클래식 Adobe Target 확장 제거 후 재Publish  
2. Target Location = `aep-app-test-scope` · Form JSON · Live  
3. Tags Edge Dev Datastream = Target ON  
4. Web `aep-web-test-scope` 교차 검증

---

## 4. 코드·진단 보완 (반영 사항)

- init 후 **ECID 대기** (본선 준비 신호, org 오탐 대체)  
- Raw 최상단 `debugOverrides` 항상 노출 (옛 APK 판별)  
- DEBUG: `edge.configId` + `edge.domain` + **`experienceCloud.org`** (+ smoke 폴백)  
- ECID 실패 시 `diagnostics` (appId · lastError · empty count)  
- Fetch: no-data → testNum 재시도 · empty는 경고

---

## 5. 재검증 체크리스트

- [ ] 새 preview APK · uninstall 후 설치  
- [ ] Raw에 `debugOverrides.experienceCloudOrg` 표시  
- [ ] `SDK ready · ecid=…`  
- [ ] Fetch → JSON 오퍼 UI  
- [ ] (수락) DEBUG 제거 후에도 ECID·Fetch 유지

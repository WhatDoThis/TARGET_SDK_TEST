# 03 SDK Test Root Cause — App ECID/Optimize 실패 분석·해결

> **목적:** Datastream·Tags·빌드 이후에도 KPI(오퍼 표시)가 안 될 때 **어느 레이어가 깨졌는지** 판정하고 **해결 순서**를 고정한다.  
> **KPI:** `aep-app-test-scope` JSON 오퍼 표시.  
> **스냅샷 일자:** 2026-07-31  
> **보안:** 공개 레포 — org / Datastream / File ID **실값 기재 금지**. 값은 로컬 `app/.env` 또는 EAS Secrets만 (`app/SECRETS.md`).

---

## 0. 현황 스냅샷 (2026-07-31)

| 항목 | 목표 | 당시 |
|------|------|------|
| Tags CDN JSON (File ID) | org + edge.configId 제공 | 실측 HTTP 200 (값은 로컬에서만 확인) |
| App init 준비 (ECID) | `SDK ready · ecid=…` | **FAIL** — `waitForEdgeReady` timeout → 이후 org DEBUG override로 해소 |
| Optimize Fetch | proposition 수신 | ECID 전에는 미도달 |
| KPI 오퍼 UI | title/body 또는 event-popup | 활동·audience·`testNum` 매칭 단계 |

```text
[OK]  APK + AEP packages + initializeWithAppId
[OK]  Tags CDN 소스 (org / edge.configId / edge.domain) — 콘솔·CDN에서 확인
[과거 FAIL→해소] 기기 Edge Identity ECID (Troubleshooting org override)
[진행] Optimize → Target → UI
```

---

## 1. 원인 분석 (요약)

### 1.1 직접 원인 (당시)

`app/src/02_init/app_init.ts`의 `waitForEdgeReady`가 ECID를 못 받아 init 실패.  
ECID는 Fetch 전 **본선 준비 신호**(로그 #17→#19 org 오탐 대체).

### 1.2 CDN vs 기기

공개 Tags CDN URL(`assets.adobedtm.com/<EnvironmentFileId>.json`)을 **로컬에서** GET 하면  
`experienceCloud.org` / `edge.configId` / `edge.domain` 존재 여부를 확인할 수 있다.  
CDN이 200이어도 **기기 미적용**이면 ECID timeout이 난다.

### 1.3 가설 순위 (당시)

| 순위 | 가설 |
|------|------|
| A | 기기 Tags 설정 미적용 (망·캐시·옛 APK) |
| B | Edge Identity EventHub 미응답 |
| C | edge.* only override로는 org 부족 |
| D | Target은 ECID 통과 후 판단 |

### 1.4 교정

| 잘못된 가정 | 교정 |
|-------------|------|
| `DEBUG_EDGE_CONFIG_ID`만으로 ECID 확정 | **org도** 필요 |
| ECID 대기 = 불필요 허들 | init 본선 준비 신호 |

---

## 2. 해결 방안

### Step 0 — 비밀은 Git 밖

실값 주입 위치: `app/SECRETS.md` 참고.  
`eas.json` / 소스 / docs 에 UUID·org **커밋 금지**.

### Step 1 — Troubleshooting override (로컬 env만)

`EXPO_PUBLIC_DEBUG_EXPERIENCE_CLOUD_ORG` + `EDGE_CONFIG_ID` + `EDGE_DOMAIN` 을  
**app/.env 또는 EAS Secrets**에만 넣고 재빌드.

| 기동 결과 | 판정 |
|-----------|------|
| `ecid=…` | Tags 기기 미적용 우회 성공 → 이후 Tags-only 재검증 |
| 여전히 timeout | logcat Identity/망 |
| placeholder appId | Secrets/.env 미설정 |

### Step 2~3 — 망·logcat

`adb logcat -s AdobeExperienceSDK:V *:S`  
`assets.adobedtm.com/.../launch-….json` 성공 여부, `experienceCloud.org` waiting 문구.

### Step 4 — Target

Location=`aep-app-test-scope` · Live · audience `testNum` · Datastream Property Token(콘솔).

### Step 5 — 골든 패스

DEBUG env 제거 후에도 ECID·Fetch 되면 수락.

---

## 3. `general.unexpected` (ECID 통과 후)

클래식 Target 확장 제거 · Location Live · Datastream Target ON · Web scope 교차.

---

## 4. 코드 위치 (샘플)

| 단계 | 경로 |
|------|------|
| config | `app/src/01_config/app_config.ts` |
| init | `app/src/02_init/app_init.ts` |
| request/parse | `app/src/03_target/app_target_service.ts` |
| UI | `app/src/04_ui/AppScreen.tsx` |

# 01 Architecture — AEP SDK Target 테스트 시스템

> 근거: `docs/main/01_AEP_SDK_TARGET_TEST_PRD.md` + Adobe Edge Network / Optimize 공식문서  
> 환경: Dev 단일 · 백엔드 없음 · Web SDK 선택 = **npm `@adobe/alloy`**  
> 샘플 목적: **초기화 → 요청 → 반환 → 오퍼 렌더** 학습용 최소 코드

## 한 줄

```text
Datastream(Target ON) ← Edge ← web(alloy) / app(Edge+Optimize) → JSON 오퍼 표시
```

## 채널 분리

| 경로 | 채널 | SDK | 찾을 기능 |
|------|------|-----|-----------|
| `web/` | 브라우저 | `@adobe/alloy` | configure + sendEvent → propositions |
| `app/` | 네이티브(RN) | Mobile Core + Edge + EdgeIdentity + Optimize | updatePropositions → getPropositions |

의존성·번들은 채널별로 완전 분리한다.

## 패키지 맵 (학습 순서)

각 채널 `src/` 아래 **번호 폴더**가 흐름 순서다.

| 순서 | 폴더 | 역할 | Web | App |
|------|------|------|-----|-----|
| — | `shared/` | 순수 유틸 | `web_shared_utils.ts` | `app_shared_utils.ts` |
| 1 | `01_config/` | Dev env 로드 | `web_config.ts` | `app_config.ts` |
| 2 | `02_init/` | SDK 1회 초기화 | `web_init.ts` | `app_init.ts` |
| 3 | `03_target/` | 요청·오퍼 파싱(반환) | `web_target_*.ts` | `app_target_*.ts` |
| 4 | `04_ui/` | 버튼·오퍼·팝업 렌더 | `web_ui.ts` | `AppScreen.tsx` |

엔트리(오케스트레이션만): `web/src/main.ts`, `app/App.tsx`.

규칙: 도메인 폴더끼리 직접 import 금지 → 필요 시 `shared/` 경유.  
App init의 ECID 대기는 준비 신호이며, 별도 identity 패키지/Assurance UI는 샘플에서 제거했다.

## 환경변수 배치

| 파일 | 그룹 | 키 |
|------|------|-----|
| `web/env/config.dev.json` | `adobeEdge` | `orgId`, `datastreamId`, `edgeDomain` |
| | `target` | `decisionScope` |
| | `debug` | `debugEnabled` |
| `app/env/config.dev.example.json` | `adobeMobile` | `adobeMobileAppId` |
| | `target` | `decisionScope` |
| | `debug` | `edgeConfigId`, `edgeDomain`, `experienceCloudOrg` (**Troubleshooting만**) |
| `eas.json` 본선 | | `EXPO_PUBLIC_ADOBE_MOBILE_APP_ID`, `EXPO_PUBLIC_DECISION_SCOPE` |
| `eas.json` Troubleshooting | | `EXPO_PUBLIC_DEBUG_*` (org/edge) |
| 고객 가이드 | `docs/report/02_Customer_Config_Guide.md` | 골든 패스·체크리스트 |

## 데이터 흐름

```text
[01_config] → [02_init] → Fetch 버튼 → [03_target] → Edge/Target → [04_ui] 표시
```

## Adobe 콘솔 선행 (코드 밖)

1. Datastream Dev + Target 서비스 ON → `datastreamId` / Tags Edge `edge.configId`  
   — Property Token은 Datastream Target 서비스에 설정(앱 코드 아님)
2. Form-based JSON 활동 — Location = env `decisionScope`와 동일 · Live  
   — 팝업: `{ "type": "event-popup", "title", "body", "buttonText" }`
3. App: Mobile Tags(Core·EdgeIdentity·Edge·Optimize) Dev Publish → `adobeMobileAppId`  
   — 클래식 Adobe Target 확장 금지. 상세: `02_Customer_Config_Guide.md`

# 01 Architecture — AEP SDK Target 테스트 시스템

> 근거: `docs/main/01_AEP_SDK_TARGET_TEST_PRD.md` + Adobe Edge Network / Optimize 공식문서  
> 환경: Dev 단일 · 백엔드 없음 · Web SDK 선택 = **npm `@adobe/alloy`**

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

## 패키지 맵 (기능 위치)

각 채널 `src/` 아래 도메인 폴더만 보면 역할을 알 수 있다.

| 패키지 | 역할 | Web | App |
|--------|------|-----|-----|
| `config/` | Dev env 로드·검증 | `web_config.ts` | `app_config.ts` |
| `init/` | SDK 1회 초기화 | `web_init.ts` (alloy configure) | `app_init.ts` (MobileCore + 확장) |
| `target/` | 개인화 요청·오퍼 파싱 | `web_target_service.ts` | `app_target_service.ts` |
| `identity/` | ECID 조회(선택) | `web_identity_service.ts` | `app_identity_service.ts` |
| `ui/` | 버튼·상태·JSON 표시 | `web_ui.ts` | `AppScreen.tsx` |
| `shared/` | 순수 유틸(도메인 간 공유) | `web_shared_utils.ts` | `app_shared_utils.ts` |

규칙: 도메인 폴더끼리 직접 import 금지 → 필요 시 `shared/` 경유.  
엔트리만 오케스트레이션: `web/src/main.ts`, `app/App.tsx`.

## 환경변수 배치

채널당 Dev 파일 1개. 키를 **용도 그룹**으로 묶고, 값은 플레이스홀더만 둔다.

| 파일 | 그룹 | 키 |
|------|------|-----|
| `web/env/config.dev.json` | `adobeEdge` | `orgId`, `datastreamId`, `edgeDomain` |
| | `target` | `decisionScope` |
| | `debug` | `debugEnabled` |
| `app/env/config.dev.json` | `adobeMobile` | `adobeMobileAppId`, `edgeDomain` |
| | `target` | `decisionScope` |
| | `assurance` | `assuranceSessionUrl` |

예시 템플릿: 각 채널 `env/config.dev.example.json` (동일 스키마).

## 데이터 흐름

```text
[config] → [init] → 사용자 버튼 → [target] → Edge/Target → [ui] 표시
                              ↘ [identity] ECID (선택)
```

## Adobe 콘솔 선행 (코드 밖)

1. Datastream Dev + Target 서비스 ON → `datastreamId` / Tags Edge `edge.configId`
2. Form-based JSON 활동 — Web/App scope 문자열을 env와 동일하게
3. App: Mobile Tags(Core·EdgeIdentity·Edge·Optimize) Dev Publish → `adobeMobileAppId`

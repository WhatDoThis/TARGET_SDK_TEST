# App secrets — 어디에 넣나 (공개 Git 금지)

이 레포는 **public** 이다. org / Datastream / Tags File ID 실값은 **절대 커밋하지 않는다.**

## 로컬 실값 보관 위치 (gitignore · 지우지 말 것)

| 파일 | 용도 |
|------|------|
| **`app/.env`** | **빌드에 실제 사용** — `EXPO_PUBLIC_*` (주 입력처). 상단에 키별 **출처**(Adobe 콘솔) 주석 있음 |
| **`app/env/config.dev.json`** | 같은 값 JSON **백업·참고** (앱이 직접 import 안 함). `_readme` / `_where` 필드에 설명 |
| **`web/env/config.dev.json`** | Web alloy org/datastream 실값 |

위 파일은 `.gitignore`에 있다. 팀원 PC·리눅스 빌드 서버에도 동일하게 복사해 둔다.  
`.env`와 `config.dev.json` 값은 **서로 맞춰 둘 것** (주 소스는 `.env`).

## 넣는 위치

| 용도 | 파일/장소 | Git |
|------|-----------|-----|
| 로컬 개발·빌드 서버 | `app/.env` (+ 선택 `app/env/config.dev.json`) | **ignore** |
| Web 로컬 | `web/env/config.dev.json` | **ignore** |
| EAS 클라우드 빌드 | [Expo Secrets](https://docs.expo.dev/eas/environment-variables/) 에 `EXPO_PUBLIC_*` 등록 | 대시보드만 |
| 템플릿(커밋 OK) | `app/.env.example`, `app/eas.json` 플레이스홀더, `*/config.dev.example.json` | tracked |

## 키 · 출처

| 키 | 출처 (Adobe 콘솔) |
|----|-------------------|
| `EXPO_PUBLIC_ADOBE_MOBILE_APP_ID` | Tags → Mobile → Environment → **Environment File ID** |
| `EXPO_PUBLIC_DECISION_SCOPE` | Target 활동 Location (예: `aep-app-test-scope`) — 비밀 아님 |
| `EXPO_PUBLIC_DEBUG_EDGE_CONFIG_ID` | Datastreams → **Datastream ID** (Troubleshooting) |
| `EXPO_PUBLIC_DEBUG_EDGE_DOMAIN` | Edge host (Troubleshooting) |
| `EXPO_PUBLIC_DEBUG_EXPERIENCE_CLOUD_ORG` | IMS Org `…@AdobeOrg` (Troubleshooting) |

값을 **넣는 곳**은 `app/.env`(또는 EAS Secrets). 콘솔은 출처일 뿐이다.

코드 진입점: `app/src/01_config/app_config.ts` (상단 docstring에 동일 안내).

## 이미 Git에 올린 적 있는 경우

워킹트리만 지워도 **과거 커밋 history에는 남을 수 있다.**  
공개 전환 전이라면 history rewrite(filter-repo/BFG) 또는 레포 재생성 후 force-push를 검토한다.

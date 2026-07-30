# Log

## Log Index

7. 2026-07-30 App EAS 빌드용 expo-asset 등 의존성 보완
6. 2026-07-30 App testNum·event-popup 네이티브 동일 기능 추가
5. 2026-07-30 Web event-popup JSON 오퍼 모달 렌더 추가
4. 2026-07-30 Web sendEvent testNum(mbox) 파라미터·셀렉트 추가
3. 2026-07-30 web/app config.dev.json gitignore 추가
2. 2026-07-29 Git 저장소 초기화 및 원격 저장소 최초 푸시
1. 2026-07-22 AEP SDK Target 테스트 시스템 그린필드 구축

## Log Body

7. 2026-07-30 App EAS 빌드용 expo-asset 등 의존성 보완

Purpose: EAS Bundle JS 단계에서 실패한 expo-asset 누락 수정

Changes:

- expo-asset / expo-font / expo-constants / babel-preset-expo 추가
- babel.config.js, eas.json(APK preview) 추가
- app.json에 EAS projectId 연결

Changed files:

- app/package.json
- app/babel.config.js
- app/eas.json
- app/app.json
- docs/log/log.md

6. 2026-07-30 App testNum·event-popup 네이티브 동일 기능 추가

Purpose: Mobile Optimize 경로에 웹과 동일한 testNum 전달·event-popup 모달·UI 제공

Changes:

- updatePropositions data.__adobe.target.testNum 전달
- testNum 칩 UI(1/2/3) + event-popup Modal
- content 이중 JSON/배열 디코드, parseEventPopup
- expo run:android/ios 스크립트 (네이티브 빌드, Expo Go 아님)

Changed files:

- app/src/target/app_target_types.ts
- app/src/target/app_target_service.ts
- app/src/ui/AppScreen.tsx
- app/App.tsx
- app/package.json
- docs/log/log.md

5. 2026-07-30 Web event-popup JSON 오퍼 모달 렌더 추가

Purpose: type=event-popup JSON 오퍼를 파싱해 단순 모달로 표시

Changes:

- content 이중 JSON/배열 디코드 보강
- parseEventPopup + showEventPopup를 web_ui에 단순 구현
- Fetch 후 event-popup이면 모달 표시, 확인 시 닫기

Changed files:

- web/src/target/web_target_types.ts
- web/src/target/web_target_service.ts
- web/src/ui/web_ui.ts
- web/src/ui/styles.css
- web/src/main.ts
- docs/log/log.md

4. 2026-07-30 Web sendEvent testNum(mbox) 파라미터·셀렉트 추가

Purpose: Target 오디언스용 요청 파라미터 testNum(1|2|3)을 data.__adobe.target으로 전송

Changes:

- UI에 testNum 셀렉트 추가 (기본 3)
- sendEvent에 `data.__adobe.target.testNum` 전달 (profile./entity. 접두사 없음)
- Raw debug에 request/response 함께 표시

Changed files:

- web/src/target/web_target_service.ts
- web/src/target/web_target_types.ts
- web/src/ui/web_ui.ts
- web/src/ui/styles.css
- web/src/main.ts
- docs/log/log.md

3. 2026-07-30 web/app config.dev.json gitignore 추가

Purpose: Adobe Dev 실설정 파일이 저장소에 올라가지 않도록 제외

Changes:

- `web/env/config.dev.json`, `app/env/config.dev.json`을 .gitignore에 추가
- `*.example.json`은 계속 추적

Changed files:

- .gitignore
- docs/log/log.md

2. 2026-07-29 Git 저장소 초기화 및 원격 저장소 최초 푸시

Purpose: 프로젝트 폴더를 독립 Git 저장소로 초기화하고 GitHub 원격 저장소에 최초 커밋을 푸시

Changes:

- 프로젝트 폴더에서 `git init` 실행 (기존 홈 디렉터리 저장소 추적에서 분리)
- 기본 브랜치 `main` 설정 및 원격 `origin`(WhatDoThis/TARGET_SDK_TEST) 등록
- 전체 파일(36개) 최초 커밋 후 `origin/main`에 푸시 (config.dev.json은 placeholder만 포함, 실 시크릿 없음 확인)

Changed files:

- .git/ (저장소 초기화)
- docs/log/log.md

1. 2026-07-22 AEP SDK Target 테스트 시스템 그린필드 구축

Purpose: PRD·Adobe 공식문서 기준으로 Web(alloy)·App(Edge+Optimize) 최소 테스트 클라이언트를 채널·도메인 패키지로 분리해 구축

Changes:

- `web/`: Vite + `@adobe/alloy` — config/init/target/identity/ui/shared 패키지 + 용도별 env
- `app/`: Expo RN + AEP Mobile Optimize 경로 — 동일 도메인 패키지 분리 + 용도별 env
- `docs/report/`: Architecture·ReportIndex 추가
- Web `npm install` + `npm run build` 성공 확인

Changed files:

- docs/report/00_ReportIndex.md
- docs/report/01_Architecture.md
- docs/log/log.md
- web/**/*
- app/**/*
- .gitignore

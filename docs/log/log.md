# Log

## Log Index

31. 2026-08-03 app/.env·config.dev.json 채움 위치 주석 보강
30. 2026-08-03 gitignore 로컬 실값 파일 복구 (.env / config.dev.json)
29. 2026-08-03 공개 레포용 민감정보 제거 (org/Datastream/File ID)
28. 2026-08-03 App/Web 고객 샘플 코드 정리 (01~04 폴더·최소화)
27. 2026-08-03 App Fetch 항상 testNum 전송 (Target 오디언스 매칭)
26. 2026-07-31 ECID 병목 원인 확정·org override 해결안 반영
25. 2026-07-31 ECID 실패 시 debugOverrides 노출·smoke 폴백·edge.adobedc.net
24. 2026-07-31 EAS debug edge.configId·샌드박스 domain 임시 주입
23. 2026-07-31 App ECID timeout 진단 보강 (Tags 원격설정 미수신)
22. 2026-07-31 App Optimize 실패 원인 분석·Edge ready·Fetch 정리
21. 2026-07-31 Customer Guide Edge domain 샌드박스 기본값 정정
20. 2026-07-31 공식 골든 패스 재정립 (가이드·App 단순화)
19. 2026-07-31 App init org 오탐 제거 — ECID 기준 준비 판정
18. 2026-07-31 App Optimize general.unexpected — plain data·무파라미터 재시도
17. 2026-07-31 App Assurance org 대기 후 연결
16. 2026-07-31 App Assurance 세션 URL 하드코딩
15. 2026-07-31 App offer용 privacy OPT_IN·edge.configId 강제
14. 2026-07-31 App Assurance 앱스킴 Deep link 연결 경로
13. 2026-07-31 App Assurance Session URL 런타임 연결 UI
12. 2026-07-31 App Optimize 샘플 패턴·edge.adobedc.net 강제
11. 2026-07-31 App Optimize 콜백 미수신 — Map data·확장 진단
10. 2026-07-30 App Optimize timeout — AEP 7.x init/fetch 수정
9. 2026-07-30 App EAS Kotlin 1.9.25 고정 (Compose 호환)
8. 2026-07-30 App EAS용 config를 example+EXPO_PUBLIC로 전환
7. 2026-07-30 App EAS 빌드용 expo-asset 등 의존성 보완
6. 2026-07-30 App testNum·event-popup 네이티브 동일 기능 추가
5. 2026-07-30 Web event-popup JSON 오퍼 모달 렌더 추가
4. 2026-07-30 Web sendEvent testNum(mbox) 파라미터·셀렉트 추가
3. 2026-07-30 web/app config.dev.json gitignore 추가
2. 2026-07-29 Git 저장소 초기화 및 원격 저장소 최초 푸시
1. 2026-07-22 AEP SDK Target 테스트 시스템 그린필드 구축

## Log Body

31. 2026-08-03 app/.env·config.dev.json 채움 위치 주석 보강

Purpose: 어떤 파일이 빌드에 쓰이고 콘솔 어디서 값을 가져오는지 파일 안에 바로 보이게 함

Changes:

- `.env`: 역할·형제 파일 관계·키별 Adobe 콘솔 위치 주석
- `config.dev.json`: `_readme`/`_where`로 백업 용도·대응 EXPO_PUBLIC 키 명시
- SECRETS.md 동기화

Changed files:

- app/.env, app/env/config.dev.json, app/SECRETS.md, docs/log/log.md

30. 2026-08-03 gitignore 로컬 실값 파일 복구 (.env / config.dev.json)

Purpose: 공개 레포에서 실값을 뺀 뒤에도 로컬/서버에서 쓸 수 있도록 gitignore 경로에 실값을 다시 보관

Changes:

- `app/.env`, `app/env/config.dev.json`, `web/env/config.dev.json` 실값 복구
- `app/SECRETS.md`에 로컬 보관 위치 명시

Changed files:

- app/.env, app/env/config.dev.json, web/env/config.dev.json
- app/SECRETS.md, docs/log/log.md

29. 2026-08-03 공개 레포용 민감정보 제거 (org/Datastream/File ID)

Purpose: public Git에 org·Datastream·Tags File ID 실값이 남지 않도록 플레이스홀더화하고 주입 위치를 문서화

Changes:

- eas.json / app_config smoke 하드코딩 제거, `.env.example`·`SECRETS.md` 안내
- 실값은 gitignored `app/.env`로만 유지
- Root Cause·Architecture·Customer Guide에서 실값 삭제

Changed files:

- app/eas.json, app/src/01_config/app_config.ts, app/src/02_init/app_init.ts
- app/.env.example, app/SECRETS.md, app/env/config.dev.example.json
- docs/report/01_Architecture.md, 02_Customer_Config_Guide.md, 03_Sdk_Test_Root_Cause.md, 00_ReportIndex.md
- docs/log/log.md

28. 2026-08-03 App/Web 고객 샘플 코드 정리 (01~04 폴더·최소화)

Purpose: 초기화→요청→반환→렌더 학습용으로 Assurance/identity/과한 진단을 제거하고 폴더 순서를 명시

Changes:

- App/Web: `01_config`→`02_init`→`03_target`→`04_ui` 재배치, assurance·identity 삭제
- App: Fetch는 항상 testNum, DEBUG override는 Troubleshooting 주석으로 유지
- 문서 Architecture·Customer Guide 경로 갱신

Changed files:

- app/App.tsx, app/src/**, app/package.json, app/env/*, app/.env.example
- web/src/** 
- docs/report/01_Architecture.md, docs/report/02_Customer_Config_Guide.md, docs/report/03_Sdk_Test_Root_Cause.md
- docs/log/log.md

27. 2026-08-03 App Fetch 항상 testNum 전송 (Target 오디언스 매칭)

Purpose: UI에서 testNum을 골라도 Edge로 파라미터가 안 나가던 분기(no-data 우선)를 제거하고, Target Custom 오디언스 매칭 검증이 가능하도록 수정

Changes:

- fetchTargetOffers: data 없는 1차 호출 제거 → 매 Fetch에 `__adobe.target.testNum` 전송
- Raw에 attempt=with-testNum · sentData 노출

Changed files:

- app/src/target/app_target_service.ts
- docs/log/log.md

26. 2026-07-31 ECID 병목 원인 확정·org override 해결안 반영

Purpose: CDN Tags는 OK·기기 ECID 실패로 원인을 좁히고, experienceCloud.org debug override와 해결 순서를 문서·코드에 고정

Changes:

- Root Cause: 현황 스냅샷·원인(init 준비/ECID)·가설 순위·Step 0~5 해결안
- DEBUG updateConfiguration에 experienceCloud.org 추가 (EAS/smoke)
- Raw debugOverrides에 experienceCloudOrg 노출

Changed files:

- docs/report/03_Sdk_Test_Root_Cause.md
- docs/report/00_ReportIndex.md
- app/src/config/app_config.ts
- app/src/init/app_init.ts
- app/App.tsx
- app/eas.json
- app/env/config.dev.example.json
- app/env/config.dev.json
- app/.env.example
- docs/log/log.md

25. 2026-07-31 ECID 실패 시 debugOverrides 노출·smoke 폴백·edge.adobedc.net

Purpose: Raw에 debugOverrides 안 보이던 UX/env 누락 보완, domain을 edge.adobedc.net으로 검증

Changes:

- config: EAS env 없을 때 smoke fallback(configId + edge.adobedc.net)
- App: 실패 시에도 최상위 debugOverrides·edgeSource 항상 표시
- eas DEBUG_EDGE_DOMAIN → edge.adobedc.net

Changed files:

- app/src/config/app_config.ts
- app/App.tsx
- app/eas.json
- docs/log/log.md

24. 2026-07-31 EAS debug edge.configId·샌드박스 domain 임시 주입

Purpose: ECID timeout 원인 가르기용으로 Tags Edge와 동일한 Datastream/domain을 DEBUG env로 EAS 빌드에 주입 (골든 패스 아님)

Changes:

- development/preview env에 EXPO_PUBLIC_DEBUG_EDGE_CONFIG_ID·DEBUG_EDGE_DOMAIN 추가
- ECID 진단 보강(app_init/App/Root Cause) 함께 커밋

Changed files:

- app/eas.json
- app/src/init/app_init.ts
- app/App.tsx
- docs/report/03_Sdk_Test_Root_Cause.md
- docs/log/log.md

23. 2026-07-31 App ECID timeout 진단 보강 (Tags 원격설정 미수신)

Purpose: 스크린의 waitForEdgeReady ECID timeout이 Fetch/Target 문제가 아님을 명확히 하고, Tags 원격설정 미수신을 판정할 진단 정보를 노출

Changes:

- waitForEdgeReady 대기 45s, appId·lastError·empty count를 에러/diagnostics에 포함
- Root Cause §2.1 ECID timeout 체크리스트·DEBUG_EDGE_CONFIG_ID 임시 우회 안내

Changed files:

- app/src/init/app_init.ts
- app/App.tsx
- docs/report/03_Sdk_Test_Root_Cause.md
- docs/log/log.md

22. 2026-07-31 App Optimize 실패 원인 분석·Edge ready·Fetch 정리

Purpose: Datastream/Tags/빌드 이후 Fetch 실패 구간을 분리하고, config 레이스·에러 진단을 코드에 반영

Changes:

- init 후 waitForEdgeReady(ECID) — Tags edge.configId 다운로드 전 Fetch 방지
- Fetch: no-data → testNum 재시도, unexpected/empty 원인 문구 분리
- `03_Sdk_Test_Root_Cause.md` 추가

Changed files:

- app/src/init/app_init.ts
- app/src/target/app_target_service.ts
- app/App.tsx
- docs/report/03_Sdk_Test_Root_Cause.md
- docs/report/00_ReportIndex.md
- docs/log/log.md

21. 2026-07-31 Customer Guide Edge domain 샌드박스 기본값 정정

Purpose: Edge Network domain 디폴트를 '비움'으로 잘못 기술한 내용 수정

Changes:

- 콘솔 기본값 = 샌드박스 기준 생성 도메인이 사전 입력됨을 명시
- Troubleshooting 문구를 샌드박스 도메인 유지 기준으로 맞춤

Changed files:

- docs/report/02_Customer_Config_Guide.md
- docs/log/log.md

20. 2026-07-31 공식 골든 패스 재정립 (가이드·App 단순화)

Purpose: 고객 가이드용 Adobe 공식 최소 경로로 기준선 고정, 디버깅 우회를 본선에서 분리

Changes:

- `docs/report/02_Customer_Config_Guide.md` — 아키텍처·콘솔 체크리스트·수락 기준·Troubleshooting 부록
- App init: `initializeWithAppId` 본선, edge 강제는 DEBUG env만
- Fetch: sample형 updatePropositions 콜백 → getPropositions
- eas 본선 env: appId + decisionScope만; Assurance 하드코딩 제거

Changed files:

- docs/report/00_ReportIndex.md
- docs/report/02_Customer_Config_Guide.md
- docs/report/01_Architecture.md
- app/src/init/app_init.ts
- app/src/config/app_config.ts
- app/src/target/app_target_service.ts
- app/src/assurance/app_assurance_service.ts
- app/App.tsx
- app/src/ui/AppScreen.tsx
- app/eas.json
- app/env/config.dev.example.json
- app/.env.example
- docs/log/log.md

19. 2026-07-31 App init org 오탐 제거 — ECID 기준 준비 판정

Purpose: Edge-only에서 getSdkIdentities org 부재를 init 실패로 처리하던 오탐 제거

Changes:

- waitForSdkReady: EdgeIdentity ECID 우선, org 없어도 ECID면 통과
- org unavailable로 App.init 전체 실패하지 않음
- identities raw를 debugPayload에 노출

Changed files:

- app/src/init/app_init.ts
- app/App.tsx
- docs/log/log.md

18. 2026-07-31 App Optimize general.unexpected — plain data·무파라미터 재시도

Purpose: timeout→general.unexpected로 진전 — nested Map data/Edge 오류 완화 및 진단 메시지 보강

Changes:

- Target data를 Map → plain `__adobe.target` object
- 1차 data 없이 updatePropositions, 실패/빈 응답 시 testNum 재시도
- 에러 문구에 Assurance personalization 응답 확인 안내

Changed files:

- app/src/target/app_target_service.ts
- docs/log/log.md

17. 2026-07-31 App Assurance org 대기 후 연결

Purpose: 동일 sessionid여도 만료·org 미수신 시 웹 무한로딩 — org 확인 후 startSession

Changes:

- init에서 즉시 startSession 제거
- waitForExperienceCloudOrg 후 Assurance 연결
- 만료 세션은 새 sessionid 필요함을 상태 문구로 안내

Changed files:

- app/src/init/app_init.ts
- app/App.tsx
- docs/log/log.md

16. 2026-07-31 App Assurance 세션 URL 하드코딩

Purpose: 앱에서 URL 붙여넣기 없이 Assurance Deep link 세션 자동 연결

Changes:

- `HARDCODED_ASSURANCE_SESSION_URL` 상수 + config/EAS에 동일 URL 주입
- init 시 startSession 자동 호출(기존 로직)

Changed files:

- app/src/assurance/app_assurance_service.ts
- app/src/config/app_config.ts
- app/eas.json
- app/env/config.dev.json
- app/env/config.dev.example.json
- docs/log/log.md

15. 2026-07-31 App offer용 privacy OPT_IN·edge.configId 강제

Purpose: Optimize timeout(오퍼 미수신)의 Edge 차단 원인 — privacy/datastream 미주입 — 제거

Changes:

- MobileCore.setPrivacyStatus(OPT_IN)
- EXPO_PUBLIC_EDGE_CONFIG_ID(=Test Woo Native datastream) + edge.adobedc.net EAS 주입
- updatePropositions 성공/에러 콜백 + timeout 메시지에 Target Location 점검 안내

Changed files:

- app/src/init/app_init.ts
- app/src/config/app_config.ts
- app/src/target/app_target_service.ts
- app/env/config.dev.example.json
- app/eas.json
- docs/log/log.md

14. 2026-07-31 App Assurance 앱스킴 Deep link 연결 경로

Purpose: 웹 https Assurance 링크로는 Mobile 연결 불가 — 앱 스킴 Deep link로 공식 경로 고정

Changes:

- app.json `scheme: aepsdktargettest`
- 웹 https URL 거부 + Deep link / Quick Connect(debug) API 분리
- Linking으로 앱 스킴 진입 시 startSession(url)

Changed files:

- app/app.json
- app/src/assurance/app_assurance_service.ts
- app/App.tsx
- app/src/ui/AppScreen.tsx
- docs/log/log.md

13. 2026-07-31 App Assurance Session URL 런타임 연결 UI

Purpose: Available Devices 미표시(startSession 미호출) 해소 — URL 붙여넣기 후 연결

Changes:

- `connectAssuranceSession` 서비스 추가
- AppScreen에 Assurance URL 입력 + Connect 버튼
- init 시 URL이 있을 때만 자동 startSession (기존 유지)

Changed files:

- app/src/assurance/app_assurance_service.ts
- app/src/ui/AppScreen.tsx
- app/App.tsx
- docs/log/log.md

12. 2026-07-31 App Optimize 샘플 패턴·edge.adobedc.net 강제

Purpose: Tags FPC domain/콜백 브릿지 이슈로 Optimize 응답이 안 오던 증상 우회

Changes:

- init 후 edge.domain을 edge.adobedc.net으로 강제( env에 값 있을 땐 그 값 )
- Adobe 샘플과 동일: onPropositionUpdate + updatePropositions(무콜백) + getPropositions 폴링
- testNum data는 plain object `__adobe.target`

Changed files:

- app/src/init/app_init.ts
- app/src/target/app_target_service.ts
- docs/log/log.md

11. 2026-07-31 App Optimize 콜백 미수신 — Map data·확장 진단

Purpose: updatePropositions 콜백이 오지 않던 케이스 완화 및 원인 진단 강화

Changes:

- Target data를 plain object → Map(`__adobe.target.testNum`)으로 전달
- onPropositionUpdate로 완료 감지 보강
- init 후 Optimize/Edge extensionVersion 점검, Edge·Optimize import 고정

Changed files:

- app/src/init/app_init.ts
- app/src/target/app_target_service.ts
- docs/log/log.md

10. 2026-07-30 App Optimize timeout — AEP 7.x init/fetch 수정

Purpose: general.callback.timeout 원인(구식 init + fetch 레이스) 제거

Changes:

- registerExtensions+configureWithAppId → MobileCore.initializeWithAppId
- updatePropositions 완료 대기 후 getPropositions (3초 강제 resolve 제거)
- 타임아웃/에러 메시지 상세화

Changed files:

- app/src/init/app_init.ts
- app/src/target/app_target_service.ts
- docs/log/log.md

9. 2026-07-30 App EAS Kotlin 1.9.25 고정 (Compose 호환)

Purpose: expo-modules-core Compose Compiler와 Kotlin 버전 불일치(1.9.24 vs 1.9.25) 해소

Changes:

- expo-build-properties로 android.kotlinVersion=1.9.25
- newArchEnabled=false (AEP/Expo 안정성)
- iOS useFrameworks static 슬롯

Changed files:

- app/app.json
- app/package.json
- docs/log/log.md

8. 2026-07-30 App EAS용 config를 example+EXPO_PUBLIC로 전환

Purpose: gitignore된 config.dev.json이 EAS 업로드에 없어 번들 실패하던 문제 수정

Changes:

- app_config가 config.dev.example.json + EXPO_PUBLIC_* 병합
- eas.json preview/development env에 File ID·scope 주입
- app/.env.example 추가, .env gitignore

Changed files:

- app/src/config/app_config.ts
- app/eas.json
- app/.env.example
- .gitignore
- docs/log/log.md

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

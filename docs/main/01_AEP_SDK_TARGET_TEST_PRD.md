# 부록 — AEP SDK Target 테스트 PRD (Web / Native)

> **문서 역할:** Adobe Target을 **AEP Edge Network SDK**로만 검증하기 위한 **그린필드(신규 프로젝트) PRD**.  
> **대상 독자:** Cursor로 최소 클라이언트 앱을 새로 만드는 개발자 · Adobe Data Collection 설정 담당.  
> **비범위:** 기존 AT_TEST_PAGE / 서버 프록시 / at.js / 클래식 Mobile Target(`AEPTarget`) / 백엔드 API — **일체 참조·재사용하지 않는다.**

| 항목 | 값 |
|------|-----|
| 문서 ID | `docs/adobe/05_AEP_SDK_TARGET_TEST_PRD` |
| 버전 | 1.0 |
| 일자 | 2026-07-22 |
| 용도 | Target SDK **클라이언트 사이드 연동 테스트 전용** |
| 환경 | **Dev 단일** (Prod/Stage 구성 없음) |
| 백엔드 | **불필요** |
| 연관 배경 | `docs/files/Target 구축 사전 질문 체크리스트 관련정보(RFP 포함).html` (표준 = Edge Network) |

**구성 방식:** 공통 전제(0~3장) + **페이지 A(Web)** + **페이지 B(App)**.  
기업에서 웹·네이티브를 나눈 것과 같이 **채널별로 구현·검수**한다. (WebView 래핑이 아님 — **브라우저 웹앱 1개 + 네이티브 앱 1개**)

---

## 0. 한 줄 목적

```text
Datastream에 Target이 붙은 Edge Network로
  웹(alloy) / 앱(Edge+Optimize)이 오퍼(JSON)를 받아
  화면에 최소 표시할 수 있는지 확인한다.
```

성공 기준은 “마케팅 풀스택”이 아니라 **SDK 초기화 → 개인화 요청 → proposition/오퍼 수신 → 가독성 있게 표시**이다.

---

## 1. 범위 / 비범위

### 1.1 In Scope

| # | 항목 |
|---|------|
| 1 | Data Collection **Datastream**(Target 서비스 ON) + Tags(필요 시) Dev 환경 |
| 2 | **Web:** AEP Web SDK(`alloy`) — `configure` + `sendEvent` |
| 3 | **App:** AEP Mobile SDK — Mobile Core + Edge + Edge Identity + **Optimize**(Offer Decisioning and Target) |
| 4 | Target **Form-based / JSON 오퍼**(헤드리스) 1개 이상 수신·표시 |
| 5 | Dev용 **환경변수 파일 1개**만 사용 |
| 6 | (선택·후속) 1st-party 도메인: 웹 `edgeDomain` / 앱 `edge.domain` — FPC/CNAME 완료 후 주입 |

### 1.2 Out of Scope

| # | 항목 |
|---|------|
| 1 | 기존 저장소의 `config.*.json`, FastAPI, Python Target SDK, at.js 테스트 페이지 |
| 2 | 클래식 Mobile Target 확장(`retrieveLocationContent` / `tt.omtrdc.net` 직결) |
| 3 | 백엔드·DB·로그인·쿠폰·회선 API |
| 4 | Analytics / AJO / RTCDP 본구현 (Datastream에 서비스만 켜는 수준도 Target만 필수) |
| 5 | Prod 배포·스토어 심사·무과금 통신사 연동 완료 증명(도메인 키 슬롯만 PRD에 예약) |
| 6 | VEC DOM 자동 변조 중심 UX (가능하면 JSON 헤드리스 우선 — 가독성) |

---

## 2. 아키텍처 (공통)

```text
[테스트 클라이언트: Web 또는 Native]
        │  HTTPS
        ▼
[ 1st-party 간판 도메인 (선택) ] ──CNAME──▶ Adobe Edge
        │  없으면 기본 edge.adobedc.net 등
        ▼
[ Adobe Experience Platform Edge Network ]
        │  datastreamId / edge.configId
        ▼
[ Datastream — Adobe Target 서비스 ]
        ▼
[ Adobe Target ] ── proposition / offer JSON ──▶ 클라이언트 렌더
```

| 채널 | SDK | 오퍼 API | 도메인 키(무과금 간판) | Datastream |
|------|-----|----------|------------------------|------------|
| Web | AEP Web SDK (`alloy`) | `sendEvent` (+ `decisionScopes`) | `edgeDomain` | **필수** (`datastreamId`) |
| App | Edge + Optimize | `updatePropositions` → `getPropositions` | `edge.domain` | **필수** (`edge.configId`, Tags Edge 확장) |

> **공식 근거 요약**  
> - Web: `datastreamId`는 Web SDK 구현에 **필수**. ([datastreamId](https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/commands/configure/datastreamid))  
> - Mobile Edge: `edge.configId`(datastream) **Required**, `edge.domain` Optional. ([Edge Network](https://developer.adobe.com/client-sdks/edge/edge-network/))  
> - Mobile Target via Edge: Optimize 확장 + Datastream에 Target enable. ([Offer Decisioning and Target](https://developer.adobe.com/client-sdks/edge/adobe-journey-optimizer-decisioning/))

---

## 3. Adobe 콘솔 사전 작업 (구현 전 · 공통)

코드보다 **먼저** 완료한다. (AEP 정식 라이선스 없이 Data Collection에서 Target 단독 datastream 구성 가능 — 체크리스트·Datastreams overview 전제)

### 3.1 Datastream (Dev 1개)

1. Data Collection → **Datastreams** → New Datastream (이름 예: `target-aep-sdk-test-dev`)
2. **Add Service → Adobe Target** → Client Code / Environment(Dev) / (선택) Property Token
3. Datastream ID 복사 → 환경변수에 넣을 값

참고: [Set up Adobe Target with Platform Web SDK](https://experienceleague.adobe.com/en/docs/platform-learn/implement-web-sdk/applications-setup/setup-target) · [Datastreams overview](https://experienceleague.adobe.com/en/docs/experience-platform/datastreams/overview)

### 3.2 Target 활동 (Dev)

| 채널 | 권장 Activity | Location / Scope |
|------|---------------|------------------|
| Web | Form-based Experience + **JSON** 오퍼 | decision scope 문자열 1개 (예: `aep-web-test-scope`) — Target에서 Web SDK scope와 **동일 문자열** |
| App | Form-based Experience + **JSON** 오퍼 | Optimize decision scope 1개 (예: `aep-app-test-scope`) — 앱 코드와 **동일 문자열** |

오퍼 JSON 최소 계약(테스트용 · 변경 가능):

```json
{
  "type": "sdk-test",
  "title": "AEP SDK OK",
  "body": "Edge Network personalization received"
}
```

### 3.3 Tags (채널별)

| 채널 | Property 유형 | 설치 확장(최소) | 코드가 받는 키 |
|------|---------------|-----------------|----------------|
| Web | Web **또는** 코드 직접 로드(alloy CDN/npm) | (Tags 사용 시) **Adobe Experience Platform Web SDK** — Datastream·(선택) Edge domain | `datastreamId`, `orgId`, (선택) `edgeDomain` |
| App | **Mobile** | Mobile Core · **Identity for Edge Network** · **Edge Network** · **Offer Decisioning and Target** · (선택) Consent | Environment File ID(`appId`) — Edge 확장에 Datastream·(선택) Domain 설정 후 **Publish(Dev)** |

### 3.4 1st-party 도메인 (선택 · 무과금 검증 시)

체크리스트 부록·FPC 흐름과 동일:

1. 간판 호스트 결정 (예: `data.example.com`)
2. FPC / Client Care 요청 (`docs/files/FPC_Request_Form.xlsx` 등) → Adobe 목적지 호스트 수령
3. DNS **CNAME** (간판 → Adobe 호스트) — **우리 서버 IP로 A/CNAME 하지 않음**
4. Adobe Managed Certificate 완료 후 SDK에 간판만 주입

| SDK | 설정 키 |
|-----|---------|
| Web | `edgeDomain` |
| App | Tags Edge 확장 Domain 또는 `edge.domain` |

초기 Dev 테스트는 **Adobe 기본 Edge 도메인으로도 가능**. 간판은 슬롯만 확보.

---

# 페이지 A — Web (AEP Web SDK)

## A.1 제품 정의

| 항목 | 내용 |
|------|------|
| 산출물 | 브라우저에서 열리는 **단일 테스트 페이지**(또는 라우트 1개) |
| 형태 | 일반 웹 페이지 (네이티브 WebView 아님) |
| 스택 권장 | 정적 HTML+JS **또는** 최소 SPA 1화면. 프레임워크는 Cursor 그린필드에 맡기되 **파일 수·로직 최소화** |
| Target | Web SDK 경유 Edge → Target (Target UI상 Web SDK / decision scope 활동) |

## A.2 기능 요구 (최소)

| ID | 요구 | 우선순위 |
|----|------|----------|
| W-1 | 페이지 로드 시 `alloy("configure", { datastreamId, orgId, edgeDomain? })` **1회** | Must |
| W-2 | 버튼 또는 자동 1회 `sendEvent`로 personalization 요청 | Must |
| W-3 | `renderDecisions: false` + `decisionScopes: [<env scope>]` — JSON을 화면에 텍스트/카드로 표시 (헤드리스) | Must |
| W-4 | 원시 응답(JSON pretty print) 디버그 영역 | Should |
| W-5 | ECID 또는 identity 표시(가능 시 `getIdentity`) | Could |
| W-6 | SPA 뷰 전환 테스트가 필요하면 `xdm.web.webPageDetails.viewName`으로 2번째 `sendEvent` (at.js `triggerView` 대응) — **기본 범위 외, 필요 시만** | Could |

## A.3 코드 구조 (권장 · 최소화)

```text
web/
  index.html          # 또는 앱 엔트리 1개
  src/
    env.ts            # config.dev 로드만
    init.ts           # alloy load + configure (global 1회)
    target.ts         # sendEvent + propositions 파싱
    ui.ts             # 버튼·결과 표시
  env/
    config.dev.json   # 유일 환경파일
```

- 초기화·글로벌 로드 외 **부가 모듈 금지** (라우터·상태관리·API 클라이언트 불필요).
- Tags 임베드 대신 **alloy base code / npm `@adobe/alloy`** 중 하나만 선택(문서에 선택 결과 1줄 남길 것).

## A.4 환경변수 (Web · Dev only)

`env/config.dev.json` 예시 키(이름 고정 권장):

```json
{
  "orgId": "<IMS_ORG>@AdobeOrg",
  "datastreamId": "<DATASTREAM_UUID>",
  "edgeDomain": "",
  "decisionScope": "aep-web-test-scope",
  "debugEnabled": true
}
```

| 키 | 필수 | 설명 |
|----|------|------|
| `orgId` | ✅ | IMS Org |
| `datastreamId` | ✅ | Target 서비스 ON인 Dev datastream |
| `edgeDomain` | 선택 | 빈 문자열이면 SDK 기본 도메인 |
| `decisionScope` | ✅ | Target 활동 scope와 동일 |
| `debugEnabled` | 권장 | `true` (Dev) |

**기존 프로젝트 env 키를 가져오지 말 것.**

## A.5 수락 기준 (Web)

1. Dev datastream + Target 활동 게시 상태에서 페이지 오픈 시 configure 오류 없음.  
2. `sendEvent` 후 scope에 해당하는 proposition이 오고, JSON `title`/`body`(또는 동등 필드)가 UI에 보임.  
3. Network 탭에서 Edge 호스트(기본 또는 `edgeDomain`)로 요청이 나감.  
4. 백엔드 HTTP 호출 없음.

## A.6 참고 공식문서 (Web)

- [Target with Platform Web SDK](https://experienceleague.adobe.com/en/docs/target-dev/developer/client-side/aep/target-overview)  
- [configure](https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/commands/configure/overview) · [datastreamId](https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/commands/configure/datastreamid) · [edgeDomain](https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/commands/configure/edgedomain)  
- [sendEvent](https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/commands/sendevent/overview)  
- [Setup Target (tutorial)](https://experienceleague.adobe.com/en/docs/platform-learn/implement-web-sdk/applications-setup/setup-target)

---

# 페이지 B — App (AEP Mobile Edge + Optimize)

## B.1 제품 정의

| 항목 | 내용 |
|------|------|
| 산출물 | **네이티브** Android 및/또는 iOS 테스트 앱(또는 RN/Expo **네이티브 모듈** 앱) **1화면** |
| 형태 | 스토어용 제품이 아닌 SDK 검증용 셸 |
| 스택 권장 | 공식 AEP Mobile SDK. RN 사용 시 `@adobe/react-native-aepcore` + `@adobe/react-native-aepedge` + `@adobe/react-native-aepedgeidentity` + Optimize 래퍼(패키지명 구현 시 공식 RN 저장소 확인) |
| Target | **Optimize** API로 Edge personalization (클래식 `AEPTarget` 사용 금지) |

## B.2 기능 요구 (최소)

| ID | 요구 | 우선순위 |
|----|------|----------|
| M-1 | 앱 기동 시 Mobile Core 초기화(`appId` / Environment File ID) **1회** | Must |
| M-2 | 확장 등록: Edge, EdgeIdentity, Optimize (+ 선택 Consent) | Must |
| M-3 | 버튼 1개: `updatePropositions` → `getPropositions` (scope = env) | Must |
| M-4 | 수신 proposition/offer JSON을 화면에 텍스트로 표시 | Must |
| M-5 | 원시 응답 로그(Assurance 또는 on-screen JSON) | Should |
| M-6 | ECID 표시(Edge Identity) | Could |
| M-7 | `edge.domain`은 config/Tags에 슬롯만 — 값 없으면 기본 도메인 | Should |

## B.3 코드 구조 (권장 · 최소화)

```text
app/
  App.(tsx|kt|swift)     # UI 1화면
  src/
    env.ts               # config.dev만
    init.ts              # MobileCore + extensions 1회
    target.ts            # Optimize update/getPropositions
  env/
    config.dev.json
```

- 화면 전환·딥링크·푸시·로그인 없음.  
- Tags에 확장 설치·**Dev Publish** 후 `appId`만 코드에 넣는다. Datastream ID는 보통 Tags Edge 설정으로 주입(`edge.configId`).

## B.4 환경변수 (App · Dev only)

```json
{
  "adobeMobileAppId": "<org>/<property>/launch-xxxx-development",
  "decisionScope": "aep-app-test-scope",
  "edgeDomain": "",
  "assuranceSessionUrl": ""
}
```

| 키 | 필수 | 설명 |
|----|------|------|
| `adobeMobileAppId` | ✅ | Tags Mobile Dev Environment File ID |
| `decisionScope` | ✅ | Optimize/Target scope와 동일 |
| `edgeDomain` | 선택 | 비우면 Tags/SDK 기본. 있으면 `edge.domain` 주입 |
| `assuranceSessionUrl` | 선택 | 디버그 세션 |

**기존 `mobile_env` / property token 체계를 복사하지 말 것.** Property 토큰이 필요하면 Datastream Target 서비스 설정에서 처리(콘솔).

## B.5 수락 기준 (App)

1. Tags Dev 게시본 `appId`로 초기화 성공.  
2. Optimize로 scope 요청 시 Target JSON 오퍼가 화면에 표시.  
3. Assurance 또는 로그에서 Edge 요청이 datastream(Target ON)으로 라우팅됨.  
4. 클래식 Target API(`retrieveLocationContent`) 미사용.  
5. 백엔드 호출 없음.

## B.6 참고 공식문서 (App)

- [Edge Network (Mobile)](https://developer.adobe.com/client-sdks/edge/edge-network/)  
- [Offer Decisioning and Target (Optimize)](https://developer.adobe.com/client-sdks/edge/adobe-journey-optimizer-decisioning/)  
- [Create datastream (Mobile tutorial)](https://experienceleague.adobe.com/en/docs/platform-learn/implement-mobile-sdk/initial-configuration/create-datastream)  
- [Migrate Target to Mobile SDK decisioning](https://experienceleague.adobe.com/en/docs/platform-learn/migrate-target-to-mobile-sdk-decisioning/overview) (개념 정합용)

---

## 4. 구현 원칙 (Cursor 그린필드 공통)

1. **새 저장소/새 폴더**에서 시작. 본 문서만 입력으로 삼는다.  
2. **코드 최소화** — init + 1회 personalization + 결과 표시.  
3. **환경파일 1개** (`config.dev.json`). example 파일은 플레이스홀더만.  
4. **백엔드 없음** — Adobe Edge가 유일한 원격.  
5. UI는 “예쁨”보다 **요청/응답 가독성**(버튼·상태·JSON).  
6. Web과 App은 **저장소를 나눠도, monorepo 하위 `web/`·`app/`으로 나눠도 됨** — 의존성·번들은 분리.  
7. 불확실하면 추측으로 클래식 Target을 넣지 말고, 위 공식문서 URL을 연다.

---

## 5. 검수 체크리스트 (통합)

### Adobe

- [ ] Dev Datastream 생성 + Target 서비스 enable  
- [ ] Web용 decision scope 활동 게시  
- [ ] App용 decision scope 활동 게시  
- [ ] (App) Mobile Tags 확장 4종 + Dev Publish + File ID 확보  
- [ ] (선택) FPC/CNAME/인증서 후 `edgeDomain` / `edge.domain` 주입  

### Web 페이지 A

- [ ] configure 성공  
- [ ] sendEvent → JSON 표시  
- [ ] 백엔드 없음  

### App 페이지 B

- [ ] MobileCore 초기화 성공  
- [ ] Optimize propositions → JSON 표시  
- [ ] Edge 경로 확인(클래식 Target 미사용)  

---

## 6. 용어 빠른 대조 (혼동 방지)

| 말 | 이 PRD에서의 의미 |
|----|-------------------|
| Target V2 / AEP 경로 | Edge Network + Datastream + (Web) alloy / (App) Optimize |
| 간판 도메인 | 고객 소유 호스트 — SDK에 넣는 이름. DNS CNAME 목적지는 Adobe 호스트 |
| decision scope | Form-based 활동 위치 문자열. 레거시 mbox 이름과 유사 역할이나 Edge API 용어 |
| triggerView | at.js SPA API — **이 PRD 기본 범위 아님**. Web SDK는 `viewName` `sendEvent`로 대응 |

---

## 7. 문서 이력

| 버전 | 일자 | 요약 |
|------|------|------|
| 1.0 | 2026-07-22 | 초안 — Web/App AEP SDK Target 테스트 전용 그린필드 PRD. 기존 AT_TEST_PAGE 비참조. Datastream 필수·백엔드 없음·Dev env 단일·코드 최소화 |

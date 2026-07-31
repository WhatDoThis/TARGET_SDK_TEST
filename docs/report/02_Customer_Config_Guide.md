# 02 Customer Config Guide — AEP Edge Target 골든 패스

> **문서 역할:** 고객사에 **동일한 테스트 환경**으로 확신을 주기 위한 **공식 기준 구성 가이드**.  
> **근거:** Adobe Offer Decisioning and Target · Target→Optimize 마이그레이션 · AEP RN 7.x · Web SDK Target setup · `docs/main/01_AEP_SDK_TARGET_TEST_PRD.md`  
> **성공 KPI:** JSON 오퍼 수신·표시. Assurance는 디버그 도구일 뿐 수락 기준이 아님.

---

## 1. 아키텍처 (공식 최소 경로)

```text
[ Web: alloy ]                    [ App: AEP Mobile RN ]
 configure(datastreamId)            initializeWithAppId(File ID)
 sendEvent(decisionScopes)          updatePropositions → getPropositions
        \                                /
         \                              /
          ▼                            ▼
     [ Experience Edge Network ]
                  │
                  ▼
     [ Datastream — Adobe Target ON ]
                  │
                  ▼
     [ Target Form-based JSON · Live ]
```

| 채널 | 공식 SDK | 오퍼 API | Datastream 주입 |
|------|----------|----------|-----------------|
| Web | `@adobe/alloy` | `sendEvent` + `decisionScopes` | 코드 `datastreamId` |
| App | Core + Edge + Edge Identity + Optimize | `updatePropositions` → `getPropositions` | Tags Edge → `edge.configId` (Publish) |

**한 문장:** 모바일 Target 검증의 공식 경로는 클래식 Target 확장이 아니라 **Edge + Offer Decisioning and Target(Optimize)** 이다.

---

## 2. 콘솔 체크리스트 (수락 전 필수)

### 2.1 Datastream

- [ ] Datastream 생성 (예: Dev 전용)
- [ ] **Adobe Target** 서비스 **Enabled**
- [ ] Client Code / Environment가 Target 활동 환경과 일치
- [ ] Datastream ID 확보 (Web `datastreamId` / Tags Edge에 동일 연결)

### 2.2 Target 활동

| 채널 | Location / Scope (코드와 문자 일치) | 유형 |
|------|-------------------------------------|------|
| Web | `aep-web-test-scope` | Form-based + JSON · **Live** |
| App | `aep-app-test-scope` | Form-based + JSON · **Live** |

오퍼 JSON 최소 계약(예):

```json
{
  "type": "sdk-test",
  "title": "AEP SDK OK",
  "body": "Edge Network personalization received"
}
```

- [ ] Audience가 테스트 트래픽을 포함 (또는 All visitors)
- [ ] (선택) mbox 파라미터 `testNum` 사용 시 앱/웹 UI 값과 일치

### 2.3 Tags Mobile — 확장 화이트리스트

**Installed에 둘 것**

| 확장 | 필수 |
|------|------|
| Mobile Core | 필수 |
| Adobe Experience Platform Edge Network | 필수 |
| Identity (설명에 Edge Network 포함 = Edge Identity) | 필수 |
| Offer Decisioning and Target | 필수 |
| Profile | 권장 |
| AEP Assurance | 디버그 시에만 |

**Installed에 두면 안 되는 것 (금지)**

| 확장 | 이유 |
|------|------|
| **Adobe Target** (클래식 v3) | Optimize와 스택이 다름 — 마이그레이션 가이드상 교체 대상 |
| Adobe Target VEC (Deprecated) | 미지원 — 제거 |
| Consent | 최소 가이드에서는 미설치. 쓰면 collect=y 필수 |

**Edge 확장 설정**

- [ ] **Development** Datastream = Target ON인 Datastream
- [ ] Edge Network domain: 콘솔 기본값은 **적용 중인 샌드박스 기준으로 생성된 도메인**이 이미 입력되어 있음 (예: `{orgSandbox}.data.adobedc.net`). 비워 두는 것이 디폴트가 아님. 커스텀 1st-party(FPC) 도메인은 조직 확정·DNS 완료 후에만 교체
- [ ] Staging/Production은 환경 정책에 맞게 (Dev File ID 사용 시 **Dev Datastream 필수**)

**Publish**

- [ ] Development 라이브러리 **Publish** 완료 (Enabled만으로는 부족)
- [ ] Environment File ID 복사 (`…/launch-xxxx-development`) → 앱 `adobeMobileAppId`

### 2.4 Web

- [ ] `orgId`, `datastreamId` (Target ON) 확보
- [ ] (선택) `edgeDomain` — 없으면 Adobe 기본
- [ ] decision scope = Target Location과 동일

---

## 3. App 최소 코드 (공식 RN 7.x)

패키지: `@adobe/react-native-aepcore` · `aepedge` · `aepedgeidentity` · `aepoptimize`  
(선택 디버그: `aepassurance`)

```typescript
import { MobileCore, LogLevel } from "@adobe/react-native-aepcore";
import { Edge } from "@adobe/react-native-aepedge";
import { Identity as EdgeIdentity } from "@adobe/react-native-aepedgeidentity";
import { DecisionScope, Optimize } from "@adobe/react-native-aepoptimize";

void Edge;
void EdgeIdentity;
void Optimize;

MobileCore.setLogLevel(LogLevel.DEBUG);
await MobileCore.initializeWithAppId("<ENVIRONMENT_FILE_ID>");

const scopes = [new DecisionScope("aep-app-test-scope")];
const data = { __adobe: { target: { testNum: "1" } } }; // 선택

Optimize.updatePropositions(
  scopes,
  undefined,
  data,
  (propositions) => { /* cache filled */ },
  (error) => { /* handle */ }
);

const cached = await Optimize.getPropositions(scopes);
```

- Datastream ID는 **코드에 넣지 않음** — Tags Edge Publish가 `edge.configId` 주입
- Expo Go 불가 — **EAS/네이티브 빌드** 필수
- 본 레포 구현: `app/src/init/app_init.ts`, `app/src/target/app_target_service.ts`

---

## 4. Web 최소 코드 (공식 alloy)

```typescript
await alloy("configure", {
  datastreamId: "<DATASTREAM_UUID>",
  orgId: "<IMS_ORG>@AdobeOrg",
  // edgeDomain: "optional.first-party.host",
  debugEnabled: true,
});

const result = await alloy("sendEvent", {
  renderDecisions: false,
  decisionScopes: ["aep-web-test-scope"],
  data: { __adobe: { target: { testNum: "1" } } }, // 선택
});
```

본 레포: `web/src/init/web_init.ts`, `web/src/target/web_target_service.ts`

---

## 5. 수락 기준

| ID | 기준 | 우선순위 |
|----|------|----------|
| A1 | App: File ID로 init 오류 없음 | Must |
| A2 | App: Fetch 후 scope JSON `title`/`body`(또는 event-popup) 표시 | Must |
| A3 | Web: configure 오류 없음 + sendEvent proposition | Must |
| A4 | 클래식 `retrieveLocationContent` / at.js / 백엔드 미사용 | Must |
| A5 | Assurance 또는 Debugger로 Edge 확인 | Should |

**1차 KPI = 오퍼 수신.** Assurance 연결 성공만으로는 수락하지 않음.

---

## 6. Troubleshooting 부록 (본선 아님)

본선 가이드와 분리. 데모 우회·진단용.

| 증상 | 점검 |
|------|------|
| Optimize timeout / 콜백 없음 | Tags Dev Publish, Dev Datastream, 기기→Edge 네트워크, Consent 미설치 여부 |
| `general.unexpected` | 클래식 Target 잔존, Target Location/Live, Assurance personalization 응답 |
| org unavailable (getSdkIdentities) | Edge-only에서 흔함 — **ECID(Edge Identity)** 로 준비 여부 판단 |
| Edge domain DNS 이슈 | Tags에 채워진 샌드박스 도메인 연결 확인. 필요 시 임시 `edge.domain` 오버라이드 (`EXPO_PUBLIC_DEBUG_EDGE_*`) — 본선은 콘솔 샌드박스 도메인 유지 |
| Assurance | Deep link Base URL = 앱 scheme (`aepsdktargettest://`). 웹 `https://…` 세션 URL은 Mobile용 아님. 세션 ID는 만료됨 — 하드코딩 금지 |

디버그 env (레포, **EAS 본선에 넣지 않음**):

- `EXPO_PUBLIC_DEBUG_EDGE_CONFIG_ID`
- `EXPO_PUBLIC_DEBUG_EDGE_DOMAIN`

---

## 7. 공식 레퍼런스

- [Offer Decisioning and Target](https://developer.adobe.com/client-sdks/edge/adobe-journey-optimizer-decisioning/)
- [Migrate Target to Mobile SDK decisioning](https://experienceleague.adobe.com/en/docs/platform-learn/migrate-target-to-mobile-sdk-decisioning/overview)
- [aepsdk-react-native](https://github.com/adobe/aepsdk-react-native) · Optimize sample `apps/AEPSampleApp/extensions/OptimizeView.tsx`
- [Setup Target with Platform Web SDK](https://experienceleague.adobe.com/en/docs/platform-learn/implement-web-sdk/applications-setup/setup-target)
- 프로젝트 PRD: `docs/main/01_AEP_SDK_TARGET_TEST_PRD.md`

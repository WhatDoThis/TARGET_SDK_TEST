# 03 SDK Test Root Cause — App Optimize 실패 구간 분석

> **목적:** Datastream·Tags·빌드가 된 뒤에도 Fetch가 실패할 때, **어느 레이어가 깨졌는지**를 판정한다.  
> **KPI:** `aep-app-test-scope` JSON 오퍼 표시.

---

## 1. 증상으로 본 진행 단계 (이미 통과한 것)

| 단계 | 상태 | 근거 |
|------|------|------|
| Datastream + Target ON | 통과로 봄 | 콘솔 확인 완료 |
| Tags 확장 + Dev File ID | 통과로 봄 | appId로 빌드·기동 |
| 네이티브 모듈 링크 | 통과 | `optimize=3.7.0` 응답 |
| Edge까지 요청 | 통과에 가까움 | `general.unexpected` = **콜백/에러 객체 수신** (timeout 아님) |

**결론:** “SDK를 안 넣어서 / 빌드가 잘못돼서”가 아니다.  
문제는 **personalization 응답이 실패하거나 오퍼가 비는 구간**이다.

---

## 2. 실패 레이어 맵

```text
[OK] APK + AEP packages
        ↓
[OK] initializeWithAppId(appId)
        ↓
[?] Tags 원격 설정 다운로드 (edge.configId, edge.domain, org)
        ↓  ← ECID가 나오면 여기까지 OK (앱이 waitForEdgeReady로 확인)
[OK/ERR] Optimize.updatePropositions → Edge Network
        ↓
[ERR 후보] Datastream → Adobe Target 서비스
        ↓
[ERR 후보] Target 활동 매칭 (Location / Live / audience / env)
        ↓
[목표] JSON proposition → UI
```

### 관측된 에러 해석

| 앱 메시지 | 의미 | 다음 조치 |
|-----------|------|-----------|
| `updatePropositions timeout` | Edge 완료 신호 없음 | Publish / 네트워크 / config 미수신 |
| `aepError: general.unexpected` | **Edge/Optimize가 응답했으나 실패** (HTTP 5xx급·파싱 실패 등) | 아래 §3 |
| Optimize OK · empty offers | 통신 성공, **Target 매칭 0건** | Location·Live·audience |
| ECID unavailable at init | Tags 설정/네트워크 실패 | Dev Publish·appId·망 |

---

## 3. `general.unexpected` 일 때 우선 의심 (코드 밖)

앱·빌드가 정상이면 아래 **콘솔**을 순서대로 본다.

1. **클래식 Adobe Target 확장**  
   Installed에 있으면 **제거** 후 Dev **재Publish**. Optimize와 스택이 다름.

2. **Target 활동**  
   - Location = 코드와 **완전 동일** `aep-app-test-scope`  
   - Form-based JSON · **Live**  
   - Datastream의 Target Environment와 활동 환경 일치  

3. **Tags Edge**  
   - Development Datastream = Target ON인 스트림  
   - Domain = 샌드박스 기본 도메인(사전 입력값) 유지  

4. **Web으로 교차 검증**  
   같은 org/Datastream 계열로 웹 `aep-web-test-scope`가 되면 Target/Datastream은 대체로 OK → App Location·Tags Mobile만 의심.

---

## 4. 코드 측 보완 (이번 반영)

- init 후 **ECID 수신까지 대기** — Tags `edge.configId` 다운로드 전에 Fetch하면 unexpected 가능  
- Fetch **1차 data 없음 → 2차 testNum** — 파라미터 조건 활동과 단순 활동 모두 커버  
- 에러 문자열에 **CAUSE 힌트** 포함  
- empty offers는 throw하지 않고 경고로 표시 (통신 성공 vs Target 미스 분리)

---

## 5. 재검증 순서 (짧게)

1. EAS preview 재빌드·설치  
2. 기동: `SDK ready · ecid=…` 확인 (안 되면 Tags/망)  
3. Fetch  
   - unexpected → §3 콘솔  
   - empty → Target Location/Live  
   - title/body → **성공**

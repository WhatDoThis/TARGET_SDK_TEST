# Log

## Log Index

1. 2026-07-22 AEP SDK Target 테스트 시스템 그린필드 구축

## Log Body

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

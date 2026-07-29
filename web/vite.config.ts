/**
 * web.vite.config (Vite 설정)
 * ===========================
 * Web 채널 정적 개발 서버·번들 설정.
 *
 * [Main Functions]
 * ===========
 * - 1. defineConfig — Vite 개발 서버 포트 정의
 *
 * [Dependencies]
 * =========
 * - vite
 */

import { defineConfig } from "vite";

// 1.
export default defineConfig({
  root: ".",
  server: {
    port: 5173,
    open: true,
  },
});

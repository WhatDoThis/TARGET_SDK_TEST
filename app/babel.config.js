/**
 * app.babel.config (Babel 설정)
 * ============================
 * Expo Metro 번들용 babel-preset-expo 적용.
 *
 * [Main Functions]
 * ===========
 * - 1. module.exports — Expo preset 반환
 *
 * [Dependencies]
 * =========
 * - babel-preset-expo
 */

// 1.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};

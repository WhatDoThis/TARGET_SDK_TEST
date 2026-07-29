/**
 * app.index (App 엔트리 등록)
 * ==========================
 * Expo/RN 루트 컴포넌트를 등록한다.
 *
 * [Main Functions]
 * ===========
 * - registerRootComponent
 *
 * [Dependencies]
 * =========
 * - expo
 * - ./App
 */

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);

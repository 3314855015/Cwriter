import App from "./App";

// ============================================
// 导出功能说明
// ============================================
// 导出功能已集成原生插件支持：
// - Android: 使用原生插件生成真正的PDF/DOCX（需要完成插件开发）
// - iOS/H5: 自动使用降级方案（HTML/文本导出）
//
// 原生插件开发完成后，Android设备将自动使用原生导出功能
// ============================================

// #ifndef VUE3
import Vue from "vue";
import "./uni.promisify.adaptor";
Vue.config.productionTip = false;
App.mpType = "app";
const app = new Vue({
  ...App,
});
app.$mount();
// #endif

// #ifdef VUE3
import { createSSRApp } from "vue";
export function createApp() {
  const app = createSSRApp(App);
  return {
    app,
  };
}
// #endif

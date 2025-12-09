// 导出插件模块 - 独立模块，避免代码分包问题
//
// ⚠️ 重要：此文件使用运行时动态加载，避免构建时的分包问题
// 库文件需要单独打包或通过CDN加载
//
// 方案说明：
// 1. 不在此文件中使用静态import（会导致分包问题）
// 2. 使用运行时require或动态加载
// 3. 库文件需要单独处理（如通过CDN或独立打包）

// 注意：由于uni-app的构建限制，静态import会导致分包问题
// 此文件提供运行时加载的接口，但需要额外的配置

/**
 * 初始化导出插件 - 运行时动态加载
 *
 * ⚠️ 由于uni-app构建限制，静态import会导致分包问题
 * 此函数尝试运行时加载，但需要库文件已通过其他方式提供
 */
export function initExportPlugin() {
  const globalObj =
    typeof window !== "undefined"
      ? window
      : typeof global !== "undefined"
      ? global
      : typeof self !== "undefined"
      ? self
      : typeof globalThis !== "undefined"
      ? globalThis
      : null;

  if (!globalObj) {
    return false;
  }

  // 尝试运行时加载（避免构建时分包问题）
  try {
    // 方式1: 检查是否已通过CDN或其他方式加载
    if (typeof window !== "undefined") {
      // 检查是否已有全局变量（可能通过script标签加载）
      if (window.jsPDF && window.docx && window.saveAs) {
        globalObj.jsPDF = window.jsPDF;
        globalObj.docx = window.docx;
        globalObj.saveAs = window.saveAs;
        return true;
      }
    }

    // 方式2: 尝试运行时require（如果环境支持）
    if (typeof require !== "undefined") {
      try {
        // 使用Function包装，避免构建时检测
        const loadJsPDF = new Function('return require("jspdf")');
        const loadDocx = new Function('return require("docx")');
        const loadFileSaver = new Function('return require("file-saver")');

        const jsPDF = loadJsPDF();
        const docx = loadDocx();
        const saveAs = loadFileSaver();

        if (jsPDF && docx && saveAs) {
          globalObj.jsPDF = jsPDF.default || jsPDF.jsPDF || jsPDF;
          globalObj.docx = docx.default || docx;
          globalObj.saveAs = saveAs.default || saveAs.saveAs || saveAs;

          if (typeof window !== "undefined") {
            window.jsPDF = globalObj.jsPDF;
            window.docx = globalObj.docx;
            window.saveAs = globalObj.saveAs;
          }

          return true;
        }
      } catch (requireError) {
        // 运行时require失败
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * 检查导出插件是否可用
 */
export function isExportPluginAvailable() {
  const globalObj =
    typeof window !== "undefined"
      ? window
      : typeof global !== "undefined"
      ? global
      : typeof self !== "undefined"
      ? self
      : typeof globalThis !== "undefined"
      ? globalThis
      : null;

  return !!(globalObj && globalObj.jsPDF && globalObj.docx && globalObj.saveAs);
}

/**
 * 原生导出工具 - 使用uni-app原生插件实现PDF/DOCX导出
 *
 * 此模块封装了原生插件的调用，提供统一的接口
 * 如果原生插件不可用，会自动降级到HTML/文本方案
 */

let exportModule = null;

/**
 * 初始化原生模块
 */
function initNativeModule() {
  // #ifdef APP-PLUS
  if (!exportModule) {
    try {
      // 优先使用管理页面已创建的插件实例
      if (typeof window !== "undefined" && window.exportNativePlugin) {
        exportModule = window.exportNativePlugin;
        console.log("✅ 使用管理页面的原生导出插件实例");
        return exportModule;
      }

      // 尝试标准插件方式
      exportModule = uni.requireNativePlugin("export-native");
      if (exportModule && Object.keys(exportModule).length > 0) {
        console.log("✅ 标准原生导出插件已加载");
      } else {
        // 如果标准方式失败，尝试Android直接实例
        if (typeof plus !== "undefined" && plus.android) {
          const ExportModule = plus.android.importClass(
            "com.cwriter.export.ExportModule"
          );
          if (ExportModule) {
            const instance = new ExportModule();
            exportModule = {
              exportToPDF: function (options, callback) {
                try {
                  const result = instance.exportToPDFSync(
                    plus.android.newObject(
                      "com.alibaba.fastjson.JSONObject",
                      JSON.stringify(options)
                    )
                  );

                  if (callback) {
                    try {
                      if (typeof result === "string") {
                        callback(JSON.parse(result));
                      } else {
                        callback(result);
                      }
                    } catch (parseError) {
                      callback({
                        success: false,
                        error: "结果解析失败: " + String(parseError),
                      });
                    }
                  }
                } catch (error) {
                  if (callback)
                    callback({ success: false, error: error.message });
                }
              },
              exportToDOCX: function (options, callback) {
                try {
                  const result = instance.exportToDOCXSync(
                    plus.android.newObject(
                      "com.alibaba.fastjson.JSONObject",
                      JSON.stringify(options)
                    )
                  );

                  if (callback) {
                    try {
                      if (typeof result === "string") {
                        callback(JSON.parse(result));
                      } else {
                        callback(result);
                      }
                    } catch (parseError) {
                      callback({
                        success: false,
                        error: "结果解析失败: " + String(parseError),
                      });
                    }
                  }
                } catch (error) {
                  if (callback)
                    callback({ success: false, error: error.message });
                }
              },
            };
            console.log("✅ 使用Android直接实例创建导出插件");
          }
        }
      }
    } catch (error) {
      console.warn("⚠️ 原生导出插件加载失败:", error);
    }
  }
  // #endif

  return exportModule;
}

/**
 * 检查原生插件是否可用
 */
export function isNativeExportAvailable() {
  // #ifdef APP-PLUS
  const module = initNativeModule();
  return !!module;
  // #endif

  // #ifndef APP-PLUS
  return false;
  // #endif
}

/**
 * 使用原生插件导出PDF
 * @param {string} title - 文档标题
 * @param {string} content - 文档内容（纯文本）
 * @param {string} savePath - 保存路径
 * @returns {Promise<string>} 保存的文件路径
 */
export function nativeExportPDF(title, content, savePath) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    const module = initNativeModule();
    if (!module) {
      reject(new Error("原生插件未找到，请使用降级方案"));
      return;
    }

    // 调用原生方法
    module.exportToPDF(
      {
        title: title || "未命名文档",
        content: content || "",
        savePath: savePath,
      },
      (result) => {
        if (result && result.success) {
          console.log("✅ 原生PDF导出成功:", result.path);
          resolve(result.path);
        } else {
          const errorMsg = result?.error || "导出失败";
          console.error("❌ 原生PDF导出失败:", errorMsg);
          reject(new Error(errorMsg));
        }
      }
    );
    // #endif

    // #ifndef APP-PLUS
    reject(new Error("当前平台不支持原生导出"));
    // #endif
  });
}

/**
 * 使用原生插件导出DOCX
 * @param {string} title - 文档标题
 * @param {string} content - 文档内容（纯文本）
 * @param {string} savePath - 保存路径
 * @returns {Promise<string>} 保存的文件路径
 */
export function nativeExportDOCX(title, content, savePath) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    const module = initNativeModule();
    if (!module) {
      reject(new Error("原生插件未找到，请使用降级方案"));
      return;
    }

    // 调用原生方法
    module.exportToDOCX(
      {
        title: title || "未命名文档",
        content: content || "",
        savePath: savePath,
      },
      (result) => {
        if (result && result.success) {
          console.log("✅ 原生DOCX导出成功:", result.path);
          resolve(result.path);
        } else {
          const errorMsg = result?.error || "导出失败";
          console.error("❌ 原生DOCX导出失败:", errorMsg);
          reject(new Error(errorMsg));
        }
      }
    );
    // #endif

    // #ifndef APP-PLUS
    reject(new Error("当前平台不支持原生导出"));
    // #endif
  });
}

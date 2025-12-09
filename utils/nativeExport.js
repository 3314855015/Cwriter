/**
 * 原生导出工具 - 基于uni-app插件开发最佳实践实现PDF/DOCX导出
 *
 * 遵循uni-app插件JSONObject参数传递规范
 * 使用标准异步回调方式，确保参数类型正确
 */

/**
 * 初始化原生模块 - 符合uni-app插件规范
 */
function initNativeModule() {
  // #ifdef APP-PLUS
  try {
    // 使用标准插件注册方式，符合uni-app规范
    const module = uni.requireNativePlugin("export-native");
    if (module) {
      return module;
    }
  } catch (error) {
    // 插件加载失败
  }
  // #endif

  return null;
}

/**
 * 直接使用异步回调方式导出PDF
 * @param {string} title - 文档标题
 * @param {string} content - 文档内容
 * @param {string} savePath - 保存路径
 * @returns {Promise<string>} 保存的文件路径
 */
export function nativeExportPDF(title, content, savePath) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    try {
      // 转换路径格式
      let convertedSavePath = savePath;
      if (savePath.startsWith("_downloads/")) {
        convertedSavePath = plus.io.convertLocalFileSystemURL(savePath);
      }

      // 初始化插件模块
      const module = initNativeModule();
      if (!module) {
        reject(new Error("原生插件未找到"));
        return;
      }

      // 参数验证 - 符合uni-app插件开发最佳实践
      if (!title || typeof title !== "string") {
        title = "未命名文档";
      }
      if (!content || typeof content !== "string") {
        content = "";
      }
      if (!convertedSavePath || typeof convertedSavePath !== "string") {
        reject(new Error("保存路径无效"));
        return;
      }

      // 准备参数 - 符合uni-app JSONObject参数传递规范
      const options = {
        // 基本类型参数，确保类型正确
        title: title,
        content: content,
        savePath: convertedSavePath,
      };

      // 准备参数 - 符合uni-app JSONObject参数传递规范

      // 验证插件方法是否存在
      if (typeof module.exportToPDF !== "function") {
        // 备用方案：尝试同步方法
        try {
          const syncResult = module.exportToPDFSync(options);

          if (syncResult && syncResult.success) {
            resolve(syncResult.path);
          } else {
            const errorMsg = syncResult?.error || "PDF导出失败";
            reject(new Error(errorMsg));
          }
          return;
        } catch (syncError) {
          reject(new Error("exportToPDF和exportToPDFSync方法都不存在"));
          return;
        }
      }

      // 添加超时处理，防止回调永远不执行
      let callbackExecuted = false;
      const timeoutId = setTimeout(() => {
        if (!callbackExecuted) {
          callbackExecuted = true;
          reject(new Error("导出操作超时"));
        }
      }, 10000);

      module.exportToPDF(options, (result) => {
        if (callbackExecuted) {
          return;
        }
        callbackExecuted = true;
        clearTimeout(timeoutId);

        if (result && result.success) {
          resolve(result.path);
        } else {
          const errorMsg = result?.error || "PDF导出失败";
          reject(new Error(errorMsg));
        }
      });
    } catch (error) {
      reject(new Error("PDF导出失败: " + error.message));
    }
    // #endif

    // #ifndef APP-PLUS
    reject(new Error("当前平台不支持原生导出"));
    // #endif
  });
}

/**
 * 直接使用异步回调方式导出DOCX
 * @param {string} title - 文档标题
 * @param {string} content - 文档内容
 * @param {string} savePath - 保存路径
 * @returns {Promise<string>} 保存的文件路径
 */
export function nativeExportDOCX(title, content, savePath) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    try {
      // 转换路径格式
      let convertedSavePath = savePath;
      if (savePath.startsWith("_downloads/")) {
        convertedSavePath = plus.io.convertLocalFileSystemURL(savePath);
      }

      // 初始化插件模块
      const module = initNativeModule();
      if (!module) {
        reject(new Error("原生插件未找到"));
        return;
      }

      // 参数验证 - 符合uni-app插件开发最佳实践
      if (!title || typeof title !== "string") {
        title = "未命名文档";
      }
      if (!content || typeof content !== "string") {
        content = "";
      }
      if (!convertedSavePath || typeof convertedSavePath !== "string") {
        reject(new Error("保存路径无效"));
        return;
      }

      // 准备参数 - 符合uni-app JSONObject参数传递规范
      const options = {
        // 基本类型参数，确保类型正确
        title: title,
        content: content,
        savePath: convertedSavePath,
      };

      // 验证插件方法是否存在
      if (typeof module.exportToDOCX !== "function") {
        // 备用方案：尝试同步方法
        try {
          const syncResult = module.exportToDOCXSync(options);

          if (syncResult && syncResult.success) {
            resolve(syncResult.path);
          } else {
            const errorMsg = syncResult?.error || "DOCX导出失败";
            reject(new Error(errorMsg));
          }
          return;
        } catch (syncError) {
          reject(new Error("exportToDOCX和exportToDOCXSync方法都不存在"));
          return;
        }
      }

      // 添加超时处理，防止回调永远不执行
      let callbackExecuted = false;
      const timeoutId = setTimeout(() => {
        if (!callbackExecuted) {
          callbackExecuted = true;
          reject(new Error("导出操作超时"));
        }
      }, 30000); // 30秒超时

      module.exportToDOCX(options, (result) => {
        if (callbackExecuted) {
          return;
        }
        callbackExecuted = true;
        clearTimeout(timeoutId);

        if (result && result.success) {
          resolve(result.path);
        } else {
          const errorMsg = result?.error || "DOCX导出失败";
          reject(new Error(errorMsg));
        }
      });
    } catch (error) {
      reject(new Error("DOCX导出失败: " + error.message));
    }
    // #endif

    // #ifndef APP-PLUS
    reject(new Error("当前平台不支持原生导出"));
    // #endif
  });
}

/**
 * 检查原生导出是否可用
 */
export function isNativeExportAvailable() {
  // #ifdef APP-PLUS
  try {
    const ExportModule = plus.android.importClass(
      "com.cwriter.export.ExportModule"
    );
    return !!ExportModule;
  } catch {
    return false;
  }
  // #endif

  // #ifndef APP-PLUS
  return false;
  // #endif
}

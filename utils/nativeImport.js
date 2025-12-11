/**
 * 原生导入工具 - 基于uni-app插件开发最佳实践实现DOCX导入
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
    console.warn("原生导入插件加载失败:", error);
  }
  // #endif

  return null;
}

/**
 * 从DOCX文件导入作品
 * @param {string} filePath - DOCX文件路径或URI
 * @param {Object} styleConfig - 样式配置（可选，null表示使用默认配置）
 * @returns {Promise<Object>} 解析结果，包含success、data、error字段
 */
export function nativeImportDOCX(filePath, styleConfig = null) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    try {
      // 转换路径格式
      let convertedFilePath = filePath;
      if (filePath.startsWith("_downloads/")) {
        convertedFilePath = plus.io.convertLocalFileSystemURL(filePath);
      } else if (
        !filePath.startsWith("/") &&
        !filePath.startsWith("content://")
      ) {
        // 如果不是绝对路径，尝试转换为绝对路径
        try {
          convertedFilePath = plus.io.convertLocalFileSystemURL(filePath);
        } catch (e) {
          // 转换失败，使用原路径
          convertedFilePath = filePath;
        }
      }

      // 初始化插件模块
      const module = initNativeModule();
      if (!module) {
        reject(new Error("原生插件未找到"));
        return;
      }

      // 参数验证
      if (!convertedFilePath || typeof convertedFilePath !== "string") {
        reject(new Error("文件路径无效"));
        return;
      }

      // 准备参数
      const options = {
        filePath: convertedFilePath,
        styleConfig: styleConfig || null, // null表示使用默认配置
      };

      // 检查是否为URI格式，使用URI导入方法
      if (
        filePath.startsWith("content://") &&
        typeof module.importFromDOCXUri === "function"
      ) {
        // 使用URI导入方法
        module.importFromDOCXUri(convertedFilePath, (result) => {
          if (result && result.success) {
            resolve(result);
          } else {
            const errorMsg = result?.error || "DOCX URI导入失败";
            reject(new Error(errorMsg));
          }
        });
        return;
      }

      // 验证插件方法是否存在
      if (typeof module.importFromDOCX !== "function") {
        // 备用方案：尝试同步方法
        try {
          const syncResult = module.importFromDOCXSync(options);

          if (syncResult && syncResult.success) {
            resolve(syncResult);
          } else {
            const errorMsg = syncResult?.error || "DOCX导入失败";
            reject(new Error(errorMsg));
          }
          return;
        } catch (syncError) {
          reject(new Error("importFromDOCX和importFromDOCXSync方法都不存在"));
          return;
        }
      }

      // 添加超时处理
      let callbackExecuted = false;
      const timeoutId = setTimeout(() => {
        if (!callbackExecuted) {
          callbackExecuted = true;
          reject(new Error("导入操作超时"));
        }
      }, 60000); // 60秒超时（解析大文件可能需要较长时间）

      module.importFromDOCX(options, (result) => {
        if (callbackExecuted) {
          return;
        }
        callbackExecuted = true;
        clearTimeout(timeoutId);

        if (result && result.success) {
          resolve(result);
        } else {
          const errorMsg = result?.error || "DOCX导入失败";
          reject(new Error(errorMsg));
        }
      });
    } catch (error) {
      reject(new Error("DOCX导入失败: " + error.message));
    }
    // #endif

    // #ifndef APP-PLUS
    reject(new Error("当前平台不支持原生导入"));
    // #endif
  });
}

/**
 * 检查原生导入是否可用
 */
export function isNativeImportAvailable() {
  // #ifdef APP-PLUS
  try {
    const module = initNativeModule();
    return !!module && typeof module.importFromDOCX === "function";
  } catch {
    return false;
  }
  // #endif

  // #ifndef APP-PLUS
  return false;
  // #endif
}

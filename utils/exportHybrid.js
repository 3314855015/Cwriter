/**
 * 混合导出工具 - 结合插件和直接调用的最优方案
 * 优先使用ExportUtils工具类，避免参数传递和分包问题
 */

/**
 * 混合导出PDF - 智能选择最佳方案
 */
export function hybridExportPDF(title, content, savePath) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    try {
      // 转换路径格式
      let convertedSavePath = savePath;
      if (savePath.startsWith("_downloads/")) {
        convertedSavePath = plus.io.convertLocalFileSystemURL(savePath);
      }
      try {
        const ExportUtils = plus.android.importClass("com.cwriter.export.ExportUtils");
        
        // 检查工具类是否可用
        const isAvailable = ExportUtils.isExportAvailable();
        
        if (isAvailable) {
          const result = ExportUtils.exportToPDFForPlugin(
            title || "未命名文档",
            content || "",
            convertedSavePath
          );
          
          // 解析结果
          let parsedResult = result;
          if (result && result.__TYPE__ === "JSBObject") {
            const resultStr = plus.android.invoke(result, "toString");
            parsedResult = JSON.parse(resultStr);
          } else if (typeof result === "string") {
            parsedResult = JSON.parse(result);
          }

          if (parsedResult && parsedResult.success) {
            resolve(parsedResult.path);
            return;
          }
        }
      } catch (directError) {
        // 继续尝试插件方式
      }
      try {
        const module = uni.requireNativePlugin('export-native');
        if (module && typeof module.exportToPDFSync === 'function') {
          const options = {
            title: title || "未命名文档",
            content: content || "",
            savePath: convertedSavePath
          };
          
          const result = module.exportToPDFSync(options);
          
          if (result && result.success) {
            resolve(result.path);
            return;
          } else {
            reject(new Error(result?.error || "PDF导出失败"));
            return;
          }
        }
      } catch (pluginError) {
        // 继续尝试字符串版本
      }
      try {
        const ExportUtils = plus.android.importClass("com.cwriter.export.ExportUtils");
        const result = ExportUtils.exportToPDFWithString(JSON.stringify({
          title: title || "未命名文档",
          content: content || "",
          savePath: convertedSavePath
        }));
        
        let parsedResult = result;
        if (result && result.__TYPE__ === "JSBObject") {
          const resultStr = plus.android.invoke(result, "toString");
          parsedResult = JSON.parse(resultStr);
        } else if (typeof result === "string") {
          parsedResult = JSON.parse(result);
        }

        if (parsedResult && parsedResult.success) {
          resolve(parsedResult.path);
          return;
        } else {
          reject(new Error(parsedResult?.error || "PDF导出失败"));
          return;
        }
      } catch (stringError) {
        reject(new Error("PDF导出失败: " + stringError.message));
      }

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
 * 混合导出DOCX - 智能选择最佳方案
 */
export function hybridExportDOCX(title, content, savePath) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    try {
      // 转换路径格式
      let convertedSavePath = savePath;
      if (savePath.startsWith("_downloads/")) {
        convertedSavePath = plus.io.convertLocalFileSystemURL(savePath);
      }
      try {
        const ExportUtils = plus.android.importClass("com.cwriter.export.ExportUtils");
        
        // 检查工具类是否可用
        const isAvailable = ExportUtils.isExportAvailable();
        
        if (isAvailable) {
          const result = ExportUtils.exportToDOCXForPlugin(
            title || "未命名文档",
            content || "",
            convertedSavePath
          );
          
          // 解析结果
          let parsedResult = result;
          if (result && result.__TYPE__ === "JSBObject") {
            const resultStr = plus.android.invoke(result, "toString");
            parsedResult = JSON.parse(resultStr);
          } else if (typeof result === "string") {
            parsedResult = JSON.parse(result);
          }

          if (parsedResult && parsedResult.success) {
            resolve(parsedResult.path);
            return;
          }
        }
      } catch (directError) {
        // 继续尝试插件方式
      }
      try {
        const module = uni.requireNativePlugin('export-native');
        if (module && typeof module.exportToDOCXSync === 'function') {
          const options = {
            title: title || "未命名文档",
            content: content || "",
            savePath: convertedSavePath
          };
          
          const result = module.exportToDOCXSync(options);
          
          if (result && result.success) {
            resolve(result.path);
            return;
          } else {
            reject(new Error(result?.error || "DOCX导出失败"));
            return;
          }
        }
      } catch (pluginError) {
        // 继续尝试字符串版本
      }
      try {
        const ExportUtils = plus.android.importClass("com.cwriter.export.ExportUtils");
        const result = ExportUtils.exportToDOCXWithString(JSON.stringify({
          title: title || "未命名文档",
          content: content || "",
          savePath: convertedSavePath
        }));
        
        let parsedResult = result;
        if (result && result.__TYPE__ === "JSBObject") {
          const resultStr = plus.android.invoke(result, "toString");
          parsedResult = JSON.parse(resultStr);
        } else if (typeof result === "string") {
          parsedResult = JSON.parse(result);
        }

        if (parsedResult && parsedResult.success) {
          resolve(parsedResult.path);
          return;
        } else {
          reject(new Error(parsedResult?.error || "DOCX导出失败"));
          return;
        }
      } catch (stringError) {
        reject(new Error("DOCX导出失败: " + stringError.message));
      }

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
 * 检查混合导出是否可用
 */
export function isHybridExportAvailable() {
  // #ifdef APP-PLUS
  try {
    // 优先检查ExportUtils工具类
    const ExportUtils = plus.android.importClass("com.cwriter.export.ExportUtils");
    if (ExportUtils && ExportUtils.isExportAvailable()) {
      return true;
    }
    
    // 备选检查插件
    const module = uni.requireNativePlugin('export-native');
    if (module && (typeof module.exportToPDFSync === 'function' || typeof module.exportToDOCXSync === 'function')) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
  // #endif

  // #ifndef APP-PLUS
  return false;
  // #endif
}

/**
 * 获取当前可用的导出方案信息
 */
export function getExportSchemeInfo() {
  // #ifdef APP-PLUS
  const schemes = [];
  
  try {
    // 检查ExportUtils
    const ExportUtils = plus.android.importClass("com.cwriter.export.ExportUtils");
    if (ExportUtils) {
      const isAvailable = ExportUtils.isExportAvailable();
      schemes.push({
        name: "ExportUtils工具类",
        available: isAvailable,
        priority: 1,
        description: "最可靠的方案，避免参数传递问题"
      });
    }
  } catch (e) {
    schemes.push({
      name: "ExportUtils工具类",
      available: false,
      priority: 1,
      description: "不可用: " + e.message
    });
  }
  
  try {
    // 检查插件
    const module = uni.requireNativePlugin('export-native');
    if (module) {
      const hasPdfSync = typeof module.exportToPDFSync === 'function';
      const hasDocxSync = typeof module.exportToDOCXSync === 'function';
      schemes.push({
        name: "uni-app插件",
        available: hasPdfSync || hasDocxSync,
        priority: 2,
        description: "标准插件方式，可能存在参数传递问题"
      });
    }
  } catch (e) {
    schemes.push({
      name: "uni-app插件",
      available: false,
      priority: 2,
      description: "不可用: " + e.message
    });
  }
  
  return schemes;
  // #endif

  // #ifndef APP-PLUS
  return [{
    name: "原生导出",
    available: false,
    priority: 0,
    description: "当前平台不支持原生导出"
  }];
  // #endif
}
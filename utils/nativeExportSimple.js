/**
 * 简化的原生导出工具 - 直接使用已验证的Java工具类方法
 * 基于测试项目中能正常导出的代码，避免复杂的插件机制
 */

/**
 * 直接使用Java工具类方法导出PDF
 */
export function nativeExportPDF(title, content, savePath) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    try {
      console.log("🚀 开始直接Java工具类PDF导出");
      console.log("📋 参数:", { title, contentLength: content?.length, savePath });

      // 转换路径格式
      let convertedSavePath = savePath;
      if (savePath.startsWith("_downloads/")) {
        convertedSavePath = plus.io.convertLocalFileSystemURL(savePath);
        console.log("📁 路径转换:", savePath, "->", convertedSavePath);
      }

      // 导入Java工具类
      const ExportUtils = plus.android.importClass("com.cwriter.export.ExportUtils");
      
      console.log("✅ Java工具类导入成功");

      // 直接调用静态方法（最可靠的方式）
      console.log("🔧 调用字符串版本方法...");
      const result = ExportUtils.exportToPDFWithString(JSON.stringify({
        title: title || "未命名文档",
        content: content || "",
        savePath: convertedSavePath
      }));
      
      console.log("📤 方法返回结果:", result);

      // 解析结果
      let parsedResult = result;
      if (result && result.__TYPE__ === "JSBObject") {
        const resultStr = plus.android.invoke(result, "toString");
        parsedResult = JSON.parse(resultStr);
      } else if (typeof result === "string") {
        parsedResult = JSON.parse(result);
      }

      console.log("📤 解析后的结果:", parsedResult);

      if (parsedResult && parsedResult.success) {
        console.log("✅ PDF导出成功:", parsedResult.path);
        resolve(parsedResult.path);
      } else {
        const errorMsg = parsedResult?.error || "PDF导出失败";
        console.error("❌ PDF导出失败:", errorMsg);
        reject(new Error(errorMsg));
      }

    } catch (error) {
      console.error("❌ Java工具类PDF导出失败:", error);
      reject(new Error("PDF导出失败: " + error.message));
    }
    // #endif

    // #ifndef APP-PLUS
    reject(new Error("当前平台不支持原生导出"));
    // #endif
  });
}

/**
 * 直接使用Java工具类方法导出DOCX
 */
export function nativeExportDOCX(title, content, savePath) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    try {
      console.log("🚀 开始直接Java工具类DOCX导出");
      console.log("📋 参数:", { title, contentLength: content?.length, savePath });

      // 转换路径格式
      let convertedSavePath = savePath;
      if (savePath.startsWith("_downloads/")) {
        convertedSavePath = plus.io.convertLocalFileSystemURL(savePath);
        console.log("📁 路径转换:", savePath, "->", convertedSavePath);
      }

      // 导入Java工具类
      const ExportUtils = plus.android.importClass("com.cwriter.export.ExportUtils");
      
      console.log("✅ Java工具类导入成功");

      // 直接调用静态方法（最可靠的方式）
      console.log("🔧 调用字符串版本方法...");
      const result = ExportUtils.exportToDOCXWithString(JSON.stringify({
        title: title || "未命名文档",
        content: content || "",
        savePath: convertedSavePath
      }));
      
      console.log("📤 方法返回结果:", result);

      // 解析结果
      let parsedResult = result;
      if (result && result.__TYPE__ === "JSBObject") {
        const resultStr = plus.android.invoke(result, "toString");
        parsedResult = JSON.parse(resultStr);
      } else if (typeof result === "string") {
        parsedResult = JSON.parse(result);
      }

      console.log("📤 解析后的结果:", parsedResult);

      if (parsedResult && parsedResult.success) {
        console.log("✅ DOCX导出成功:", parsedResult.path);
        resolve(parsedResult.path);
      } else {
        const errorMsg = parsedResult?.error || "DOCX导出失败";
        console.error("❌ DOCX导出失败:", errorMsg);
        reject(new Error(errorMsg));
      }

    } catch (error) {
      console.error("❌ Java工具类DOCX导出失败:", error);
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
    const ExportUtils = plus.android.importClass("com.cwriter.export.ExportUtils");
    return !!ExportUtils;
  } catch {
    return false;
  }
  // #endif

  // #ifndef APP-PLUS
  return false;
  // #endif
}
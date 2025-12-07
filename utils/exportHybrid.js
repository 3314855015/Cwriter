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
      console.log("🚀 开始混合PDF导出");
      console.log("📋 参数:", { title, contentLength: content?.length, savePath });

      // 转换路径格式
      let convertedSavePath = savePath;
      if (savePath.startsWith("_downloads/")) {
        convertedSavePath = plus.io.convertLocalFileSystemURL(savePath);
        console.log("📁 路径转换:", savePath, "->", convertedSavePath);
      }

      // 优先尝试直接调用ExportUtils工具类
      console.log("🔧 尝试直接调用ExportUtils工具类...");
      try {
        const ExportUtils = plus.android.importClass("com.cwriter.export.ExportUtils");
        
        // 检查工具类是否可用
        const isAvailable = ExportUtils.isExportAvailable();
        console.log("✅ ExportUtils工具类可用性:", isAvailable);
        
        if (isAvailable) {
          console.log("🔧 调用ExportUtils.exportToPDFForPlugin...");
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

          console.log("📤 ExportUtils返回结果:", parsedResult);

          if (parsedResult && parsedResult.success) {
            console.log("✅ PDF导出成功 (ExportUtils):", parsedResult.path);
            resolve(parsedResult.path);
            return;
          }
        }
      } catch (directError) {
        console.warn("⚠️ 直接调用ExportUtils失败，尝试插件方式:", directError);
      }

      // 备选方案：使用插件机制
      console.log("🔧 尝试插件方式...");
      try {
        const module = uni.requireNativePlugin('export-native');
        if (module && typeof module.exportToPDFSync === 'function') {
          const options = {
            title: title || "未命名文档",
            content: content || "",
            savePath: convertedSavePath
          };
          
          console.log("📤 发送给插件的参数:", JSON.stringify(options, null, 2));
          const result = module.exportToPDFSync(options);
          console.log("📤 插件返回结果:", result);
          
          if (result && result.success) {
            console.log("✅ PDF导出成功 (插件方式):", result.path);
            resolve(result.path);
            return;
          } else {
            reject(new Error(result?.error || "PDF导出失败"));
            return;
          }
        }
      } catch (pluginError) {
        console.warn("⚠️ 插件方式失败:", pluginError);
      }

      // 最后备选：字符串版本
      console.log("🔧 尝试字符串版本...");
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
          console.log("✅ PDF导出成功 (字符串版本):", parsedResult.path);
          resolve(parsedResult.path);
          return;
        } else {
          reject(new Error(parsedResult?.error || "PDF导出失败"));
          return;
        }
      } catch (stringError) {
        console.error("❌ 所有方案都失败:", stringError);
        reject(new Error("PDF导出失败: " + stringError.message));
      }

    } catch (error) {
      console.error("❌ 混合PDF导出失败:", error);
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
      console.log("🚀 开始混合DOCX导出");
      console.log("📋 参数:", { title, contentLength: content?.length, savePath });

      // 转换路径格式
      let convertedSavePath = savePath;
      if (savePath.startsWith("_downloads/")) {
        convertedSavePath = plus.io.convertLocalFileSystemURL(savePath);
        console.log("📁 路径转换:", savePath, "->", convertedSavePath);
      }

      // 优先尝试直接调用ExportUtils工具类
      console.log("🔧 尝试直接调用ExportUtils工具类...");
      try {
        const ExportUtils = plus.android.importClass("com.cwriter.export.ExportUtils");
        
        // 检查工具类是否可用
        const isAvailable = ExportUtils.isExportAvailable();
        console.log("✅ ExportUtils工具类可用性:", isAvailable);
        
        if (isAvailable) {
          console.log("🔧 调用ExportUtils.exportToDOCXForPlugin...");
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

          console.log("📤 ExportUtils返回结果:", parsedResult);

          if (parsedResult && parsedResult.success) {
            console.log("✅ DOCX导出成功 (ExportUtils):", parsedResult.path);
            resolve(parsedResult.path);
            return;
          }
        }
      } catch (directError) {
        console.warn("⚠️ 直接调用ExportUtils失败，尝试插件方式:", directError);
      }

      // 备选方案：使用插件机制
      console.log("🔧 尝试插件方式...");
      try {
        const module = uni.requireNativePlugin('export-native');
        if (module && typeof module.exportToDOCXSync === 'function') {
          const options = {
            title: title || "未命名文档",
            content: content || "",
            savePath: convertedSavePath
          };
          
          console.log("📤 发送给插件的参数:", JSON.stringify(options, null, 2));
          const result = module.exportToDOCXSync(options);
          console.log("📤 插件返回结果:", result);
          
          if (result && result.success) {
            console.log("✅ DOCX导出成功 (插件方式):", result.path);
            resolve(result.path);
            return;
          } else {
            reject(new Error(result?.error || "DOCX导出失败"));
            return;
          }
        }
      } catch (pluginError) {
        console.warn("⚠️ 插件方式失败:", pluginError);
      }

      // 最后备选：字符串版本
      console.log("🔧 尝试字符串版本...");
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
          console.log("✅ DOCX导出成功 (字符串版本):", parsedResult.path);
          resolve(parsedResult.path);
          return;
        } else {
          reject(new Error(parsedResult?.error || "DOCX导出失败"));
          return;
        }
      } catch (stringError) {
        console.error("❌ 所有方案都失败:", stringError);
        reject(new Error("DOCX导出失败: " + stringError.message));
      }

    } catch (error) {
      console.error("❌ 混合DOCX导出失败:", error);
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
      console.log("✅ 混合导出可用 (ExportUtils)");
      return true;
    }
    
    // 备选检查插件
    const module = uni.requireNativePlugin('export-native');
    if (module && (typeof module.exportToPDFSync === 'function' || typeof module.exportToDOCXSync === 'function')) {
      console.log("✅ 混合导出可用 (插件)");
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
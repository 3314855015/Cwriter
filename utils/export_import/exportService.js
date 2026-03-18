/**
 * 导出服务 - 严格模仿原来成功的 exportHelper.js 实现
 * 
 * 提供作品导出功能，支持 PDF 和 DOCX 格式
 * 优先使用原生插件，支持多级降级方案
 */

import fileStorage from '../fileSystemStorage.js';
import {
  nativeExportPDFStructured,
  nativeExportDOCXStructured,
  isNativeExportAvailable
} from '../nativeExport.js';

/**
 * 获取完整的作品数据（包括所有章节内容）
 * 支持整体作品和分卷作品两种类型
 * 
 * @param {string} userId - 用户ID
 * @param {string} workId - 作品ID
 * @returns {Promise<Object>} 完整的作品数据
 */
export async function getFullWorkData(userId, workId) {
  try {
    const workDir = fileStorage.getWorkPath(userId, workId);
    if (!workDir) {
      throw new Error("无法获取作品路径");
    }

    // 读取作品配置
    const workConfig = await fileStorage.readFile(
      `${workDir}/work.config.json`
    );
    if (!workConfig) {
      throw new Error("作品不存在");
    }

    // 根据作品类型选择不同的章节获取方式
    const structureType = workConfig.structure_type || "single";
    
    if (structureType === "volume" || structureType === "multi") {
      // 分卷作品：从卷结构中获取章节
      return await getFullWorkDataWithVolumes(userId, workId, workConfig);
    } else {
      // 整体作品：从 chapters 目录获取
      return await getFullWorkDataSingle(userId, workId, workConfig);
    }
  } catch (error) {
    console.error("获取完整作品数据失败:", error);
    throw error;
  }
}

/**
 * 获取整体作品的完整数据
 */
async function getFullWorkDataSingle(userId, workId, workConfig) {
  const workDir = fileStorage.getWorkPath(userId, workId);
  
  // 读取章节列表
  const chaptersList =
    (await fileStorage.readFile(`${workDir}/chapters/chapters.json`)) || [];

  // 读取每个章节的详细内容
  const chaptersWithContent = [];
  if (Array.isArray(chaptersList)) {
    for (const chapter of chaptersList) {
      try {
        const chapterContent = await fileStorage.readFile(
          `${workDir}/chapters/${chapter.id}.json`
        );
        if (chapterContent) {
          chaptersWithContent.push(chapterContent);
        }
      } catch (error) {
        console.warn(`读取章节 ${chapter.id} 失败:`, error);
      }
    }
  }

  // 按创建时间排序
  chaptersWithContent.sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeA - timeB;
  });

  return {
    ...workConfig,
    chapters: chaptersWithContent,
    volumes: null, // 整体作品没有卷结构
  };
}

/**
 * 获取分卷作品的完整数据
 */
async function getFullWorkDataWithVolumes(userId, workId, workConfig) {
  const workDir = fileStorage.getWorkPath(userId, workId);
  
  // 读取卷列表
  const volumesList = await fileStorage.readFile(`${workDir}/volumes/volumes.json`) || [];
  
  if (!Array.isArray(volumesList) || volumesList.length === 0) {
    console.warn("分卷作品没有卷数据，返回空章节");
    return {
      ...workConfig,
      chapters: [],
      volumes: [],
    };
  }

  // 按卷顺序排序
  const sortedVolumes = [...volumesList].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  // 读取所有卷的章节
  const allChapters = [];
  const volumesWithChapters = [];

  for (const volume of sortedVolumes) {
    const volumeId = volume.id;
    
    // 读取卷配置
    const volumeConfig = await fileStorage.readFile(
      `${workDir}/volumes/${volumeId}/volume.config.json`
    );
    
    // 读取卷内章节索引
    const chapterIndexList = await fileStorage.readFile(
      `${workDir}/volumes/${volumeId}/chapters/chapters.json`
    ) || [];
    
    // 读取卷内每个章节的完整内容
    const volumeChapters = [];
    if (Array.isArray(chapterIndexList)) {
      for (const chapterIndex of chapterIndexList) {
        try {
          const chapterContent = await fileStorage.readFile(
            `${workDir}/volumes/${volumeId}/chapters/${chapterIndex.id}.json`
          );
          if (chapterContent) {
            // 添加卷信息到章节
            volumeChapters.push({
              ...chapterContent,
              volume_id: volumeId,
              volume_name: volumeConfig?.name || volume.name || "未命名卷",
            });
          }
        } catch (error) {
          console.warn(`读取卷章节 ${volumeId}/${chapterIndex.id} 失败:`, error);
        }
      }
    }

    // 按卷内顺序排序
    volumeChapters.sort((a, b) => (a.volume_order || 0) - (b.volume_order || 0));
    
    // 添加到结果
    volumesWithChapters.push({
      ...volume,
      ...volumeConfig,
      chapters: volumeChapters,
    });
    
    allChapters.push(...volumeChapters);
  }

  return {
    ...workConfig,
    chapters: allChapters, // 所有章节的平铺列表（保持全局顺序）
    volumes: volumesWithChapters, // 带卷结构的完整数据
  };
}

/**
 * 将作品数据转换为文本格式（用于预览和降级）
 * 支持整体作品和分卷作品
 */
export function formatWorkAsText(workData) {
  let text = "";

  // 标题
  text += `《${workData.title || "未命名作品"}》\n\n`;

  // 描述
  if (workData.description) {
    text += `简介：${workData.description}\n\n`;
  }

  // 检查是否是分卷作品
  const hasVolumes = workData.volumes && workData.volumes.length > 0;

  if (hasVolumes) {
    // 分卷作品格式
    text += "=".repeat(50) + "\n";
    text += "卷目结构\n";
    text += "=".repeat(50) + "\n\n";

    workData.volumes.forEach((volume, vIndex) => {
      text += `【第${vIndex + 1}卷】${volume.name || volume.title || "未命名卷"}\n`;
      
      if (volume.description) {
        text += `  简介：${volume.description}\n`;
      }
      
      text += `  章节数：${volume.chapters?.length || 0}\n\n`;
    });

    text += "\n" + "=".repeat(50) + "\n";
    text += "正文内容\n";
    text += "=".repeat(50) + "\n\n";

    workData.volumes.forEach((volume, vIndex) => {
      text += `\n${"=".repeat(40)}\n`;
      text += `第${vIndex + 1}卷 ${volume.name || volume.title || "未命名卷"}\n`;
      text += "=".repeat(40) + "\n\n";

      if (volume.chapters && volume.chapters.length > 0) {
        volume.chapters.forEach((chapter, cIndex) => {
          text += `第${cIndex + 1}章 ${chapter.title || "未命名章节"}\n`;
          text += "-".repeat(30) + "\n";
          if (chapter.content) {
            text += chapter.content + "\n\n";
          } else {
            text += "（本章节暂无内容）\n\n";
          }
        });
      } else {
        text += "（本卷暂无章节）\n\n";
      }
    });
  } else {
    // 整体作品格式
    if (workData.chapters && workData.chapters.length > 0) {
      text += "=".repeat(50) + "\n";
      text += "章节内容\n";
      text += "=".repeat(50) + "\n\n";

      workData.chapters.forEach((chapter, index) => {
        text += `第${index + 1}章 ${chapter.title || "未命名章节"}\n`;
        text += "-".repeat(30) + "\n";
        if (chapter.content) {
          text += chapter.content + "\n\n";
        } else {
          text += "（本章节暂无内容）\n\n";
        }
      });
    } else {
      text += "\n（暂无章节内容）\n";
    }
  }

  return text;
}

/**
 * 准备导出数据结构
 * 将作品数据转换为原生插件所需的格式
 * 支持整体作品和分卷作品
 */
export function prepareExportData(workData, format = 'pdf') {
  // 检查是否是分卷作品
  const hasVolumes = workData.volumes && workData.volumes.length > 0;

  // 准备结构化章节数据
  let chapters = [];
  
  if (hasVolumes) {
    // 分卷作品：按卷组织章节
    workData.volumes.forEach((volume, vIndex) => {
      // 添加卷标题作为分隔章节
      chapters.push({
        title: `第${vIndex + 1}卷 ${volume.name || volume.title || "未命名卷"}`,
        content: volume.description || "",
        isVolumeHeader: true, // 标记为卷标题
        volumeIndex: vIndex
      });

      // 添加卷内章节
      if (volume.chapters && Array.isArray(volume.chapters)) {
        volume.chapters.forEach((chapter, cIndex) => {
          chapters.push({
            title: chapter.title || `第${cIndex + 1}章`,
            content: chapter.content || "",
            isVolumeHeader: false,
            volumeIndex: vIndex,
            chapterIndex: cIndex
          });
        });
      }
    });
  } else {
    // 整体作品：直接添加章节
    chapters = Array.isArray(workData.chapters) 
      ? workData.chapters.map((chapter, index) => {
          return {
            title: chapter.title || `第${index + 1}章`,
            content: chapter.content || "",
            isVolumeHeader: false,
            chapterIndex: index
          };
        }) 
      : [];
  }

  // 准备参数
  const options = {
    title: workData.title || "未命名作品",
    description: workData.description || "",
    chapters: chapters,
    hasVolumes: hasVolumes,
    volumesCount: hasVolumes ? workData.volumes.length : 0,
    // 格式化配置
    format: {
      titleFont: "宋体",
      titleSize: 22, // 二号字体
      titleBold: true,
      titleCenter: true,
      headingFont: "宋体", 
      headingSize: 16, // 三号字体
      headingBold: true,
      headingLeft: true,
      bodyFont: "宋体",
      bodySize: 14, // 四号字体
      lineSpacing: 1.5,
      // 卷标题特殊格式
      volumeTitleSize: 18, // 卷标题稍小于作品标题
      volumeTitleBold: true,
      volumeTitleCenter: true,
    }
  };

  return options;
}

/**
 * 导出作品为PDF
 * 严格模仿 exportHelper.js 中的 exportAsPDF 实现
 * 
 * @param {string} userId - 用户ID
 * @param {string} workId - 作品ID
 * @param {string} savePath - 保存路径
 * @param {Object} styleConfig - 样式配置（可选）
 * @returns {Promise<string>} 保存的文件路径
 */
export async function exportToPDF(userId, workId, savePath, styleConfig = null) {
  try {
    // 1. 获取完整作品数据
    const workData = await getFullWorkData(userId, workId);
    
    // 2. 准备导出数据
    const exportData = prepareExportData(workData, 'pdf');
    
    // 3. 如果有自定义样式配置，合并
    if (styleConfig) {
      exportData.format = {
        ...exportData.format,
        ...styleConfig
      };
    }

    // 4. 转换路径格式（APP环境）
    // #ifdef APP-PLUS
    let convertedSavePath = savePath;
    if (savePath.startsWith("_downloads/")) {
      convertedSavePath = plus.io.convertLocalFileSystemURL(savePath);
    }
    exportData.savePath = convertedSavePath;
    // #endif

    // #ifndef APP-PLUS
    exportData.savePath = savePath;
    // #endif

    // 5. 优先使用原生插件导出
    // #ifdef APP-PLUS
    if (isNativeExportAvailable()) {
      try {
        console.log('🔄 尝试使用原生插件导出PDF...');
        const result = await nativeExportPDFStructured(workData, exportData.savePath);
        console.log('✅ 原生插件PDF导出成功:', result);
        return result;
      } catch (nativeError) {
        console.error('❌ 原生插件PDF导出失败:', nativeError);
        // 继续执行降级方案
      }
    }
    // #endif

    // 6. 降级方案：导出为HTML
    console.warn('⚠️ 使用HTML降级方案');
    const htmlPath = savePath.replace(".pdf", ".html");
    const htmlContent = await exportAsHTML(userId, workId, htmlPath);
    
    // 提示用户
    setTimeout(() => {
      uni.showModal({
        title: "PDF导出提示",
        content: "当前导出为HTML格式。\n\nHTML文件可以在浏览器中打开后打印为PDF。\n\n如需真正的PDF支持，请确保原生插件已正确安装。",
        showCancel: false,
      });
    }, 100);
    
    return htmlContent;
  } catch (error) {
    console.error("导出PDF失败:", error);
    throw error;
  }
}

/**
 * 导出作品为DOCX
 * 严格模仿 exportHelper.js 中的 exportAsDOCX 实现
 * 
 * @param {string} userId - 用户ID
 * @param {string} workId - 作品ID
 * @param {string} savePath - 保存路径
 * @param {Object} styleConfig - 样式配置（可选）
 * @returns {Promise<string>} 保存的文件路径
 */
export async function exportToDOCX(userId, workId, savePath, styleConfig = null) {
  try {
    // 1. 获取完整作品数据
    const workData = await getFullWorkData(userId, workId);
    
    // 2. 准备导出数据
    const exportData = prepareExportData(workData, 'docx');
    
    // 3. 如果有自定义样式配置，合并
    if (styleConfig) {
      exportData.format = {
        ...exportData.format,
        ...styleConfig
      };
    }

    // 4. 转换路径格式（APP环境）
    // #ifdef APP-PLUS
    let convertedSavePath = savePath;
    if (savePath.startsWith("_downloads/")) {
      convertedSavePath = plus.io.convertLocalFileSystemURL(savePath);
    }
    exportData.savePath = convertedSavePath;
    // #endif

    // #ifndef APP-PLUS
    exportData.savePath = savePath;
    // #endif

    // 5. 优先使用原生插件导出
    // #ifdef APP-PLUS
    if (isNativeExportAvailable()) {
      try {
        console.log('🔄 尝试使用原生插件导出DOCX...');
        const result = await nativeExportDOCXStructured(workData, exportData.savePath);
        console.log('✅ 原生插件DOCX导出成功:', result);
        return result;
      } catch (nativeError) {
        console.error('❌ 原生插件DOCX导出失败:', nativeError);
        // 继续执行降级方案
      }
    }
    // #endif

    // 6. 降级方案：导出为文本
    console.warn('⚠️ 使用文本降级方案');
    const txtPath = savePath.replace(".docx", ".txt");
    const textContent = await exportAsText(userId, workId, txtPath);
    
    // 提示用户
    setTimeout(() => {
      uni.showModal({
        title: "DOCX导出提示",
        content: "当前导出为文本格式。\n\n文本文件可以在Word中打开并另存为DOCX格式。\n\n如需真正的DOCX支持，请确保原生插件已正确安装。",
        showCancel: false,
      });
    }, 100);
    
    return textContent;
  } catch (error) {
    console.error("导出DOCX失败:", error);
    throw error;
  }
}

/**
 * 导出作品为HTML文件（降级方案）
 * 支持整体作品和分卷作品
 */
export async function exportAsHTML(userId, workId, savePath) {
  try {
    const workData = await getFullWorkData(userId, workId);
    const hasVolumes = workData.volumes && workData.volumes.length > 0;
    
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${workData.title || "未命名作品"}</title>
  <style>
    body {
      font-family: "Microsoft YaHei", "SimSun", serif;
      line-height: 1.8;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 {
      text-align: center;
      font-size: 24px;
      margin-bottom: 10px;
      color: #FF6B35;
    }
    .description {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .volume {
      margin-bottom: 50px;
    }
    .volume-title {
      font-size: 22px;
      font-weight: bold;
      margin: 30px 0 20px 0;
      color: #2c5282;
      text-align: center;
      border-top: 3px double #2c5282;
      border-bottom: 3px double #2c5282;
      padding: 15px 0;
    }
    .volume-description {
      text-align: center;
      color: #666;
      margin-bottom: 20px;
      font-size: 14px;
      font-style: italic;
    }
    .chapter {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .chapter-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #333;
      border-bottom: 2px solid #FF6B35;
      padding-bottom: 10px;
    }
    .chapter-content {
      font-size: 16px;
      text-indent: 2em;
      line-height: 2;
      white-space: pre-wrap;
    }
    .toc {
      background: #f7f7f7;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 8px;
    }
    .toc-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #333;
    }
    .toc-volume {
      margin-bottom: 10px;
    }
    .toc-volume-name {
      font-weight: bold;
      color: #2c5282;
      margin: 5px 0;
    }
    .toc-chapter {
      margin-left: 20px;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>《${workData.title || "未命名作品"}》</h1>
  ${workData.description ? `<div class="description">${workData.description}</div>` : ""}
`;

    // 如果是分卷作品，添加目录
    if (hasVolumes) {
      html += `
  <div class="toc">
    <div class="toc-title">目录</div>
`;
      workData.volumes.forEach((volume, vIndex) => {
        html += `
    <div class="toc-volume">
      <div class="toc-volume-name">第${vIndex + 1}卷 ${volume.name || volume.title || "未命名卷"}</div>
`;
        if (volume.chapters) {
          volume.chapters.forEach((chapter, cIndex) => {
            html += `      <div class="toc-chapter">第${cIndex + 1}章 ${chapter.title || "未命名章节"}</div>\n`;
          });
        }
        html += `    </div>\n`;
      });
      html += `  </div>\n`;
    }

    // 正文内容
    if (hasVolumes) {
      // 分卷作品格式
      workData.volumes.forEach((volume, vIndex) => {
        html += `
  <div class="volume">
    <div class="volume-title">第${vIndex + 1}卷 ${volume.name || volume.title || "未命名卷"}</div>
    ${volume.description ? `<div class="volume-description">${volume.description}</div>` : ""}
`;
        if (volume.chapters && volume.chapters.length > 0) {
          volume.chapters.forEach((chapter, cIndex) => {
            html += `
    <div class="chapter">
      <div class="chapter-title">第${cIndex + 1}章 ${chapter.title || "未命名章节"}</div>
      <div class="chapter-content">
        ${chapter.content ? chapter.content.replace(/\n/g, "<br>") : "（本章节暂无内容）"}
      </div>
    </div>
`;
          });
        } else {
          html += `    <div class="chapter-content">（本卷暂无章节）</div>\n`;
        }
        html += `  </div>\n`;
      });
    } else {
      // 整体作品格式
      if (workData.chapters && workData.chapters.length > 0) {
        workData.chapters.forEach((chapter, index) => {
          html += `
  <div class="chapter">
    <div class="chapter-title">第${index + 1}章 ${chapter.title || "未命名章节"}</div>
    <div class="chapter-content">
      ${chapter.content ? chapter.content.replace(/\n/g, "<br>") : "（本章节暂无内容）"}
    </div>
  </div>
`;
        });
      }
    }

    html += `
</body>
</html>
`;

    // 保存文件
    if (typeof plus !== "undefined" && plus.io) {
      return new Promise((resolve, reject) => {
        plus.io.requestFileSystem(
          plus.io.PUBLIC_DOCUMENTS,
          (fs) => {
            fs.root.getFile(
              savePath,
              { create: true, exclusive: false },
              (fileEntry) => {
                fileEntry.createWriter(
                  (writer) => {
                    writer.onwriteend = () => {
                      resolve(savePath);
                    };
                    writer.onerror = (error) => {
                      reject(new Error("文件写入失败: " + error.message));
                    };
                    writer.write(html);
                  },
                  (error) => {
                    reject(new Error("创建文件写入器失败: " + error.message));
                  }
                );
              },
              (error) => {
                reject(new Error("获取文件失败: " + error.message));
              }
            );
          },
          (error) => {
            reject(new Error("请求文件系统失败: " + error.message));
          }
        );
      });
    } else {
      // H5环境 - 使用下载方式
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = savePath.split("/").pop() || "export.html";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return savePath;
    }
  } catch (error) {
    console.error("导出HTML失败:", error);
    throw error;
  }
}

/**
 * 导出作品为文本文件（降级方案）
 */
export async function exportAsText(userId, workId, savePath) {
  try {
    const workData = await getFullWorkData(userId, workId);
    const textContent = formatWorkAsText(workData);

    if (typeof plus !== "undefined" && plus.io) {
      return new Promise((resolve, reject) => {
        plus.io.requestFileSystem(
          plus.io.PUBLIC_DOCUMENTS,
          (fs) => {
            fs.root.getFile(
              savePath,
              { create: true, exclusive: false },
              (fileEntry) => {
                fileEntry.createWriter(
                  (writer) => {
                    writer.onwriteend = () => {
                      resolve(savePath);
                    };
                    writer.onerror = (error) => {
                      reject(new Error("文件写入失败: " + error.message));
                    };
                    writer.write(textContent);
                  },
                  (error) => {
                    reject(new Error("创建文件写入器失败: " + error.message));
                  }
                );
              },
              (error) => {
                reject(new Error("获取文件失败: " + error.message));
              }
            );
          },
          (error) => {
            reject(new Error("请求文件系统失败: " + error.message));
          }
        );
      });
    } else {
      // H5环境
      const blob = new Blob([textContent], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = savePath.split("/").pop() || "export.txt";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return savePath;
    }
  } catch (error) {
    console.error("导出文本失败:", error);
    throw error;
  }
}

/**
 * 获取默认导出路径
 */
export function getDefaultExportPath(workTitle, format) {
  const timestamp = new Date().getTime();
  const safeTitle = (workTitle || "未命名作品").replace(/[^\w\s-]/g, "").trim();
  const extension = format === "pdf" ? ".pdf" : format === "docx" ? ".docx" : ".txt";

  // App环境使用_downloads目录
  if (typeof plus !== "undefined" && plus.io) {
    return `_downloads/${safeTitle}_${timestamp}${extension}`;
  }

  // 其他环境
  return `${safeTitle}_${timestamp}${extension}`;
}

/**
 * 获取导出预览内容
 */
export async function getExportPreview(userId, workId, format = "text") {
  try {
    const workData = await getFullWorkData(userId, workId);
    return formatWorkAsText(workData);
  } catch (error) {
    console.error("获取导出预览失败:", error);
    throw error;
  }
}

/**
 * 检查导出功能是否可用
 */
export function isExportAvailable() {
  // #ifdef APP-PLUS
  return isNativeExportAvailable();
  // #endif
  
  // #ifndef APP-PLUS
  return false;
  // #endif
}

// 导出工具 - 用于导出作品为各种格式
import fileStorage from "./fileSystemStorage.js";
import {
  nativeExportPDF,
  nativeExportDOCX,
  isNativeExportAvailable,
} from "./nativeExport.js";
import {
  hybridExportPDF,
  hybridExportDOCX,
  isHybridExportAvailable,
} from "./exportHybrid.js";

/**
 * 检查导出插件是否已初始化
 *
 * 注意：导出插件应该在main.js中初始化（可选）
 * 如果插件未初始化，会自动使用降级方案
 */
function checkExportPlugin() {
  // 检查全局变量是否已设置（说明插件已在main.js中初始化）
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

/**
 * 获取完整的作品数据（包括所有章节内容）
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
    };
  } catch (error) {
    console.error("获取完整作品数据失败:", error);
    throw error;
  }
}

/**
 * 将作品数据转换为文本格式
 */
export function formatWorkAsText(workData) {
  let text = "";

  // 标题
  text += `《${workData.title || "未命名作品"}》\n\n`;

  // 描述
  if (workData.description) {
    text += `简介：${workData.description}\n\n`;
  }

  // 章节内容
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

  return text;
}

/**
 * 将作品数据转换为HTML格式（用于PDF生成）
 */
export function formatWorkAsHTML(workData) {
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
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
    .empty-chapter {
      color: #999;
      font-style: italic;
    }
  </style>
</head>
<body>
  <h1>《${workData.title || "未命名作品"}》</h1>
  ${
    workData.description
      ? `<div class="description">${workData.description}</div>`
      : ""
  }
`;

  if (workData.chapters && workData.chapters.length > 0) {
    workData.chapters.forEach((chapter, index) => {
      html += `
  <div class="chapter">
    <div class="chapter-title">第${index + 1}章 ${
        chapter.title || "未命名章节"
      }</div>
    <div class="chapter-content ${!chapter.content ? "empty-chapter" : ""}">
      ${
        chapter.content
          ? chapter.content.replace(/\n/g, "<br>")
          : "（本章节暂无内容）"
      }
    </div>
  </div>
`;
    });
  } else {
    html +=
      '<div class="chapter"><div class="chapter-content empty-chapter">（暂无章节内容）</div></div>';
  }

  html += `
</body>
</html>
`;
  return html;
}

/**
 * 导出作品为文本文件
 */
export async function exportAsText(userId, workId, savePath) {
  try {
    const workData = await getFullWorkData(userId, workId);
    const textContent = formatWorkAsText(workData);

    // 使用uni-app的文件系统API保存文件
    if (typeof plus !== "undefined" && plus.io) {
      // App环境 - 使用plus.io保存文件
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
                    // 直接写入文本内容
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
      // H5或其他环境 - 使用下载方式
      // 创建Blob并下载
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
    console.error("导出文本文件失败:", error);
    throw error;
  }
}

/**
 * 导出作品为HTML文件
 */
export async function exportAsHTML(userId, workId, savePath) {
  try {
    const workData = await getFullWorkData(userId, workId);
    const htmlContent = formatWorkAsHTML(workData);

    // 使用uni-app的文件系统API保存文件
    if (typeof plus !== "undefined" && plus.io) {
      // App环境 - 使用plus.io保存文件
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
                    // 直接写入HTML内容
                    writer.write(htmlContent);
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
      // H5或其他环境 - 使用下载方式
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
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
    console.error("导出HTML文件失败:", error);
    throw error;
  }
}

/**
 * 导出作品为PDF
 * 需要安装: npm install jspdf
 * 注意：使用条件导入避免代码分包问题
 */
export async function exportAsPDF(userId, workId, savePath) {
  try {
    // 优先使用混合导出方案（APP环境）
    // #ifdef APP-PLUS
    if (isHybridExportAvailable()) {
      try {
        const workData = await getFullWorkData(userId, workId);
        const title = workData.title || "未命名作品";
        const textContent = formatWorkAsText(workData);

        const result = await hybridExportPDF(title, textContent, savePath);
        return result;
      } catch (hybridError) {
        // 继续执行原生插件方案
      }
    }
    
    // 备选方案：使用原生插件
    if (isNativeExportAvailable()) {
      try {
        const workData = await getFullWorkData(userId, workId);
        const title = workData.title || "未命名作品";
        const textContent = formatWorkAsText(workData);

        const result = await nativeExportPDF(title, textContent, savePath);
        return result;
      } catch (nativeError) {
        // 继续执行降级方案
      }
    }
    // #endif

    // 降级方案：检查jsPDF是否可用
    let jsPDF;
    let hasJsPDF = false;

    // 获取全局对象（支持多种环境）
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

    // 方式1: 检查导出插件是否已初始化（在main.js中）
    if (checkExportPlugin() && globalObj && globalObj.jsPDF) {
      jsPDF = globalObj.jsPDF;
      hasJsPDF = true;
    }
    // 方式2: 检查全局变量（支持多种环境）
    else if (globalObj && globalObj.jsPDF) {
      jsPDF = globalObj.jsPDF;
      hasJsPDF = true;
    }
    // 方式3: 检查window对象（H5环境）
    else if (typeof window !== "undefined" && window.jsPDF) {
      jsPDF = window.jsPDF;
      hasJsPDF = true;
    }
    // 方式4: 检查是否可以通过eval访问（仅开发环境，作为备用）
    else if (typeof eval !== "undefined") {
      try {
        // 使用Function构造器避免直接eval，更安全
        const checkJsPDF = new Function(
          'return typeof require !== "undefined" ? require("jspdf") : null'
        );
        const result = checkJsPDF();
        if (result) {
          jsPDF = result.default || result.jsPDF || result;
          hasJsPDF = true;
        }
      } catch (e) {
        // 忽略错误，继续降级方案
      }
    }
    // 如果仍未找到，直接使用降级方案
    if (!hasJsPDF) {
      console.warn("jsPDF未配置，使用HTML降级方案");
      // 降级方案：导出为HTML
      const htmlPath = savePath.replace(".pdf", ".html");
      const htmlContent = await exportAsHTML(userId, workId, htmlPath);
      setTimeout(() => {
        uni.showModal({
          title: "PDF导出提示",
          content:
            "当前导出为HTML格式（.html）。\n\n这是为了避免代码分包问题的正常行为。\n\nHTML文件可以在浏览器中打开后打印为PDF。\n\n如需真正的PDF支持，建议使用原生插件（APP环境）或配置全局变量方式。",
          showCancel: false,
        });
      }, 100);
      return htmlContent;
    }

    const workData = await getFullWorkData(userId, workId);

    // 创建PDF文档
    const Doc = jsPDF.jsPDF || jsPDF;
    const doc = new Doc({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // 设置中文字体（需要额外配置字体文件）
    // 这里使用默认字体，中文可能显示为方块
    // 如需支持中文，需要加载中文字体文件

    // 添加标题
    doc.setFontSize(18);
    doc.text(workData.title || "未命名作品", 105, 20, { align: "center" });

    // 添加描述
    if (workData.description) {
      doc.setFontSize(12);
      const descLines = doc.splitTextToSize(workData.description, 180);
      doc.text(descLines, 105, 35, { align: "center" });
    }

    let yPos = 50;
    const pageHeight = 280; // A4页面高度（mm）
    const margin = 20;

    // 添加章节内容
    if (workData.chapters && workData.chapters.length > 0) {
      workData.chapters.forEach((chapter, index) => {
        // 检查是否需要新页面
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }

        // 章节标题
        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        const chapterTitle = `第${index + 1}章 ${
          chapter.title || "未命名章节"
        }`;
        doc.text(chapterTitle, margin, yPos);
        yPos += 10;

        // 章节内容
        if (chapter.content) {
          doc.setFontSize(11);
          doc.setFont(undefined, "normal");
          const contentLines = doc.splitTextToSize(chapter.content, 170);

          contentLines.forEach((line) => {
            if (yPos > pageHeight - 20) {
              doc.addPage();
              yPos = margin;
            }
            doc.text(line, margin, yPos);
            yPos += 7;
          });
        } else {
          doc.setFontSize(10);
          doc.text("（本章节暂无内容）", margin, yPos);
          yPos += 7;
        }

        yPos += 5; // 章节间距
      });
    }

    // 保存PDF
    if (typeof plus !== "undefined" && plus.io) {
      // App环境
      const pdfBlob = doc.output("blob");
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
                    writer.write(pdfBlob);
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
      // H5环境 - 直接下载
      doc.save(savePath.split("/").pop() || "export.pdf");
      return savePath;
    }
  } catch (error) {
    console.error("导出PDF失败:", error);
    throw error;
  }
}

/**
 * 导出作品为DOCX格式
 * 需要安装: npm install docx file-saver
 * 注意：使用条件导入避免代码分包问题
 */
export async function exportAsDOCX(userId, workId, savePath) {
  try {
    // 优先使用混合导出方案（APP环境）
    // #ifdef APP-PLUS
    if (isHybridExportAvailable()) {
      try {
        const workData = await getFullWorkData(userId, workId);
        const title = workData.title || "未命名作品";
        const textContent = formatWorkAsText(workData);

        const result = await hybridExportDOCX(title, textContent, savePath);
        return result;
      } catch (hybridError) {
        // 继续执行原生插件方案
      }
    }
    
    // 备选方案：使用原生插件
    if (isNativeExportAvailable()) {
      try {
        const workData = await getFullWorkData(userId, workId);
        const title = workData.title || "未命名作品";
        const textContent = formatWorkAsText(workData);

        const result = await nativeExportDOCX(title, textContent, savePath);
        return result;
      } catch (nativeError) {
        // 继续执行降级方案
      }
    }
    // #endif

    // 降级方案：检查docx和file-saver是否可用
    let docx, fileSaver;
    let hasDocx = false;

    // 获取全局对象（支持多种环境）
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

    // 方式1: 检查导出插件是否已初始化（在main.js中）
    if (
      checkExportPlugin() &&
      globalObj &&
      globalObj.docx &&
      globalObj.saveAs
    ) {
      docx = globalObj.docx;
      fileSaver = globalObj.saveAs;
      hasDocx = true;
    }
    // 方式2: 检查全局变量（支持多种环境）
    else if (globalObj && globalObj.docx && globalObj.saveAs) {
      docx = globalObj.docx;
      fileSaver = globalObj.saveAs;
      hasDocx = true;
    }
    // 方式3: 检查window对象（H5环境）
    else if (typeof window !== "undefined" && window.docx && window.saveAs) {
      docx = window.docx;
      fileSaver = window.saveAs;
      hasDocx = true;
    }
    // 方式4: 检查是否可以通过eval访问（仅开发环境，作为备用）
    else if (typeof eval !== "undefined") {
      try {
        const checkDocx = new Function(
          'return typeof require !== "undefined" ? require("docx") : null'
        );
        const checkFileSaver = new Function(
          'return typeof require !== "undefined" ? require("file-saver") : null'
        );
        const docxResult = checkDocx();
        const fileSaverResult = checkFileSaver();
        if (docxResult && fileSaverResult) {
          docx = docxResult.default || docxResult;
          fileSaver =
            fileSaverResult.default ||
            fileSaverResult.saveAs ||
            fileSaverResult;
          hasDocx = true;
        }
      } catch (e) {
        // 忽略错误，继续降级方案
      }
    }

    // 如果仍未找到，直接使用降级方案
    if (!hasDocx) {
      console.warn("docx库未配置，使用文本降级方案");
      // 降级方案：导出为文本
      const txtPath = savePath.replace(".docx", ".txt");
      const textContent = await exportAsText(userId, workId, txtPath);
      setTimeout(() => {
        uni.showModal({
          title: "DOCX导出提示",
          content:
            "当前导出为文本格式（.txt）。\n\n这是为了避免代码分包问题的正常行为。\n\n文本文件可以在Word中打开并另存为DOCX格式。\n\n如需真正的DOCX支持，建议使用原生插件（APP环境）或配置全局变量方式。",
          showCancel: false,
        });
      }, 100);
      return textContent;
    }

    const workData = await getFullWorkData(userId, workId);

    // 创建文档段落
    const children = [];

    // 标题
    children.push(
      new docx.Paragraph({
        text: workData.title || "未命名作品",
        heading: docx.HeadingLevel.TITLE,
        alignment: docx.AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // 描述
    if (workData.description) {
      children.push(
        new docx.Paragraph({
          text: workData.description,
          alignment: docx.AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
    }

    // 章节内容
    if (workData.chapters && workData.chapters.length > 0) {
      workData.chapters.forEach((chapter, index) => {
        // 章节标题
        children.push(
          new docx.Paragraph({
            text: `第${index + 1}章 ${chapter.title || "未命名章节"}`,
            heading: docx.HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          })
        );

        // 章节内容
        if (chapter.content) {
          const contentLines = chapter.content.split("\n");
          contentLines.forEach((line) => {
            if (line.trim()) {
              children.push(
                new docx.Paragraph({
                  text: line,
                  spacing: { after: 120 },
                })
              );
            }
          });
        } else {
          children.push(
            new docx.Paragraph({
              text: "（本章节暂无内容）",
              spacing: { after: 120 },
            })
          );
        }
      });
    } else {
      children.push(
        new docx.Paragraph({
          text: "（暂无章节内容）",
          spacing: { after: 120 },
        })
      );
    }

    // 创建文档
    const doc = new docx.Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });

    // 生成并保存文档
    const blob = await docx.Packer.toBlob(doc);

    if (typeof plus !== "undefined" && plus.io) {
      // App环境
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
                    writer.write(blob);
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
      // H5环境 - 使用file-saver下载
      fileSaver.saveAs(blob, savePath.split("/").pop() || "export.docx");
      return savePath;
    }
  } catch (error) {
    console.error("导出DOCX失败:", error);
    throw error;
  }
}

/**
 * 获取默认导出路径
 */
export function getDefaultExportPath(workTitle, format) {
  const timestamp = new Date().getTime();
  const safeTitle = (workTitle || "未命名作品").replace(/[^\w\s-]/g, "").trim();
  const extension =
    format === "pdf"
      ? ".pdf"
      : format === "docx"
      ? ".docx"
      : format === "html"
      ? ".html"
      : ".txt";

  // App环境使用_downloads目录
  if (typeof plus !== "undefined" && plus.io) {
    return `_downloads/${safeTitle}_${timestamp}${extension}`;
  }

  // 其他环境
  return `${safeTitle}_${timestamp}${extension}`;
}

/**
 * 删除导出文件
 */
export async function deleteExportFile(filePath) {
  try {
    if (typeof plus !== "undefined" && plus.io) {
      // App环境
      return new Promise((resolve, reject) => {
        plus.io.requestFileSystem(
          plus.io.PUBLIC_DOCUMENTS,
          (fs) => {
            fs.root.getFile(
              filePath,
              {},
              (fileEntry) => {
                fileEntry.remove(
                  () => {
                    resolve(true);
                  },
                  (error) => {
                    reject(new Error("删除文件失败: " + error.message));
                  }
                );
              },
              (error) => {
                // 文件不存在，也算删除成功
                resolve(true);
              }
            );
          },
          (error) => {
            reject(new Error("请求文件系统失败: " + error.message));
          }
        );
      });
    } else {
      // H5环境，文件已下载，无法删除
      console.warn("H5环境无法删除已下载的文件");
      return true;
    }
  } catch (error) {
    console.error("删除导出文件失败:", error);
    throw error;
  }
}

/**
 * 获取导出预览内容
 */
export async function getExportPreview(userId, workId, format = "text") {
  try {
    const workData = await getFullWorkData(userId, workId);

    if (format === "html" || format === "pdf") {
      return formatWorkAsHTML(workData);
    } else {
      return formatWorkAsText(workData);
    }
  } catch (error) {
    console.error("获取导出预览失败:", error);
    throw error;
  }
}

/**
 * 导入服务 - 严格模仿原来成功的 importHelper.js 实现
 * 
 * 提供作品导入功能，支持 DOCX 格式
 * 使用原生插件解析，支持样式配置
 */

import fileStorage from '../fileSystemStorage.js';
import { nativeImportDOCX, isNativeImportAvailable } from '../nativeImport.js';

/**
 * 解析DOCX文件
 * 严格复制自 importHelper.js
 * 
 * @param {string} filePath - 文件路径
 * @param {Object} styleConfig - 样式配置（可选，null表示使用默认配置）
 * @returns {Promise<Object>} 解析结果
 */
export async function parseDOCXFile(filePath, styleConfig = null) {
  try {
    // 检查原生导入是否可用
    if (!isNativeImportAvailable()) {
      throw new Error("当前平台不支持DOCX导入");
    }

    // 调用原生插件解析文件
    const result = await nativeImportDOCX(filePath, styleConfig);

    if (!result || !result.success) {
      throw new Error(result?.error || "解析文件失败");
    }

    return {
      success: true,
      data: result.data || {
        title: "",
        description: "",
        chapters: [],
      },
    };
  } catch (error) {
    console.error("解析DOCX文件失败:", error);
    return {
      success: false,
      error: error.message || "解析文件失败",
    };
  }
}

/**
 * 检查重复导入
 * 严格复制自 importHelper.js
 * 
 * @param {string} userId - 用户ID
 * @param {string} fileName - 文件名
 * @returns {Promise<boolean>} 是否重复
 */
export async function checkDuplicateImport(userId, fileName) {
  try {
    // 获取用户的所有作品
    const works = await fileStorage.getUserWorks(userId);

    // 检查是否有同名文件导入的作品
    for (const work of works) {
      if (
        work.title &&
        fileName &&
        work.title.includes(fileName.replace(".docx", ""))
      ) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("检查重复导入失败:", error);
    return false; // 出错时返回false，允许继续导入
  }
}

/**
 * 验证章节长度
 * 
 * @param {string} content - 章节内容
 * @returns {boolean} 是否有效（不超过2万字）
 */
export function validateChapterLength(content) {
  if (!content) return true;
  const length = content.replace(/\s/g, "").length;
  return length <= 20000;
}

/**
 * 从导入数据创建作品
 * 严格复制自 importHelper.js
 * 
 * @param {string} userId - 用户ID
 * @param {Object} importData - 导入数据（包含title、description、chapters）
 * @param {string} fileName - 文件名（用于重复检测）
 * @returns {Promise<Object>} 创建的作品对象
 */
export async function createWorkFromImport(userId, importData, fileName) {
  try {
    // 检查是否已存在同名作品（用于覆盖）
    const existingWorks = await fileStorage.getUserWorks(userId);
    let existingWork = null;

    for (const work of existingWorks) {
      if (
        work.title &&
        fileName &&
        work.title.includes(fileName.replace(".docx", ""))
      ) {
        existingWork = work;
        break;
      }
    }

    // 准备作品数据
    const workData = {
      title: importData.title || fileName.replace(".docx", "") || "未命名作品",
      description: importData.description || "",
      category: "novel",
      structure_type: "single",
    };

    let work;
    if (existingWork) {
      // 更新现有作品
      await fileStorage.updateWork(userId, existingWork.id, workData);

      // 重新读取作品信息
      const workConfigPath = `${fileStorage.getWorkPath(
        userId,
        existingWork.id
      )}/work.config.json`;
      work = await fileStorage.readFile(workConfigPath);

      // 删除现有章节（覆盖模式）
      const existingChapters = await fileStorage.getChapters(
        userId,
        existingWork.id
      );
      for (const chapter of existingChapters) {
        await fileStorage.deleteChapter(userId, existingWork.id, chapter.id);
      }
    } else {
      // 创建新作品
      work = await fileStorage.createWork(userId, workData);
    }

    return work;
  } catch (error) {
    console.error("创建作品失败:", error);
    throw new Error("创建作品失败: " + error.message);
  }
}

/**
 * 检测作品标题（从解析结果中提取）
 * 
 * @param {Object} parsedData - 解析结果
 * @param {string} fileName - 文件名（备用）
 * @returns {string} 作品标题
 */
export function detectWorkTitle(parsedData, fileName) {
  if (parsedData && parsedData.title) {
    return parsedData.title.trim();
  }
  if (fileName) {
    return fileName.replace(/\.docx$/i, "").trim();
  }
  return "未命名作品";
}

/**
 * 检测简介（从解析结果中提取）
 * 
 * @param {Object} parsedData - 解析结果
 * @returns {string} 简介内容
 */
export function detectDescription(parsedData) {
  if (parsedData && parsedData.description) {
    return parsedData.description.trim();
  }
  return "";
}

/**
 * 检测章节（从解析结果中提取）
 * 
 * @param {Object} parsedData - 解析结果
 * @returns {Array} 章节列表
 */
export function detectChapters(parsedData) {
  if (parsedData && Array.isArray(parsedData.chapters)) {
    return parsedData.chapters;
  }
  return [];
}

/**
 * 清理章节标题 - 去除"第x章"前缀，只保留具体内容
 * 严格复制自 importHelper.js
 * 
 * @param {string} title - 原始标题
 * @returns {string} 清理后的标题（只保留具体内容）
 */
export function cleanDuplicateChapterPrefix(title) {
  if (!title || typeof title !== "string") {
    return title || "";
  }

  // 匹配"第x章"的模式（支持中文数字和阿拉伯数字）
  const chapterPrefixPattern = /^第[一二三四五六七八九十百千万\d]+章\s*/;

  // 检查标题是否以"第x章"开头
  const match = title.match(chapterPrefixPattern);
  
  if (match) {
    const restTitle = title.substring(match[0].length).trim();
    return restTitle || "未命名章节";
  }

  // 如果标题不以"第x章"开头，查找第一个"第x章"的位置
  const firstMatch = title.match(/第[一二三四五六七八九十百千万\d]+章/);

  if (firstMatch) {
    const matchIndex = firstMatch.index;
    const matchLength = firstMatch[0].length;
    const afterMatch = title.substring(matchIndex + matchLength).trim();
    return afterMatch || "未命名章节";
  }

  return title.trim();
}

/**
 * 执行完整导入流程
 * 封装了选择文件、解析、创建作品、创建章节的完整流程
 * 
 * @param {string} userId - 用户ID
 * @param {string} filePath - 文件路径
 * @param {Object} styleConfig - 样式配置（可选）
 * @param {Object} options - 导入选项
 * @returns {Promise<Object>} 导入结果
 */
export async function performImport(userId, filePath, styleConfig = null, options = {}) {
  const result = {
    success: false,
    work: null,
    chapters: [],
    error: null
  };

  try {
    // 1. 解析文件
    console.log('🔄 开始解析DOCX文件:', filePath);
    const parseResult = await parseDOCXFile(filePath, styleConfig);
    
    if (!parseResult.success) {
      throw new Error(parseResult.error || "解析文件失败");
    }

    const parsedData = parseResult.data;
    console.log('✅ 文件解析成功:', parsedData.title, parsedData.chapters?.length, '章');

    // 2. 检查是否重复导入
    const fileName = filePath.split('/').pop();
    const isDuplicate = await checkDuplicateImport(userId, fileName);
    
    if (isDuplicate && !options.allowOverwrite) {
      result.error = "检测到重复导入";
      result.isDuplicate = true;
      return result;
    }

    // 3. 创建作品
    console.log('🔄 创建作品...');
    const work = await createWorkFromImport(userId, parsedData, fileName);
    result.work = work;
    console.log('✅ 作品创建成功:', work.id);

    // 4. 创建章节
    console.log('🔄 创建章节...');
    if (parsedData.chapters && parsedData.chapters.length > 0) {
      for (let i = 0; i < parsedData.chapters.length; i++) {
        const chapter = parsedData.chapters[i];
        
        // 检查章节长度
        const contentLength = (chapter.content || "").replace(/\s/g, "").length;
        if (contentLength > 20000) {
          console.warn(`⚠️ 第${i + 1}章内容过长（${contentLength}字），跳过`);
          continue;
        }

        // 清理章节标题
        let cleanedTitle = chapter.title || `第${i + 1}章`;
        cleanedTitle = cleanDuplicateChapterPrefix(cleanedTitle);

        // 创建章节
        try {
          await fileStorage.createChapter(userId, work.id, {
            title: cleanedTitle,
            content: chapter.content || "",
          });
          result.chapters.push({
            title: cleanedTitle,
            contentLength: contentLength
          });
          console.log(`✅ 章节创建成功: ${cleanedTitle}`);
        } catch (chapterError) {
          console.error(`❌ 章节创建失败: ${cleanedTitle}`, chapterError);
        }
      }
    }

    result.success = true;
    console.log('✅ 导入完成:', result.chapters.length, '章');
    
    return result;
  } catch (error) {
    console.error("导入失败:", error);
    result.error = error.message || "导入失败";
    return result;
  }
}

/**
 * 获取导入预览
 * 解析文件并返回预览数据，不实际创建作品
 * 
 * @param {string} filePath - 文件路径
 * @param {Object} styleConfig - 样式配置（可选）
 * @returns {Promise<Object>} 预览数据
 */
export async function getImportPreview(filePath, styleConfig = null) {
  try {
    const parseResult = await parseDOCXFile(filePath, styleConfig);
    
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error
      };
    }

    const data = parseResult.data;
    
    // 计算总字数
    const totalWords = (data.chapters || []).reduce((sum, ch) => 
      sum + (ch.content || "").replace(/\s/g, "").length, 0
    );
    
    // 生成预览数据（包含完整的章节信息用于预览）
    const preview = {
      title: data.title || "未命名作品",
      description: data.description || "",
      chapters: (data.chapters || []).map((chapter, index) => ({
        title: chapter.title || `第${index + 1}章`,
        content: chapter.content || "",
        contentLength: (chapter.content || "").replace(/\s/g, "").length
      })),
      totalChapters: (data.chapters || []).length,
      totalWords: totalWords
    };

    return {
      success: true,
      data: preview
    };
  } catch (error) {
    console.error("获取导入预览失败:", error);
    return {
      success: false,
      error: error.message || "预览失败"
    };
  }
}

/**
 * 检查导入功能是否可用
 */
export function isImportAvailable() {
  // #ifdef APP-PLUS
  return isNativeImportAvailable();
  // #endif
  
  // #ifndef APP-PLUS
  return false;
  // #endif
}

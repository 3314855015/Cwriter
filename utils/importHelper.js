// 导入工具 - 用于从DOCX文件导入作品
import fileStorage from "./fileSystemStorage.js";
import { nativeImportDOCX, isNativeImportAvailable } from "./nativeImport.js";

/**
 * 解析DOCX文件
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
 * @param {string} userId - 用户ID
 * @param {string} fileName - 文件名
 * @returns {Promise<boolean>} 是否重复
 */
export async function checkDuplicateImport(userId, fileName) {
  try {
    // 获取用户的所有作品
    const works = await fileStorage.getUserWorks(userId);

    // 检查是否有同名文件导入的作品
    // 这里可以根据实际需求调整判断逻辑
    // 例如：检查作品描述中是否包含文件名，或者使用其他标识
    for (const work of works) {
      // 简单判断：检查作品标题是否与文件名相关
      // 实际应用中可能需要更精确的判断
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
      structure_type: "single", // 导入的作品默认是分章节的
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
 * @param {Object} parsedData - 解析结果
 * @param {string} fileName - 文件名（备用）
 * @returns {string} 作品标题
 */
export function detectWorkTitle(parsedData, fileName) {
  if (parsedData && parsedData.title) {
    return parsedData.title.trim();
  }
  // 如果没有检测到标题，使用文件名（去除扩展名）
  if (fileName) {
    return fileName.replace(/\.docx$/i, "").trim();
  }
  return "未命名作品";
}

/**
 * 检测简介（从解析结果中提取）
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
 * 如果标题包含"第x章"前缀，则去除前缀只保留后面的具体内容
 * @param {string} title - 原始标题
 * @returns {string} 清理后的标题（只保留具体内容）
 */
export function cleanDuplicateChapterPrefix(title) {
  if (!title || typeof title !== "string") {
    return title || "";
  }

  // 匹配"第x章"的模式（支持中文数字和阿拉伯数字）
  // 例如：第1章、第一章、第10章、第十章等
  const chapterPrefixPattern = /^第[一二三四五六七八九十百千万\d]+章\s*/;

  // 检查标题是否以"第x章"开头
  const match = title.match(chapterPrefixPattern);
  
  if (match) {
    const restTitle = title.substring(match[0].length).trim();
    
    // 如果剩余部分不为空，返回剩余部分；如果为空，返回"未命名章节"
    return restTitle || "未命名章节";
  }

  // 如果标题不以"第x章"开头，查找第一个"第x章"的位置
  // 处理类似"第一章 测试章节"或"测试 第一章 内容"的情况
  const firstMatch = title.match(/第[一二三四五六七八九十百千万\d]+章/);

  if (firstMatch) {
    const matchIndex = firstMatch.index;
    const matchLength = firstMatch[0].length;
    
    // 获取"第x章"后面的内容
    const afterMatch = title.substring(matchIndex + matchLength).trim();
    
    // 如果后面有内容，返回后面的内容；如果没有，返回"未命名章节"
    return afterMatch || "未命名章节";
  }

  // 如果没有找到任何"第x章"模式，返回原标题
  return title.trim();
}

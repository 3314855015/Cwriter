<template>
  <view class="page-container" :class="{ 'light-theme': !isDarkMode }">
    <!-- 头部占位栏 - 防止内容与手机状态栏重叠 -->
    <HeaderPlaceholder />

    <!-- 页面标题 -->
    <view class="page-header">
      <view class="header-content">
        <view class="header-text">
          <text class="page-title">导入作品</text>
          <text class="page-subtitle">从DOCX文件导入您的作品</text>
        </view>
      </view>
    </view>

    <!-- 导入内容 -->
    <view class="import-content">
      <!-- 文件选择区域 -->
      <view class="section-card">
        <view class="section-title">选择文件</view>
        <view class="file-selector">
          <view class="file-display" @tap="selectFile">
            <text class="file-text">{{
              selectedFileName || "点击选择DOCX文件"
            }}</text>
            <text class="file-icon">📄</text>
          </view>
        </view>
      </view>

      <!-- 导入模式选择 -->
      <view class="section-card">
        <view class="section-title">导入模式</view>
        <view class="mode-selector">
          <view
            class="mode-option"
            :class="{ selected: importMode === 'default' }"
            @tap="() => selectMode('default')"
          >
            <text class="mode-label">默认导入</text>
            <text class="mode-desc">使用固定样式识别</text>
          </view>
          <view
            class="mode-option"
            :class="{ selected: importMode === 'advanced' }"
            @tap="() => selectMode('advanced')"
          >
            <text class="mode-label">高级导入</text>
            <text class="mode-desc">自定义样式识别</text>
          </view>
        </view>
      </view>

      <!-- 高级导入样式配置 -->
      <view class="section-card" v-if="importMode === 'advanced'">
        <view class="section-title">样式配置</view>
        <view class="style-config">
          <!-- 标题样式 -->
          <view class="style-group">
            <text class="style-label">标题样式</text>
            <view class="style-inputs">
              <input
                class="style-input"
                v-model="styleConfig.title.font"
                placeholder="字体（如：宋体）"
              />
              <input
                class="style-input"
                v-model.number="styleConfig.title.size"
                type="number"
                placeholder="字号（如：22）"
              />
              <view class="checkbox-group">
                <text
                  class="checkbox-label"
                  :class="{ checked: styleConfig.title.bold }"
                  @tap="styleConfig.title.bold = !styleConfig.title.bold"
                >
                  加粗
                </text>
              </view>
            </view>
          </view>

          <!-- 简介标题样式 -->
          <view class="style-group">
            <text class="style-label">简介标题样式</text>
            <view class="style-inputs">
              <input
                class="style-input"
                v-model="styleConfig.descriptionTitle.font"
                placeholder="字体（如：宋体）"
              />
              <input
                class="style-input"
                v-model.number="styleConfig.descriptionTitle.size"
                type="number"
                placeholder="字号（如：16）"
              />
              <view class="checkbox-group">
                <text
                  class="checkbox-label"
                  :class="{ checked: styleConfig.descriptionTitle.bold }"
                  @tap="
                    styleConfig.descriptionTitle.bold =
                      !styleConfig.descriptionTitle.bold
                  "
                >
                  加粗
                </text>
              </view>
            </view>
          </view>

          <!-- 简介内容样式 -->
          <view class="style-group">
            <text class="style-label">简介内容样式</text>
            <view class="style-inputs">
              <input
                class="style-input"
                v-model="styleConfig.descriptionContent.font"
                placeholder="字体（如：宋体）"
              />
              <input
                class="style-input"
                v-model.number="styleConfig.descriptionContent.size"
                type="number"
                placeholder="字号（如：14）"
              />
            </view>
          </view>

          <!-- 章节标题样式 -->
          <view class="style-group">
            <text class="style-label">章节标题样式</text>
            <view class="style-inputs">
              <input
                class="style-input"
                v-model="styleConfig.chapterTitle.font"
                placeholder="字体（如：宋体）"
              />
              <input
                class="style-input"
                v-model.number="styleConfig.chapterTitle.size"
                type="number"
                placeholder="字号（如：16）"
              />
              <view class="checkbox-group">
                <text
                  class="checkbox-label"
                  :class="{ checked: styleConfig.chapterTitle.bold }"
                  @tap="
                    styleConfig.chapterTitle.bold =
                      !styleConfig.chapterTitle.bold
                  "
                >
                  加粗
                </text>
              </view>
            </view>
          </view>

          <!-- 章节正文样式 -->
          <view class="style-group">
            <text class="style-label">章节正文样式</text>
            <view class="style-inputs">
              <input
                class="style-input"
                v-model="styleConfig.chapterContent.font"
                placeholder="字体（如：宋体）"
              />
              <input
                class="style-input"
                v-model.number="styleConfig.chapterContent.size"
                type="number"
                placeholder="字号（如：14）"
              />
            </view>
          </view>
        </view>
      </view>

      <!-- 导入预览 -->
      <view class="section-card">
        <view class="section-title">导入预览</view>
        <view class="preview-container">
          <scroll-view class="preview-scroll" scroll-y>
            <view class="preview-content" v-if="previewContent">
              <text class="preview-text">{{ previewContent }}</text>
            </view>
            <view class="preview-loading" v-else-if="isParsing">
              <text class="loading-text">{{ parseStatus }}</text>
            </view>
            <view class="preview-empty" v-else>
              <text class="empty-text">请先选择文件</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-actions">
      <view class="action-btn secondary" @tap="handleBack">
        <text class="btn-text">返回</text>
      </view>
      <view
        class="action-btn primary"
        @tap="handleImport"
        :class="{ disabled: !canImport }"
      >
        <text class="btn-text">{{ isImporting ? "导入中..." : "导入" }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import HeaderPlaceholder from "@/components/HeaderPlaceholder.vue";
import fileStorage from "@/utils/fileSystemStorage.js";
import { OfflineAuthService } from "@/utils/offlineAuth.js";
import themeManager, {
  isDarkMode as getIsDarkMode,
} from "@/utils/themeManager.js";
import {
  parseDOCXFile,
  checkDuplicateImport,
  createWorkFromImport,
  cleanDuplicateChapterPrefix,
} from "@/utils/importHelper.js";
import { nativeImportDOCX } from "@/utils/nativeImport.js";

// 响应式数据
const isDarkMode = ref(getIsDarkMode());
const currentUser = ref(null);
const selectedFileName = ref("");
const selectedFilePath = ref("");
const importMode = ref("default"); // 'default' or 'advanced'
const previewContent = ref("");
const isParsing = ref(false);
const parseStatus = ref("解析中...");
const isImporting = ref(false);

// 高级导入样式配置
const styleConfig = ref({
  title: {
    font: "宋体",
    size: 22,
    bold: true,
  },
  descriptionTitle: {
    font: "宋体",
    size: 16,
    bold: true,
  },
  descriptionContent: {
    font: "宋体",
    size: 14,
    bold: false,
  },
  chapterTitle: {
    font: "宋体",
    size: 16,
    bold: true,
  },
  chapterContent: {
    font: "宋体",
    size: 14,
    bold: false,
  },
});

// 解析结果
const parsedData = ref(null);

// 计算属性
const canImport = computed(() => {
  return selectedFilePath.value && !isImporting.value;
});

// 获取页面参数
onLoad((options) => {
  // 初始化主题
  isDarkMode.value = themeManager.isDarkMode();

  // 监听主题变更
  try {
    if (typeof uni !== "undefined" && uni.$on) {
      uni.$on("theme-changed", (themeData) => {
        isDarkMode.value = themeData.isDark;
      });
    }
  } catch (error) {
    console.warn("主题监听器设置失败:", error);
  }
});

// 页面初始化
onMounted(async () => {
  // 获取当前用户
  try {
    currentUser.value = await OfflineAuthService.getCurrentUser();

    if (!currentUser.value || !currentUser.value.id) {
      currentUser.value = {
        id: "default_user",
        username: "离线用户",
        email: "",
      };
    }
  } catch (error) {
    console.error("加载用户数据失败:", error);
    currentUser.value = {
      id: "default_user",
      username: "离线用户",
      email: "",
    };
  }
});

// 选择文件
const selectFile = () => {
  // #ifdef APP-PLUS
  // 提供两种选择方式：文件管理器选择和手动输入路径
  uni.showActionSheet({
    itemList: ["文件管理器选择", "手动输入路径"],
    success: (res) => {
      if (res.tapIndex === 0) {
        // 文件管理器选择
        selectFileWithPicker();
      } else if (res.tapIndex === 1) {
        // 手动输入路径
        selectFileManually();
      }
    },
  });
  // #endif

  // #ifndef APP-PLUS
  // H5环境，使用input file
  const input = document.createElement("input");
  input.type = "file";
  input.accept =
    ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      selectedFileName.value = file.name;
      // H5环境需要特殊处理，暂时不支持
      uni.showToast({
        title: "H5环境暂不支持DOCX导入",
        icon: "none",
      });
    }
  };
  input.click();
  // #endif
};

// 文件管理器选择
const selectFileWithPicker = () => {
  try {
    // 尝试使用uni.chooseFile API
    uni.chooseFile({
      count: 1,
      type: "file",
      extension: [".docx", ".DOCX"],
      success: (res) => {
        console.log("文件选择成功:", res);
        if (res.tempFiles && res.tempFiles.length > 0) {
          const file = res.tempFiles[0];
          selectedFileName.value = file.name;
          selectedFilePath.value = file.path || file.uri;

          // 尝试解析文件预览
          parseFilePreview();
        }
      },
      fail: (error) => {
        console.error("文件选择失败:", error);
        uni.showToast({
          title: "文件选择失败",
          icon: "none",
        });
        // 降级到手动输入
        setTimeout(() => {
          selectFileManually();
        }, 1500);
      },
    });
  } catch (error) {
    console.error("uni.chooseFile不可用:", error);
    // uni.chooseFile不可用，直接降级到手动输入
    uni.showToast({
      title: "uni.chooseFile不可用，请手动输入文件路径",
      icon: "none",
      duration: 2000,
    });

    // 直接使用手动输入
    setTimeout(() => {
      selectFileManually();
    }, 1500);
  }
};

// 手动输入路径
const selectFileManually = () => {
  uni.showModal({
    title: "选择DOCX文件",
    editable: true,
    placeholderText:
      "请输入文件路径\n建议：/storage/emulated/0/Android/data/com.example.cwriter/files/CwriterExports/example.docx\n或：/storage/emulated/0/Download/example.docx",
    content: selectedFilePath.value || "",
    success: async (res) => {
      if (res.confirm && res.content) {
        const filePath = res.content.trim();

        // 验证文件扩展名
        if (!filePath.toLowerCase().endsWith(".docx")) {
          uni.showToast({
            title: "请选择DOCX文件",
            icon: "none",
          });
          return;
        }

        // 验证文件是否存在（使用plus.io）
        plus.io.resolveLocalFileSystemURL(
          filePath,
          (entry) => {
            // 文件存在
            selectedFilePath.value = filePath;
            selectedFileName.value = entry.name || filePath.split("/").pop();

            // 尝试解析文件预览
            parseFilePreview();
          },
          (error) => {
            // 文件不存在或无法访问
            console.error("文件访问失败:", error);
            uni.showToast({
              title: "文件不存在或无法访问",
              icon: "error",
            });
          }
        );
      }
    },
  });
};

// 解析文件预览
const parseFilePreview = async () => {
  if (!selectedFilePath.value) return;

  isParsing.value = true;
  parseStatus.value = "解析文件中...";

  try {
    const config =
      importMode.value === "advanced"
        ? {
            title: styleConfig.value.title,
            descriptionTitle: styleConfig.value.descriptionTitle,
            descriptionContent: styleConfig.value.descriptionContent,
            chapterTitle: styleConfig.value.chapterTitle,
            chapterContent: styleConfig.value.chapterContent,
          }
        : null;

    const result = await parseDOCXFile(selectedFilePath.value, config);

    if (result && result.success) {
      parsedData.value = result.data;
      generatePreview(result.data);
      parseStatus.value = "解析完成";
    } else {
      parseStatus.value = "解析失败";
      uni.showToast({
        title: result?.error || "解析失败",
        icon: "error",
      });
    }
  } catch (error) {
    parseStatus.value = "解析失败";
    console.error("解析文件失败:", error);
    uni.showToast({
      title: "解析失败: " + error.message,
      icon: "error",
    });
  } finally {
    isParsing.value = false;
  }
};

// 选择模式
const selectMode = (mode) => {
  importMode.value = mode;
  // 如果已选择文件，重新解析
  if (selectedFilePath.value) {
    parseFilePreview();
  } else {
    // 重置预览
    previewContent.value = "";
    parsedData.value = null;
  }
};

// 导入
const handleImport = async () => {
  if (!canImport.value) {
    uni.showToast({
      title: "请先选择文件",
      icon: "none",
    });
    return;
  }

  if (!currentUser.value || !currentUser.value.id) {
    uni.showToast({
      title: "用户信息无效",
      icon: "error",
    });
    return;
  }

  try {
    // 检查重复导入
    const isDuplicate = await checkDuplicateImport(
      currentUser.value.id,
      selectedFileName.value
    );

    if (isDuplicate) {
      uni.showModal({
        title: "重复导入",
        content:
          "检测到已导入过同名文件，重复导入会以DOCX文件为基础，已有的数据将被覆盖性保存，是否继续？",
        success: async (res) => {
          if (res.confirm) {
            await doImport();
          }
        },
      });
    } else {
      await doImport();
    }
  } catch (error) {
    console.error("导入失败:", error);
    uni.showToast({
      title: "导入失败: " + error.message,
      icon: "error",
      duration: 3000,
    });
  }
};

// 执行导入
const doImport = async () => {
  isImporting.value = true;
  isParsing.value = true;
  parseStatus.value = "解析文件中...";

  try {
    // 解析文件
    const config =
      importMode.value === "advanced"
        ? {
            title: styleConfig.value.title,
            descriptionTitle: styleConfig.value.descriptionTitle,
            descriptionContent: styleConfig.value.descriptionContent,
            chapterTitle: styleConfig.value.chapterTitle,
            chapterContent: styleConfig.value.chapterContent,
          }
        : null; // 默认模式使用null，让原生插件使用默认配置

    parseStatus.value = "解析DOCX文件...";
    const result = await parseDOCXFile(selectedFilePath.value, config);

    if (!result || !result.success) {
      throw new Error(result?.error || "解析文件失败");
    }

    parsedData.value = result.data;
    parseStatus.value = "解析完成";

    // 生成预览
    generatePreview(result.data);

    // 创建作品和章节
    parseStatus.value = "创建作品中...";
    const work = await createWorkFromImport(
      currentUser.value.id,
      result.data,
      selectedFileName.value
    );

    parseStatus.value = "创建章节中...";
    let chapterIndex = 0;
    for (const chapter of result.data.chapters) {
      chapterIndex++;
      parseStatus.value = `创建章节中... (${chapterIndex}/${result.data.chapters.length})`;

      // 检查章节长度
      const contentLength = (chapter.content || "").replace(/\s/g, "").length;
      if (contentLength > 20000) {
        // 章节过长，中止导入
        uni.showModal({
          title: "导入中止",
          content: `第${chapterIndex}章内容过长（超过2万字），导入已中止。已创建的作品和前面的章节已保存。`,
          showCancel: false,
        });
        break;
      }

      // 清理章节标题中重复的"第x章"前缀
      let cleanedTitle = chapter.title || `第${chapterIndex}章`;
      cleanedTitle = cleanDuplicateChapterPrefix(cleanedTitle);

      // 创建章节
      await fileStorage.createChapter(currentUser.value.id, work.id, {
        title: cleanedTitle,
        content: chapter.content || "",
      });
    }

    isParsing.value = false;
    isImporting.value = false;

    uni.showToast({
      title: "导入成功",
      icon: "success",
      duration: 2000,
    });

    // 延迟返回，让用户看到成功提示
    setTimeout(() => {
      uni.navigateBack();
    }, 2000);
  } catch (error) {
    console.error("导入失败:", error);
    isParsing.value = false;
    isImporting.value = false;

    uni.showToast({
      title: "导入失败: " + error.message,
      icon: "error",
      duration: 3000,
    });
  }
};

// 生成预览
const generatePreview = (data) => {
  let preview = "";
  preview += `作品名称：${data.title || "未命名作品"}\n\n`;
  if (data.description) {
    preview += `简介：${data.description}\n\n`;
  }
  preview += `章节数量：${data.chapters?.length || 0}\n\n`;
  if (data.chapters && data.chapters.length > 0) {
    preview += "章节列表：\n";
    data.chapters.forEach((chapter, index) => {
      preview += `${index + 1}. ${chapter.title || "未命名章节"}\n`;
      const contentLength = (chapter.content || "").replace(/\s/g, "").length;
      preview += `   字数：${contentLength}字\n`;
    });
  }
  previewContent.value = preview;
};

// 返回
const handleBack = () => {
  uni.navigateBack();
};
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  color: #ffffff;
  padding-bottom: 200rpx;
}

.page-container.light-theme {
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  color: #333333;
}

/* 页面标题 */
.page-header {
  padding: 40rpx 30rpx 30rpx;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-text {
  flex: 1;
}

.page-title {
  font-size: 48rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 10rpx;
}

.page-subtitle {
  font-size: 28rpx;
  opacity: 0.7;
}

/* 导入内容 */
.import-content {
  padding: 0 30rpx;
}

.section-card {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10rpx);
}

.light-theme .section-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
  display: block;
  color: #ff6b35;
}

.light-theme .section-title {
  color: #ff6b35;
}

/* 文件选择器 */
.file-selector {
  margin-top: 10rpx;
}

.file-display {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
  padding: 25rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
}

.light-theme .file-display {
  background: rgba(0, 0, 0, 0.02);
}

.file-display:active {
  background: rgba(255, 255, 255, 0.1);
}

.file-text {
  flex: 1;
  font-size: 28rpx;
  opacity: 0.8;
}

.file-icon {
  font-size: 32rpx;
  margin-left: 15rpx;
}

/* 模式选择器 */
.mode-selector {
  display: flex;
  flex-direction: column;
  gap: 15rpx;
  margin-top: 10rpx;
}

.mode-option {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
  padding: 25rpx;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.light-theme .mode-option {
  background: rgba(0, 0, 0, 0.02);
}

.mode-option.selected {
  border-color: #ff6b35;
  background: rgba(255, 107, 53, 0.1);
}

.mode-label {
  font-size: 30rpx;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.mode-desc {
  font-size: 24rpx;
  opacity: 0.7;
  display: block;
}

/* 样式配置 */
.style-config {
  margin-top: 10rpx;
}

.style-group {
  margin-bottom: 30rpx;
}

.style-label {
  font-size: 28rpx;
  font-weight: 500;
  display: block;
  margin-bottom: 15rpx;
  color: #ff6b35;
}

.style-inputs {
  display: flex;
  flex-direction: column;
  gap: 15rpx;
}

.style-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 26rpx;
  color: #ffffff;
}

.light-theme .style-input {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #333333;
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  padding: 15rpx 25rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12rpx;
  font-size: 26rpx;
  transition: all 0.3s ease;
}

.checkbox-label.checked {
  background: rgba(255, 107, 53, 0.2);
  border-color: #ff6b35;
  color: #ff6b35;
}

/* 预览容器 */
.preview-container {
  margin-top: 10rpx;
}

.preview-scroll {
  max-height: 400rpx;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16rpx;
  padding: 20rpx;
}

.light-theme .preview-scroll {
  background: rgba(0, 0, 0, 0.05);
}

.preview-content {
  min-height: 100rpx;
}

.preview-text {
  font-size: 26rpx;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-all;
  display: block;
  opacity: 0.9;
}

.preview-loading {
  text-align: center;
  padding: 40rpx;
}

.loading-text {
  font-size: 28rpx;
  opacity: 0.7;
}

.preview-empty {
  text-align: center;
  padding: 40rpx;
}

.empty-text {
  font-size: 28rpx;
  opacity: 0.5;
}

/* 底部操作栏 */
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(20rpx);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  gap: 20rpx;
  z-index: 1000;
}

.light-theme .bottom-actions {
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.action-btn {
  flex: 1;
  border-radius: 16rpx;
  padding: 25rpx;
  text-align: center;
  transition: all 0.3s ease;
}

.action-btn.primary {
  background: #ff6b35;
  box-shadow: 0 8rpx 24rpx rgba(255, 107, 53, 0.3);
}

.action-btn.primary:active {
  transform: scale(0.95);
  box-shadow: 0 4rpx 12rpx rgba(255, 107, 53, 0.4);
}

.action-btn.primary.disabled {
  background: rgba(255, 107, 53, 0.3);
  opacity: 0.5;
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.light-theme .action-btn.secondary {
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.action-btn.secondary:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.2);
}

.btn-text {
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  display: block;
}

.light-theme .action-btn.secondary .btn-text {
  color: #333333;
}
</style>

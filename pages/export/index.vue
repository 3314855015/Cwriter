<template>
  <view class="page-container" :class="{ 'light-theme': !isDarkMode }">
    <!-- 头部占位栏 - 防止内容与手机状态栏重叠 -->
    <HeaderPlaceholder />

    <!-- 页面标题 -->
    <view class="page-header">
      <view class="header-content">
        <view class="header-text">
          <text class="page-title">导出作品</text>
          <text class="page-subtitle">选择格式和路径导出您的作品</text>
        </view>
      </view>
    </view>

    <!-- 导出内容 -->
    <view class="export-content">
      <!-- 作品选择区域 -->
      <view class="section-card">
        <view class="section-title">要导出的作品</view>
        <view class="work-selector">
          <view
            v-for="work in availableWorks"
            :key="work.id"
            class="work-option"
            :class="{ selected: selectedWorkId === work.id }"
            @tap="selectWork(work.id)"
          >
            <view class="work-option-content">
              <text class="work-option-title">{{ work.title }}</text>
              <text class="work-option-meta"
                >{{ work.chapterCount }} 章节 · {{ work.wordCount }} 字</text
              >
            </view>
            <view class="work-option-check" v-if="selectedWorkId === work.id">
              <text class="check-icon">✓</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 导出格式选择 -->
      <view class="section-card">
        <view class="section-title">导出格式</view>
        <view class="format-selector">
          <view
            class="format-option"
            :class="{ selected: exportFormat === 'pdf' }"
            @tap="() => selectFormat('pdf')"
          >
            <text class="format-label">PDF</text>
          </view>
          <view
            class="format-option"
            :class="{ selected: exportFormat === 'docx' }"
            @tap="() => selectFormat('docx')"
          >
            <text class="format-label">DOCX</text>
          </view>
        </view>
      </view>

      <!-- 导出路径选择 -->
      <view class="section-card">
        <view class="section-title">导出路径</view>
        <view class="path-selector">
          <view class="path-display" @tap="selectPath">
            <text class="path-text">{{
              exportPath || "点击选择保存路径"
            }}</text>
            <text class="path-icon">📁</text>
          </view>
        </view>
      </view>

      <!-- 导出预览 -->
      <view class="section-card">
        <view class="section-title">导出预览</view>
        <view class="preview-container">
          <scroll-view class="preview-scroll" scroll-y>
            <view class="preview-content" v-if="previewContent">
              <text class="preview-text">{{ previewContent }}</text>
            </view>
            <view class="preview-loading" v-else>
              <text class="loading-text">加载预览中...</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-actions">
      <view
        class="action-btn secondary"
        @tap="handleDelete"
        v-if="exportedFilePath"
      >
        <text class="btn-text">删除</text>
      </view>
      <view class="action-btn secondary" @tap="handleBack">
        <text class="btn-text">返回</text>
      </view>
      <view
        class="action-btn primary"
        @tap="handleExport"
        :class="{ disabled: !canExport }"
      >
        <text class="btn-text">导出</text>
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
  getFullWorkData,
  getExportPreview,
  exportAsPDF,
  exportAsDOCX,
  getDefaultExportPath,
  deleteExportFile,
} from "@/utils/exportHelper.js";
import {
  ensureStoragePermission,
  showSaveLocationInfo,
  openFileManager,
} from "@/utils/filePermissionHelper.js";

// 响应式数据
const isDarkMode = ref(getIsDarkMode());
const currentUser = ref(null);
const availableWorks = ref([]);
const selectedWorkId = ref(null);
const exportFormat = ref("pdf");
const exportPath = ref("");
const previewContent = ref("");
const exportedFilePath = ref("");
const initialWorkIds = ref([]);

// 计算属性
const canExport = computed(() => {
  return selectedWorkId.value && exportFormat.value && exportPath.value;
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

  if (options && options.workIds) {
    initialWorkIds.value = options.workIds.split(",");
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

    await loadWorks();

    // 如果有传递的作品ID，自动选中第一个
    if (initialWorkIds.value.length > 0) {
      const workId = initialWorkIds.value[0];
      // 等待作品列表加载完成后再选择
      setTimeout(() => {
        const foundWork = availableWorks.value.find((w) => w.id === workId);
        if (foundWork) {
          selectWork(workId);
        } else if (availableWorks.value.length > 0) {
          // 如果找不到指定的作品，选择第一个
          selectWork(availableWorks.value[0].id);
        }
      }, 200);
    } else if (availableWorks.value.length > 0) {
      // 没有指定作品ID，选择第一个
      selectWork(availableWorks.value[0].id);
    }
  } catch (error) {
    console.error("加载用户数据失败:", error);
    currentUser.value = {
      id: "default_user",
      username: "离线用户",
      email: "",
    };
    await loadWorks();
    if (availableWorks.value.length > 0) {
      selectWork(availableWorks.value[0].id);
    }
  }
});

// 加载作品列表
const loadWorks = async () => {
  try {
    if (!currentUser.value || !currentUser.value.id) {
      availableWorks.value = [];
      return;
    }

    const userWorks = await fileStorage.getUserWorks(currentUser.value.id);

    const worksPromises = userWorks.map(async (work) => {
      let wordCount = 0;
      try {
        const manuscriptPath = `${work.local_file_path}/settings/manuscript.json`;
        const manuscript = await fileStorage.readFile(manuscriptPath);
        if (manuscript && manuscript.word_count) {
          wordCount = manuscript.word_count;
        } else if (manuscript && manuscript.content) {
          wordCount = manuscript.content.replace(/\s/g, "").length;
        } else {
          wordCount =
            (work.title?.length || 0) + (work.description?.length || 0);
        }
      } catch (error) {
        wordCount = (work.title?.length || 0) + (work.description?.length || 0);
      }

      return {
        id: work.id,
        title: work.title || "未命名作品",
        chapterCount: work.chapter_count || 0,
        wordCount: wordCount,
        local_file_path: work.local_file_path,
      };
    });

    availableWorks.value = await Promise.all(worksPromises);

    // 默认选择第一个作品
    if (availableWorks.value.length > 0 && !selectedWorkId.value) {
      selectWork(availableWorks.value[0].id);
    }
  } catch (error) {
    console.error("加载作品列表失败:", error);
    availableWorks.value = [];
  }
};

// 选择作品
const selectWork = async (workId) => {
  selectedWorkId.value = workId;
  exportedFilePath.value = "";

  // 更新导出路径
  const selectedWork = availableWorks.value.find((w) => w.id === workId);
  if (selectedWork) {
    const defaultPath = getDefaultExportPath(
      selectedWork.title,
      exportFormat.value
    );
    exportPath.value = defaultPath;
  }

  // 加载预览
  await loadPreview();
};

// 选择格式
const selectFormat = async (format) => {
  exportFormat.value = format;
  exportedFilePath.value = "";

  // 更新导出路径
  if (selectedWorkId.value) {
    const selectedWork = availableWorks.value.find(
      (w) => w.id === selectedWorkId.value
    );
    if (selectedWork) {
      const defaultPath = getDefaultExportPath(selectedWork.title, format);
      exportPath.value = defaultPath;
    }
  }

  // 重新加载预览
  await loadPreview();
};

// 选择路径
const selectPath = async () => {
  // #ifdef APP-PLUS
  // 在App环境中，使用应用私有目录（不需要权限）
  // 让用户选择是否使用默认路径或自定义路径
  uni.showActionSheet({
    itemList: ["使用默认路径（推荐）", "自定义路径"],
    success: async (res) => {
      if (res.tapIndex === 0) {
        // 使用默认路径
        if (selectedWorkId.value) {
          const selectedWork = availableWorks.value.find(
            (w) => w.id === selectedWorkId.value
          );
          if (selectedWork) {
            const defaultPath = getDefaultExportPath(
              selectedWork.title,
              exportFormat.value
            );
            exportPath.value = defaultPath;
            uni.showToast({
              title: "已使用默认路径",
              icon: "success",
              duration: 1500,
            });
          }
        }
      } else {
        // 自定义路径
        uni.showModal({
          title: "自定义导出路径",
          editable: true,
          placeholderText: "请输入文件路径（相对于应用下载目录）",
          content: exportPath.value.replace("_downloads/", ""),
          success: (modalRes) => {
            if (modalRes.confirm && modalRes.content) {
              const customPath = modalRes.content.trim();
              // 确保路径以_downloads/开头
              exportPath.value = customPath.startsWith("_downloads/")
                ? customPath
                : `_downloads/${customPath}`;
            }
          },
        });
      }
    },
  });
  // #endif

  // #ifndef APP-PLUS
  // H5环境，直接输入文件名
  uni.showModal({
    title: "选择导出路径",
    editable: true,
    placeholderText: "请输入文件名",
    content: exportPath.value,
    success: (res) => {
      if (res.confirm && res.content) {
        exportPath.value = res.content.trim();
      }
    },
  });
  // #endif
};

// 加载预览
const loadPreview = async () => {
  if (!selectedWorkId.value || !currentUser.value) {
    previewContent.value = "";
    return;
  }

  try {
    previewContent.value = "加载预览中...";
    const preview = await getExportPreview(
      currentUser.value.id,
      selectedWorkId.value,
      exportFormat.value === "pdf" ? "html" : "text"
    );

    // 限制预览长度
    if (preview.length > 2000) {
      previewContent.value =
        preview.substring(0, 2000) +
        "\n\n...（预览已截断，完整内容请查看导出文件）";
    } else {
      previewContent.value = preview;
    }
  } catch (error) {
    console.error("加载预览失败:", error);
    previewContent.value = "预览加载失败，请重试";
  }
};

// 导出
const handleExport = async () => {
  if (!canExport.value) {
    uni.showToast({
      title: "请完成所有必填项",
      icon: "none",
    });
    return;
  }

  try {
    console.log("🚀 === 开始导出调试 ===");
    console.log("📋 导出格式:", exportFormat.value);
    console.log("📋 用户ID:", currentUser.value.id);
    console.log("📋 作品ID:", selectedWorkId.value);
    console.log("📋 导出路径:", exportPath.value);
    console.log("📋 是否可用:", canExport.value);

    // 检查并确保权限（如果需要）
    await ensureStoragePermission();

    uni.showLoading({
      title: "导出中...",
    });

    let filePath = "";

    if (exportFormat.value === "pdf") {
      console.log("🔍 开始PDF导出...");
      filePath = await exportAsPDF(
        currentUser.value.id,
        selectedWorkId.value,
        exportPath.value
      );
      console.log("✅ PDF导出完成:", filePath);
    } else if (exportFormat.value === "docx") {
      console.log("🔍 开始DOCX导出...");
      filePath = await exportAsDOCX(
        currentUser.value.id,
        selectedWorkId.value,
        exportPath.value
      );
      console.log("✅ DOCX导出完成:", filePath);
    }

    exportedFilePath.value = filePath;

    uni.hideLoading();

    // 显示文件保存位置信息
    showSaveLocationInfo(filePath);

    // 询问用户是否打开文件管理器
    uni.showModal({
      title: "导出成功",
      content: `文件已保存到应用下载目录\n\n是否打开文件位置？`,
      confirmText: "打开",
      cancelText: "知道了",
      success: (res) => {
        if (res.confirm) {
          openFileManager(filePath);
        }
      },
    });
  } catch (error) {
    console.error("❌ 导出失败详情:");
    console.error("  错误类型:", error.name);
    console.error("  错误消息:", error.message);
    console.error("  错误堆栈:", error.stack);

    uni.hideLoading();
    uni.showToast({
      title: "导出失败: " + error.message,
      icon: "error",
      duration: 3000,
    });
  }
};

// 删除导出文件
const handleDelete = async () => {
  if (!exportedFilePath.value) {
    uni.showToast({
      title: "没有可删除的文件",
      icon: "none",
    });
    return;
  }

  try {
    uni.showModal({
      title: "确认删除",
      content: "确定要删除导出的文件吗？",
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteExportFile(exportedFilePath.value);
            exportedFilePath.value = "";
            uni.showToast({
              title: "删除成功",
              icon: "success",
            });
          } catch (error) {
            console.error("删除文件失败:", error);
            uni.showToast({
              title: "删除失败",
              icon: "error",
            });
          }
        }
      },
    });
  } catch (error) {
    console.error("删除操作失败:", error);
  }
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

/* 导出内容 */
.export-content {
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

/* 作品选择器 */
.work-selector {
  display: flex;
  flex-direction: column;
  gap: 15rpx;
}

.work-option {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
  padding: 25rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.light-theme .work-option {
  background: rgba(0, 0, 0, 0.02);
}

.work-option.selected {
  border-color: #ff6b35;
  background: rgba(255, 107, 53, 0.1);
}

.work-option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.work-option-title {
  font-size: 30rpx;
  font-weight: 600;
  display: block;
}

.work-option-meta {
  font-size: 24rpx;
  opacity: 0.7;
  display: block;
}

.work-option-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #ff6b35;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon {
  color: #ffffff;
  font-size: 24rpx;
  font-weight: bold;
}

/* 格式选择器 */
.format-selector {
  display: flex;
  gap: 20rpx;
}

.format-option {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
  padding: 30rpx;
  text-align: center;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.light-theme .format-option {
  background: rgba(0, 0, 0, 0.02);
}

.format-option.selected {
  border-color: #ff6b35;
  background: rgba(255, 107, 53, 0.1);
}

.format-label {
  font-size: 32rpx;
  font-weight: 600;
  display: block;
}

/* 路径选择器 */
.path-selector {
  margin-top: 10rpx;
}

.path-display {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
  padding: 25rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
}

.light-theme .path-display {
  background: rgba(0, 0, 0, 0.02);
}

.path-display:active {
  background: rgba(255, 255, 255, 0.1);
}

.path-text {
  flex: 1;
  font-size: 28rpx;
  opacity: 0.8;
}

.path-icon {
  font-size: 32rpx;
  margin-left: 15rpx;
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

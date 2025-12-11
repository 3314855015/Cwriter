<template>
  <view class="page-container" :class="{ 'light-theme': !isDarkMode }">
    <!-- 头部占位栏 - 防止内容与手机状态栏重叠 -->
    <HeaderPlaceholder />

    <!-- 页面头部 -->
    <view class="page-header">
      <view class="header-left" @tap="goBack">
        <text class="back-text">X</text>
      </view>
      <view class="header-center">
        <text class="page-title">{{ workInfo.title }}</text>
      </view>
      <view class="header-right">
        <view class="action-btn" @tap="addChapter">
          <text class="add-text">+</text>
        </view>
      </view>
    </view>

    <!-- 章节列表 -->
    <view class="chapters-container">
      <view class="section-header">
        <text class="section-title">章节列表</text>
        <text class="chapter-count">共 {{ chapters.length }} 章</text>
      </view>

      <view class="chapters-list">
        <view
          v-for="(chapter, index) in chapters"
          :key="chapter.id"
          class="chapter-item"
          @tap="openChapter(chapter)"
        >
          <view class="chapter-content">
            <view class="chapter-main">
              <text class="chapter-title"
                >第{{ index + 1 }}章 {{ chapter.title }}</text
              >
              <text class="chapter-time">{{
                formatTime(chapter.updated_at)
              }}</text>
            </view>
            <view class="chapter-info">
              <text class="chapter-words">{{ chapter.word_count || 0 }}字</text>
              <view
                class="chapter-status"
                :class="{ completed: chapter.is_completed }"
              >
                <text class="status-text">{{
                  chapter.is_completed ? "已完成" : "写作中"
                }}</text>
              </view>
            </view>
          </view>

          <!-- 删除按钮 -->
          <view class="chapter-actions" v-if="isEditMode">
            <view class="chapter-action-btn" @tap.stop="deleteChapter(chapter)">
              <image src="/static/icons/trash.svg" mode="aspectFit"></image>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-if="chapters.length === 0">
        <image
          class="empty-icon"
          src="/static/icons/file.svg"
          mode="aspectFit"
        ></image>
        <text class="empty-text">还没有章节</text>
        <view class="empty-btn" @tap="showCreateModal">
          <text class="btn-text">创建第一章</text>
        </view>
      </view>
    </view>

    <!-- 创建章节模态框 -->
    <view
      v-if="showCreateChapterModal"
      class="modal-overlay"
      @tap="hideCreateModal"
    >
      <view class="modal-container" @tap.stop>
        <!-- 关闭按钮 -->
        <view class="modal-close" @tap="hideCreateModal">
          <text class="close-text">×</text>
        </view>

        <!-- 标题 -->
        <view class="modal-header">
          <text class="modal-title">创建新章节</text>
        </view>

        <!-- 输入区域 -->
        <view class="modal-content">
          <view class="input-group">
            <text class="input-label">章节标题</text>
            <input
              v-model="newChapterTitle"
              class="modal-input"
              placeholder="请输入章节标题"
              placeholder-class="input-placeholder"
              :maxlength="50"
              @input="onTitleInput"
            />
            <text class="input-counter">{{ newChapterTitle.length }}/50</text>
          </view>
        </view>

        <!-- 按钮区域 -->
        <view class="modal-actions">
          <button class="action-btn cancel-btn" @tap="hideCreateModal">
            <text class="btn-text">取消</text>
          </button>
          <button
            class="action-btn create-btn"
            :class="{ disabled: !newChapterTitle.trim() }"
            :disabled="!newChapterTitle.trim()"
            @tap="handleCreateChapter"
          >
            <text class="btn-text">创建</text>
          </button>
        </view>
      </view>
    </view>

    <!-- 底部导航栏 -->
    <BottomNav
      :active-nav="'manage'"
      :is-dark-mode="isDarkMode"
      @switch-nav="handleNavSwitch"
      @toggle-theme="toggleTheme"
    />
  </view>
</template>

<script setup>
import { ref } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import HeaderPlaceholder from "@/components/HeaderPlaceholder.vue";
import BottomNav from "@/components/BottomNav.vue";
import FileSystemStorage from "@/utils/fileSystemStorage.js";
import themeManager, {
  isDarkMode as getIsDarkMode,
} from "@/utils/themeManager.js";

const fileStorage = FileSystemStorage;

// 响应式数据

const isDarkMode = ref(getIsDarkMode());
const isEditMode = ref(false);
const workInfo = ref({ title: "加载中..." });
const chapters = ref([]);
const workId = ref("");
const userId = ref("");
const showCreateChapterModal = ref(false);
const newChapterTitle = ref("");

onLoad((options) => {
  // 初始化主题
  isDarkMode.value = themeManager.isDarkMode();

  // 监听主题变更事件
  try {
    if (typeof uni !== "undefined" && uni.$on) {
      uni.$on("theme-changed", (themeData) => {
        try {
          isDarkMode.value = themeData.isDark;
        } catch (error) {
          console.warn("主题变更处理失败:", error);
        }
      });
    }
  } catch (error) {
    console.warn("主题监听器设置失败:", error);
  }

  if (!options || !options.workId) {
    console.error("❌ 章节页面缺少必要参数 workId");
    uni.showToast({
      title: "参数错误",
      icon: "error",
    });
    setTimeout(() => uni.navigateBack(), 10);
    return;
  }

  workId.value = options.workId;
  userId.value = options.userId || "default_user";

  loadWorkChapters();
});

const loadWorkChapters = async () => {
  try {
    // 读取作品配置
    const workPath = fileStorage.getWorkPath(userId.value, workId.value);
    const workConfigPath = `${workPath}/work.config.json`;
    const workConfig = await fileStorage.readFile(workConfigPath);

    if (workConfig) {
      workInfo.value = workConfig;
    }

    // 读取章节列表
    const chaptersPath = `${workPath}/chapters/chapters.json`;
    const chaptersData = (await fileStorage.readFile(chaptersPath)) || [];

    // 确保是数组
    if (!Array.isArray(chaptersData)) {
      console.warn("⚠️ 章节数据不是数组，重置为空数组");
      chapters.value = [];
    } else {
      // 按创建时间排序
      chapters.value = chaptersData.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
    }
  } catch (error) {
    console.error("❌ 加载章节失败:", error);
    uni.showToast({
      title: "加载章节失败",
      icon: "error",
    });
  }
};

const addChapter = () => {
  showCreateModal();
};

const createChapter = async (title) => {
  try {
    const chapterId = Date.now().toString();
    const newChapter = {
      id: chapterId,
      title: title,
      content: "",
      word_count: 0,
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 添加到章节列表（content为空，加快读取速度）
    chapters.value.push(newChapter);

    // 保存章节列表（content为空）
    await saveChaptersList();

    // 创建章节文件（包含完整内容）
    const workPath = fileStorage.getWorkPath(userId.value, workId.value);
    const chapterPath = `${workPath}/chapters/${chapterId}.json`;

    await fileStorage.writeFile(chapterPath, newChapter);

    // 跳转到章节编辑页面（暂时未实现）
    uni.showToast({
      title: "章节创建成功",
      icon: "success",
    });
  } catch (error) {
    console.error("❌ 创建章节失败:", error);
    uni.showToast({
      title: "创建章节失败",
      icon: "error",
    });
  }
};

const deleteChapter = (chapter) => {
  uni.showModal({
    title: "确认删除",
    content: `确定要删除"${chapter.title}"吗？此操作不可撤销。`,
    success: (res) => {
      if (res.confirm) {
        removeChapter(chapter);
      }
    },
  });
};

const removeChapter = async (chapter) => {
  try {
    // 从列表中移除
    const index = chapters.value.findIndex((c) => c.id === chapter.id);
    if (index > -1) {
      chapters.value.splice(index, 1);
    }

    // 删除章节文件
    const workPath = fileStorage.getWorkPath(userId.value, workId.value);
    const chapterPath = `${workPath}/chapters/${chapter.id}.json`;

    await fileStorage.deleteFile(chapterPath);

    // 保存章节列表
    await saveChaptersList();

    uni.showToast({
      title: "删除成功",
      icon: "success",
    });
  } catch (error) {
    console.error("❌ 删除章节失败:", error);
    uni.showToast({
      title: "删除失败",
      icon: "error",
    });
  }
};

const saveChaptersList = async () => {
  try {
    const workPath = fileStorage.getWorkPath(userId.value, workId.value);
    const chaptersPath = `${workPath}/chapters/chapters.json`;

    // 保存章节列表时，content 为空（加快读取速度，内容只保存在单独的章节文件中）
    const chaptersList = chapters.value.map((chapter) => ({
      ...chapter,
      content: "", // chapters.json中content为空
    }));

    await fileStorage.writeFile(chaptersPath, chaptersList);

    // 更新作品信息（章节数量和最后修改时间）
    try {
      await fileStorage.updateWork(userId.value, workId.value, {
        chapter_count: chapters.value.length,
        updated_at: new Date().toISOString(),
      });
    } catch (updateError) {
      console.warn("⚠️ 更新作品信息失败，但章节列表已保存:", updateError);
    }
  } catch (error) {
    console.error("❌ 保存章节列表失败:", error);
  }
};

const openChapter = (chapter) => {
  // 跳转到章节编辑页面
  uni.navigateTo({
    url: `/pages/editor/chapter?workId=${workId.value}&chapterId=${chapter.id}&userId=${userId.value}`,
  });
};

const formatTime = (timestamp) => {
  if (!timestamp) return "未知时间";

  try {
    const now = new Date();
    const time = new Date(timestamp);

    if (isNaN(time.getTime())) {
      return "未知时间";
    }

    const diff = now.getTime() - time.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return time.toLocaleDateString();
  } catch (error) {
    return "未知时间";
  }
};

const goBack = () => {
  uni.navigateBack();
};

// 模态框相关方法
const showCreateModal = () => {
  showCreateChapterModal.value = true;
  newChapterTitle.value = "";
};

const hideCreateModal = () => {
  showCreateChapterModal.value = false;
  newChapterTitle.value = "";
};

const onTitleInput = (e) => {
  newChapterTitle.value = e.detail.value;
};

const handleCreateChapter = () => {
  const title = newChapterTitle.value.trim();
  if (!title) {
    uni.showToast({
      title: "请输入章节标题",
      icon: "none",
    });
    return;
  }

  createChapter(title);
  hideCreateModal();
};

const toggleTheme = () => {
  const newTheme = themeManager.toggleTheme();
  isDarkMode.value = themeManager.isDarkMode();
};

const handleNavSwitch = (navType) => {
  if (navType === "home") {
    uni.switchTab({
      url: "/pages/index/index",
    });
  }
};
</script>

<style scoped>
.page-container {
  background-color: #1a1a1a;
  color: #ffffff;
  min-height: 100vh;
  padding-bottom: 80px;
  box-sizing: border-box;
}

.light-theme {
  background-color: #f5f5f5;
  color: #333333;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(45, 45, 45, 0.9);
  border-bottom: 1px solid #404040;
}

.light-theme .page-header {
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid #e0e0e0;
}

.header-left,
.header-right {
  width: 60px;
}

.back-text {
  font-size: 16px;
  font-weight: 500;
  color: inherit;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  text-align: center;
  flex: 1;
}

.light-theme .page-title {
  color: #333333;
}

.action-btn {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
  transition: all 0.3s ease;
}

.action-btn:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
}

.add-text {
  color: #ffffff;
  font-size: 24px;
  font-weight: 300;
  line-height: 1;
}

.chapters-container {
  flex: 1;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.light-theme .section-title {
  color: #333333;
}

.chapter-count {
  font-size: 14px;
  color: #b3b3b3;
}

.light-theme .chapter-count {
  color: #666666;
}

.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chapter-item {
  background: rgba(45, 45, 45, 0.7);
  border-radius: 8px;
  padding: 12px;
  position: relative;
}

.light-theme .chapter-item {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.chapter-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chapter-main {
  flex: 1;
}

.chapter-title {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  display: block;
}

.light-theme .chapter-title {
  color: #333333;
}

.chapter-time {
  font-size: 11px;
  color: #b3b3b3;
  margin-top: 2px;
  display: block;
}

.light-theme .chapter-time {
  color: #666666;
}

.chapter-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chapter-words {
  font-size: 12px;
  color: #b3b3b3;
}

.light-theme .chapter-words {
  color: #666666;
}

.chapter-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  background: #ff6b35;
  color: white;
}

.chapter-status.completed {
  background: #4ecdc4;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #b3b3b3;
  margin-bottom: 20px;
}

.light-theme .empty-text {
  color: #666666;
}

.empty-btn {
  padding: 12px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
  transition: all 0.3s ease;
}

.empty-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
}

.btn-text {
  font-size: 14px;
  font-weight: 500;
  color: inherit;
}

.chapter-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.chapter-item:hover .chapter-actions {
  opacity: 1;
}

.chapter-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chapter-action-btn image {
  width: 16px;
  height: 16px;
}

/* 创建章节模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  background: #2a2a2a;
  border-radius: 16px;
  margin: 20px;
  width: calc(100% - 40px);
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
}

.light-theme .modal-container {
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.light-theme .modal-close {
  background: rgba(0, 0, 0, 0.05);
}

.modal-close:active {
  transform: scale(0.9);
}

.close-text {
  color: #ffffff;
  font-size: 20px;
  font-weight: 300;
  line-height: 1;
}

.light-theme .close-text {
  color: #333333;
}

.modal-header {
  padding: 24px 20px 16px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  text-align: center;
}

.light-theme .modal-title {
  color: #333333;
}

.modal-content {
  padding: 0 20px 20px;
}

.input-group {
  position: relative;
}

.input-label {
  display: block;
  font-size: 14px;
  color: #b3b3b3;
  margin-bottom: 8px;
}

.light-theme .input-label {
  color: #666666;
}

.modal-input {
  width: 100%;
  padding: 12px 16px;
  background: #1a1a1a;
  border: 1px solid #404040;
  border-radius: 8px;
  color: #ffffff;
  font-size: 16px;
  box-sizing: border-box;
  transition: all 0.3s ease;
}

.light-theme .modal-input {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  color: #333333;
}

.modal-input:focus {
  border-color: #ff6b35;
  outline: none;
}

.input-placeholder {
  color: #666666;
}

.light-theme .input-placeholder {
  color: #999999;
}

.input-counter {
  position: absolute;
  right: 16px;
  bottom: -18px;
  font-size: 12px;
  color: #666666;
}

.light-theme .input-counter {
  color: #999999;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #404040;
}

.light-theme .modal-actions {
  border-top: 1px solid #e0e0e0;
}

.modal-actions .action-btn {
  flex: 1;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.cancel-btn {
  background: #404040;
  color: #ffffff;
}

.light-theme .cancel-btn {
  background: #f5f5f5;
  color: #666666;
}

.cancel-btn:active {
  background: #333333;
}

.light-theme .cancel-btn:active {
  background: #e0e0e0;
}

.create-btn {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
}

.create-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
}

.create-btn.disabled {
  background: #404040;
  color: #666666;
  box-shadow: none;
}

.create-btn.disabled:active {
  transform: none;
}

/* 亮色主题适配 */
.light-theme .modal-overlay {
  background: rgba(0, 0, 0, 0.6);
}

.light-theme .modal-container {
  background: linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%);
  border: 2px solid rgba(255, 107, 53, 0.2);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.light-theme .modal-close {
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.light-theme .modal-close:active {
  background: rgba(255, 107, 53, 0.1);
}

.light-theme .close-text {
  color: #333333;
}

.light-theme .modal-title {
  color: #333333;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.light-theme .input-label {
  color: #ff6b35;
}

.light-theme .modal-input {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  color: #333333;
}

.light-theme .modal-input:focus {
  border-color: #ff6b35;
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.15);
}

.light-theme .input-placeholder {
  color: rgba(0, 0, 0, 0.3);
}

.light-theme .input-counter {
  color: #999999;
}

.light-theme .modal-actions {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.light-theme .cancel-btn {
  background: #f5f5f5;
  color: #666666;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.light-theme .cancel-btn:active {
  background: #e0e0e0;
}

.light-theme .create-btn.disabled {
  background: #f5f5f5;
  color: #999999;
  box-shadow: none;
}
</style>

<template>
  <view class="page-container" :class="{ 'light-theme': !isDarkMode }">
    <!-- 头部占位栏 - 防止内容与手机状态栏重叠 -->
    <HeaderPlaceholder />

    <!-- 顶部工具栏 -->
    <view
      class="top-toolbar"
      :class="{
        show: showTopToolbar,
        pinned: isToolbarPinned && showTopToolbar,
      }"
      :style="{
        position: isToolbarPinned && showTopToolbar ? 'fixed' : 'relative',
        top: isToolbarPinned && showTopToolbar ? statusBarHeight : 'auto',
        left: isToolbarPinned && showTopToolbar ? '0' : 'auto',
        right: isToolbarPinned && showTopToolbar ? '0' : 'auto',
        zIndex: isToolbarPinned && showTopToolbar ? 998 : 'auto',
      }"
    >
      <view class="toolbar-left">
        <view class="toolbar-btn text-btn" @tap="toggleEditMode">
          <text class="btn-text" :class="{ 'save-text': hasChanges }">
            {{ isEditMode ? (hasChanges ? "保存" : "完成") : "编辑" }}
          </text>
        </view>
      </view>

      <view class="toolbar-right">
        <view class="toolbar-btn text-btn" @tap="openServiceMenu">
          <text class="btn-text">服务</text>
        </view>

        <view class="toolbar-btn text-btn" @tap="goBack">
          <text class="btn-text">X</text>
        </view>
      </view>
    </view>

    <!-- 内容区域 -->
    <view
      class="content-wrapper"
      :class="{
        'edit-mode': isEditMode,
        'has-toolbar-pinned': isToolbarPinned && showTopToolbar,
        'keyboard-active': keyboardHeight > 0,
      }"
    >
      <!-- 只读内容区域 -->
      <scroll-view
        v-if="!isEditMode"
        class="content-container"
        :class="{ 'phone-adapt-mode': isPhoneAdaptMode }"
        @tap="toggleToolbars"
        scroll-y="true"
        @scroll="handleContentScroll"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @scrolltoupper="onScrollToUpper"
      >
        <view class="chapter-header">
          <text class="chapter-title">{{ chapterInfo.title }}</text>
          <text class="chapter-meta"
            >{{ workInfo.title }} · {{ wordCount }}字 ·
            {{ formatTime(chapterInfo.updated_at) }}</text
          >
        </view>

        <view class="chapter-content" :style="phoneAdaptStyle">
          <view class="content-text" :style="contentTextStyle">{{
            formattedContent || "暂无内容..."
          }}</view>
        </view>
      </scroll-view>

      <!-- 编辑内容区域 -->
      <scroll-view
        v-else
        class="edit-container"
        @tap.stop
        scroll-y="true"
        @scroll="handleContentScroll"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @scrolltoupper="onScrollToUpper"
        :style="{
          height: computedScrollViewHeight + 'px',
          transition: keyboardHeight > 0 ? 'height 0.1s ease-out' : 'none',
        }"
        :scroll-top="scrollTop"
        :scroll-with-animation="false"
        :enhanced="true"
        :show-scrollbar="false"
        ref="editScrollViewRef"
        :scroll-anchoring="false"
        :bounces="false"
      >
        <view class="edit-title-section">
          <input
            ref="titleRef"
            class="edit-title-input"
            v-model="editTitle"
            placeholder="章节标题"
            maxlength="50"
            @input="onEditInput"
          />
        </view>

        <view class="edit-content-section">
          <textarea
            ref="contentRef"
            class="edit-content-input"
            v-model="editContent"
            placeholder="开始写作这一章..."
            :auto-height="true"
            :maxlength="-1"
            @input="onEditInput"
            @focus="onInputFocus"
            @blur="onInputBlur"
            @click="onInputClick"
            @selectionchange="onSelectionChange"
            @longpress="onContentLongPress"
            cursor-spacing="0"
          />
          <!-- 键盘弹出时的占位空白区域，用于确保内容可以滚动 -->
          <view
            v-if="keyboardHeight > 0"
            class="keyboard-spacer"
            :style="{
              height: keyboardHeight + 'px',
              transition: 'height 0.1s ease-out',
            }"
          ></view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部工具栏 -->
    <view
      class="bottom-toolbar"
      :class="{ show: showBottomToolbar && !isEditMode }"
    >
      <view class="toolbar-content">
        <view class="tool-item text-btn" @tap="openTools">
          <text class="btn-text">工具</text>
        </view>
        <view class="tool-item text-btn" @tap="adaptToPhone">
          <text class="btn-text">{{
            isPhoneAdaptMode ? "退出适应" : "适应手机"
          }}</text>
        </view>
        <view class="tool-item text-btn" @tap="shareChapter">
          <text class="btn-text">分享</text>
        </view>
      </view>
    </view>

    <!-- 写作板按钮 -->
    <view
      v-if="isEditMode && showWritingBoardBtn"
      class="writing-board-btn"
      :style="{
        bottom: computedButtonBottom + 'px',
        right: '20px',
        transition: keyboardHeight > 0 ? 'bottom 0.15s ease-out' : 'none',
        zIndex: 1000,
      }"
      @tap="openWritingBoard"
    >
      <text class="writing-board-icon">+</text>
    </view>

    <!-- 写作板模态框 -->
    <view
      v-if="showWritingBoard"
      class="writing-board-overlay"
      @tap="closeWritingBoard"
    >
      <view class="writing-board-modal" @tap.stop>
        <!-- 顶部切换栏 -->
        <view class="writing-board-header">
          <view
            v-for="tab in writingBoardTabs"
            :key="tab.key"
            class="writing-board-tab"
            :class="{ active: currentWritingTab === tab.key }"
            @tap="switchWritingTab(tab.key)"
          >
            <text class="tab-text">{{ tab.label }}</text>
          </view>
        </view>

        <!-- 内容区域 -->
        <scroll-view class="writing-board-content" scroll-y="true">
          <!-- 人物列表 -->
          <view
            v-if="currentWritingTab === 'character'"
            class="writing-board-list"
          >
            <view
              v-for="character in charactersList"
              :key="character.id"
              class="writing-board-item"
              @tap="insertCharacterName(character)"
            >
              <text class="item-name">{{
                character.name || character.title || "未命名"
              }}</text>
              <text v-if="character.description" class="item-desc">{{
                character.description
              }}</text>
            </view>
            <view
              v-if="charactersList.length === 0"
              class="writing-board-empty"
            >
              <text>暂无人物数据</text>
            </view>
          </view>

          <!-- 设定列表 -->
          <view v-if="currentWritingTab === 'term'" class="writing-board-list">
            <view
              v-for="term in termsList"
              :key="term.id"
              class="writing-board-item"
              @tap="insertTermName(term)"
            >
              <text class="item-name">{{
                term.name || term.title || "未命名"
              }}</text>
              <text v-if="term.description" class="item-desc">{{
                term.description
              }}</text>
            </view>
            <view v-if="termsList.length === 0" class="writing-board-empty">
              <text>暂无设定数据</text>
            </view>
          </view>

          <!-- 场景列表 -->
          <view v-if="currentWritingTab === 'map'" class="writing-board-list">
            <view
              v-for="map in mapsList"
              :key="map.id"
              class="writing-board-item"
              @tap="showMapDetail(map)"
            >
              <text class="item-name">{{ map.name || "未命名场景" }}</text>
              <text v-if="map.description" class="item-desc">{{
                map.description
              }}</text>
            </view>
            <view v-if="mapsList.length === 0" class="writing-board-empty">
              <text>暂无场景数据</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 选区查找选择模态框 -->
    <view
      v-if="showLookupChoiceModal"
      class="lookup-overlay"
      @tap="closeLookupChoice"
    >
      <view class="lookup-modal" @tap.stop>
        <text class="lookup-title"
          >查找 "{{ (selectionText || "").trim() }}"</text
        >
        <view class="lookup-actions">
          <view class="lookup-btn" @tap="handleLookupChoice('character')">
            <text>人物</text>
          </view>
          <view class="lookup-btn" @tap="handleLookupChoice('term')">
            <text>设定</text>
          </view>
        </view>
        <view class="lookup-cancel" @tap="closeLookupChoice">
          <text>取消</text>
        </view>
      </view>
    </view>

    <!-- 选区查找结果模态框 -->
    <LookupDetailModal
      v-if="showLookupResultModal"
      :show="showLookupResultModal"
      :type="lookupTargetType || 'character'"
      :item="lookupResult?.item || {}"
      @close="closeLookupResult"
    />

    <!-- 场景详情模态框 -->
    <view
      v-if="showMapDetailModal"
      class="map-detail-overlay"
      @tap="closeMapDetail"
    >
      <view class="map-detail-modal" @tap.stop>
        <view class="map-detail-header">
          <text class="map-detail-title">{{
            currentMapData?.name || "场景详情"
          }}</text>
          <view class="map-detail-close" @tap="closeMapDetail">
            <text>返回</text>
          </view>
        </view>
        <view class="map-detail-content">
          <view v-if="currentMapData" class="map-info-section">
            <view v-if="currentMapData.description" class="map-description">
              <text class="desc-label">描述：</text>
              <text class="desc-text">{{ currentMapData.description }}</text>
            </view>
            <view class="map-stats">
              <text class="stat-item"
                >节点数：{{ (currentMapData.nodes || []).length }}</text
              >
              <text class="stat-item"
                >连接数：{{ (currentMapData.edges || []).length }}</text
              >
            </view>
          </view>
          <view
            v-if="currentMapData"
            class="map-preview-container"
            :style="{
              transform: `scale(${mapScale})`,
              transformOrigin: 'center center',
            }"
          >
            <!-- 使用canvas绘制地图 -->
            <canvas
              canvas-id="mapPreviewCanvas"
              class="map-preview-canvas"
              :style="{
                width: mapCanvasWidth + 'px',
                height: mapCanvasHeight + 'px',
              }"
            ></canvas>
            <view
              v-if="!currentMapData.nodes || currentMapData.nodes.length === 0"
              class="map-empty-hint"
            >
              <text>暂无节点数据</text>
            </view>
          </view>
          <view class="map-zoom-controls">
            <view class="zoom-btn" @tap="zoomMapOut">
              <text>−</text>
            </view>
            <text class="zoom-text">{{ Math.round(mapScale * 100) }}%</text>
            <view class="zoom-btn" @tap="zoomMapIn">
              <text>+</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, nextTick, watch, computed } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import HeaderPlaceholder from "@/components/HeaderPlaceholder.vue";
import LookupDetailModal from "@/components/LookupDetailModal.vue";
import FileSystemStorage from "@/utils/fileSystemStorage.js";
import themeManager, {
  isDarkMode as getIsDarkMode,
} from "@/utils/themeManager.js";

const fileStorage = FileSystemStorage;

// 响应式数据
const isDarkMode = ref(getIsDarkMode());
const isSaving = ref(false);
const workInfo = ref({ title: "加载中..." });
const chapterInfo = ref({ title: "加载中...", is_completed: false });
const chapterContent = ref("");
const workId = ref("");
const chapterId = ref("");
const userId = ref("");
const lastSaveTime = ref(null);
const wordCount = ref(0);

// 工具栏显示控制
const showTopToolbar = ref(false);
const showBottomToolbar = ref(false);
const isToolbarPinned = ref(false); // 工具栏是否固定在顶部

// 编辑模式控制
const isEditMode = ref(false);
const editTitle = ref("");
const editContent = ref("");
const originalTitle = ref("");
const originalContent = ref("");
const hasChanges = ref(false);

// 编辑器引用
const titleRef = ref(null);
const contentRef = ref(null);
const editScrollViewRef = ref(null);
const editorRef = ref(null);

// 键盘高度控制
const keyboardHeight = ref(0);
const usableHeight = ref(0); // 当前可用高度，随键盘变化

// 滚动控制
const scrollTop = ref(0);

// 触摸事件处理
const onTouchStart = (e) => {
  lastUserScrollTime = Date.now();

  // 只在只读模式和适应手机模式下处理双指缩放
  if (
    !isEditMode.value &&
    isPhoneAdaptMode.value &&
    e.touches &&
    e.touches.length === 2
  ) {
    e.preventDefault(); // 阻止双指事件触发滚动
    // 计算两指距离
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const distance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );
    touchStartDistance.value = distance;
    lastTouchTime.value = Date.now();
  }
};

const onTouchMove = (e) => {
  lastUserScrollTime = Date.now();

  // 在适应手机模式下优先处理触摸事件
  if (!isEditMode.value && isPhoneAdaptMode.value) {
    if (e.touches && e.touches.length === 2) {
      // 双指操作：只处理缩放，完全阻止滚动
      e.preventDefault();
      e.stopPropagation();

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      if (touchStartDistance.value > 0) {
        const scale = currentDistance / touchStartDistance.value;
        const newScale = phoneAdaptScale.value * scale;

        // 限制缩放范围
        if (newScale >= 0.8 && newScale <= 2.0) {
          phoneAdaptScale.value = newScale;
        }
      }

      touchStartDistance.value = currentDistance;
      return; // 双指操作直接返回，不继续处理
    }
  }
};

const onTouchEnd = (e) => {
  lastUserScrollTime = Date.now();

  // 如果键盘弹出且容器不在顶部，尝试强制滚动到顶部
  if (keyboardHeight.value > 0) {
    const query = uni.createSelectorQuery();
    query.select(".edit-container").boundingClientRect();
    query.exec((res) => {
      if (res && res[0] && res[0].top > 10) {
        forceScrollToTop();
      }
    });
  }

  // 重置双指缩放状态
  touchStartDistance.value = 0;
};

// 撤销重做栈
const undoStack = ref([]);
const redoStack = ref([]);

// 编辑器状态控制
const isEditorFocused = ref(false);
const showQuickMenu = ref(false);
const isFullscreen = ref(false);
const isScrolled = ref(false);
const isToolbarHidden = ref(false);

// 适应手机模式相关
const isPhoneAdaptMode = ref(false);
const phoneAdaptScale = ref(1);
const touchStartDistance = ref(0);
const lastTouchTime = ref(0);

// 选区查找相关
const selectionRange = ref({ start: 0, end: 0 });
const selectionText = ref("");
const showLookupChoiceModal = ref(false);
const showLookupResultModal = ref(false);
const lookupTargetType = ref(null); // 'character' | 'term'
const lookupResult = ref(null);
const lookupLoading = ref(false);

// 写作板相关
const showWritingBoard = ref(false);
const showWritingBoardBtn = ref(false); // 控制按钮显示，即使键盘收起也保持显示
const currentWritingTab = ref("character"); // character, term, map
const charactersList = ref([]);
const termsList = ref([]);
const mapsList = ref([]);
const writingBoardTabs = [
  { key: "character", label: "人物" },
  { key: "term", label: "设定" },
  { key: "map", label: "地图" },
];

// 地图详情相关
const showMapDetailModal = ref(false);
const currentMapData = ref(null);
const mapScale = ref(1);
const mapCanvasWidth = ref(600);
const mapCanvasHeight = ref(400);
let mapCanvasContext = null;

// 视口高度
const viewportHeight = ref(0);
const currentFocusPosition = ref(null);
const statusBarHeight = ref(0);

// 计算属性
const formattedContent = computed(() => {
  return formatContentIndent(chapterContent.value);
});

// 适应手机模式的样式计算
const phoneAdaptStyle = computed(() => {
  if (!isPhoneAdaptMode.value) return {};

  const scale = phoneAdaptScale.value;
  const baseFontSize = 18; // 基础字体大小
  const baseLineHeight = 1.8; // 基础行高
  const basePadding = 30; // 基础内边距

  return {
    fontSize: `${baseFontSize * scale}px`,
    lineHeight: baseLineHeight,
    padding: `${basePadding * scale}px`,
  };
});

// 内容文本的动态样式
const contentTextStyle = computed(() => {
  const baseStyle = {
    fontSize: "18px",
    lineHeight: "1.8",
  };

  if (isPhoneAdaptMode.value) {
    return {
      ...baseStyle,
      fontSize: `${18 * phoneAdaptScale.value}px`,
      transform: `scale(${phoneAdaptScale.value})`,
      transformOrigin: "top left",
      width: isPhoneAdaptMode.value
        ? `${100 / phoneAdaptScale.value}%`
        : "100%",
    };
  }

  return baseStyle;
});

// 计算 scroll-view 的正确高度
const computedScrollViewHeight = computed(() => {
  let height = viewportHeight.value; // 默认使用全屏高度

  // 减去状态栏高度
  if (statusBarHeight.value > 0) {
    height -= statusBarHeight.value;
  }

  // 减去顶部工具栏高度（编辑模式下工具栏总是显示且固定）
  if (isEditMode.value && showTopToolbar.value) {
    height -= 44; // 工具栏高度
  }

  // 减去键盘高度
  if (keyboardHeight.value > 0) {
    height -= keyboardHeight.value;
  }

  // 确保最小高度
  height = Math.max(height, 200);

  return height;
});

// 计算按钮 bottom 值
const computedButtonBottom = computed(() => {
  const keyboardH = keyboardHeight.value;
  let bottom = 80; // 默认位置

  if (keyboardH > 0) {
    // 直接设置按钮在键盘上方10px处
    bottom = keyboardH + 10;

    // 确保按钮不会超出屏幕，至少保留80px的安全距离
    const maxBottom = viewportHeight.value - 80;
    if (bottom > maxBottom) {
      bottom = maxBottom;
    }
  }

  return bottom;
});

// 监听 keyboardHeight 变化
watch(
  keyboardHeight,
  (newVal, oldVal) => {
    // 静默处理键盘高度变化，仅在实际值变化时更新
  },
  { immediate: true }
);

let clockTimer = null;
let hideToolbarTimer = null;
let autoSaveTimer = null;

// 滚动监听
const handleContentScroll = (e) => {
  const currentScrollTop = e.detail.scrollTop;
  const threshold = 44; // 工具栏高度

  // 记录用户手动滚动时间
  lastUserScrollTime = Date.now();

  // 只要工具栏显示且滚动超过阈值，就启用固定模式
  if (
    showTopToolbar.value &&
    currentScrollTop > threshold &&
    !isToolbarPinned.value
  ) {
    isToolbarPinned.value = true;
  }
};

// 工具栏显示控制
const showToolbars = () => {
  showTopToolbar.value = true;
  showBottomToolbar.value = true;
  isToolbarPinned.value = false; // 重置固定状态
};

const toggleToolbars = () => {
  // 如果工具栏当前显示，则隐藏；如果隐藏，则显示
  if (showTopToolbar.value || showBottomToolbar.value) {
    showTopToolbar.value = false;
    showBottomToolbar.value = false;
    isToolbarPinned.value = false;
  } else {
    showToolbars();
    // 显示工具栏时自动启用固定
    setTimeout(() => {
      isToolbarPinned.value = true;
    }, 100);
  }
};

const hideToolbars = () => {
  if (!isEditMode.value) {
    showTopToolbar.value = false;
    showBottomToolbar.value = false;
    isToolbarPinned.value = false;
  }
};

// 滚动到顶部事件
const onScrollToUpper = () => {
  if (showTopToolbar.value && isToolbarPinned.value) {
    isToolbarPinned.value = false;
  }
};

// 编辑模式控制
const toggleEditMode = () => {
  if (isEditMode.value) {
    // 保存或完成编辑
    if (hasChanges.value) {
      saveChapterEdit();
    } else {
      exitEditMode();
    }
  } else {
    enterEditMode();
  }
};

// 进入编辑模式时自动启用工具栏固定逻辑
const enterEditMode = () => {
  isEditMode.value = true;
  hasChanges.value = false;
  showTopToolbar.value = true; // 编辑时顶部工具栏始终显示
  showBottomToolbar.value = false; // 编辑时底部工具栏隐藏

  // 启用固定模式
  isToolbarPinned.value = true;

  // 显示写作板按钮
  showWritingBoardBtn.value = true;

  nextTick(() => {
    // 强制滚动到顶部
    forceScrollToTop();

    // 聚焦标题输入框
    titleRef.value?.focus();
    setTimeout(() => {
      contentRef.value?.focus();
    }, 300);
  });
};

const exitEditMode = () => {
  isEditMode.value = false;
  hasChanges.value = false;
  showTopToolbar.value = false; // 退出编辑模式隐藏顶部工具栏
  showBottomToolbar.value = false; // 退出编辑模式隐藏底部工具栏
  isToolbarPinned.value = false; // 重置固定状态

  // 隐藏写作板按钮和模态框
  showWritingBoardBtn.value = false;
  showWritingBoard.value = false;
  showMapDetailModal.value = false;

  // 恢复原始数据
  editTitle.value = originalTitle.value;
  editContent.value = originalContent.value;
};

const onEditInput = () => {
  const titleChanged = editTitle.value !== originalTitle.value;
  const contentChanged = editContent.value !== originalContent.value;
  hasChanges.value = titleChanged || contentChanged;

  // 检测是否需要添加缩进（在新段落开始时）
  const currentContent = editContent.value;
  const lines = currentContent.split("\n");

  // 为新段落添加缩进
  const formattedLines = lines.map((line, index) => {
    const trimmedLine = line.trim();
    // 如果当前行不为空且没有缩进，添加缩进
    if (
      trimmedLine &&
      !trimmedLine.startsWith("　　") &&
      !trimmedLine.startsWith("  ") &&
      index > 0
    ) {
      // 检查前一行是否以换行符结束（确保是新段落）
      const prevLine = lines[index - 1] || "";
      if (prevLine.trim() !== "") {
        return "　　" + trimmedLine;
      }
    }
    return line;
  });

  // 检查是否需要更新内容（避免循环触发）
  const formattedContent = formattedLines.join("\n");
  if (formattedContent !== currentContent) {
    editContent.value = formattedContent;
  }

  // 更新字数
  wordCount.value = editContent.value.length;
};

const onBlur = (e) => {
  // 在失去焦点时确保所有段落都有正确的缩进
  const currentContent = editContent.value;
  const formattedContent = formatContentIndent(currentContent);

  if (formattedContent !== currentContent) {
    editContent.value = formattedContent;
  }
};

// 键盘高度变化回调函数
let keyboardHeightChangeCallback = null;
let keyboardHeightTimer = null;
let lastReportedKeyboardHeight = -1; // 记录上一次报告的键盘高度，防止重复处理
let lastUserScrollTime = 0; // 记录用户最后一次手动滚动的时间

// 保存光标位置的变量
let currentCursorPosition = 0;

const onInputFocus = (e) => {
  // 立即显示写作板按钮，确保键盘弹出时按钮可见
  showWritingBoardBtn.value = true;

  // 阻止默认的自动滚动行为
  e.preventDefault && e.preventDefault();

  // 使用你发现的正确方式获取光标位置
  if (e.target && typeof e.target.cursor !== "undefined") {
    currentCursorPosition = e.target.cursor;
  } else if (e.detail && typeof e.detail.cursor !== "undefined") {
    currentCursorPosition = e.detail.cursor;
  } else {
    // 尝试使用官方API
    uni.getSelectedTextRange({
      success: (res) => {
        currentCursorPosition = res.start || 0;
      },
      fail: () => {
        currentCursorPosition = editContent.value.length;
      },
    });
  }

  // 延迟一小段时间确保按钮渲染完成，再获取位置信息
  setTimeout(() => {
    // 获取当前焦点元素的位置信息
    try {
      const query = uni.createSelectorQuery();
      // 根据ref类型选择正确的元素
      if (e.target?.classList?.contains?.("edit-title-input")) {
        query.select(".edit-title-input").boundingClientRect();
      } else {
        query.select(".edit-content-input").boundingClientRect();
      }
      query.selectViewport().scrollOffset();
      query.exec((res) => {
        if (res && res[0] && res[1]) {
          // 保存当前焦点元素位置和视口信息
          currentFocusPosition.value = {
            ...res[0],
            scrollTop: res[1].scrollTop,
            cursorPosition: currentCursorPosition, // 保存光标位置
          };
          console.log(`[焦点位置] 获取成功:`, currentFocusPosition.value);
        }
      });
    } catch (e) {
      console.warn("获取焦点元素位置失败:", e);
    }
  }, 50); // 增加延迟确保DOM更新完成

  // 先移除之前的监听（如果存在）
  if (keyboardHeightChangeCallback) {
    try {
      uni.offKeyboardHeightChange(keyboardHeightChangeCallback);
      keyboardHeightChangeCallback = null;
    } catch (e) {
      console.warn("移除监听失败:", e);
    }
  }

  // 清理之前的定时器
  if (keyboardHeightTimer) {
    clearTimeout(keyboardHeightTimer);
    keyboardHeightTimer = null;
  }

  // 重置上一次报告的高度
  lastReportedKeyboardHeight = -1;

  // 创建新的回调函数
  keyboardHeightChangeCallback = (res) => {
    if (res && typeof res === "object" && res !== null) {
      const newHeight = res.height || 0;

      // 严格检查：1. 高度确实变化了 2. 不是重复报告 3. 高度合理
      if (
        lastReportedKeyboardHeight !== newHeight &&
        keyboardHeight.value !== newHeight &&
        newHeight >= 0 &&
        newHeight < 1000
      ) {
        // 更新记录和实际值
        lastReportedKeyboardHeight = newHeight;

        // 使用 nextTick 确保 DOM 更新后再设置键盘高度
        nextTick(() => {
          keyboardHeight.value = newHeight;

          // 键盘弹出时重置滚动位置到顶部，避免被锁定在中部
          if (newHeight > 0) {
            setTimeout(() => {
              scrollTop.value = 0;
            }, 100);
          }

          // 强制触发按钮位置重新计算
          setTimeout(() => {
            // 强制触发重新渲染
            showWritingBoardBtn.value = false;
            nextTick(() => {
              showWritingBoardBtn.value = true;
            });
          }, 50);
        });
      }
    }
  };

  // 监听键盘高度变化
  try {
    uni.onKeyboardHeightChange(keyboardHeightChangeCallback);
  } catch (error) {
    console.warn("监听键盘高度变化失败:", error);
  }
};

// 处理输入框点击事件
const onInputClick = (e) => {
  // 阻止uni-app的自动滚动行为
  e.preventDefault && e.preventDefault();

  // 立即重置滚动位置，防止自动滚动
  if (keyboardHeight.value > 0) {
    scrollTop.value = 0;
  }

  // 使用你发现的正确方式获取光标位置
  if (e.target && typeof e.target.cursor !== "undefined") {
    currentCursorPosition = e.target.cursor;
  } else if (e.detail && typeof e.detail.cursor !== "undefined") {
    currentCursorPosition = e.detail.cursor;
  }
};

// 处理选择变化事件
const onSelectionChange = (e) => {
  const detail = e.detail || {};
  const cursorVal =
    typeof detail.cursor === "number"
      ? detail.cursor
      : e.target && typeof e.target.cursor === "number"
      ? e.target.cursor
      : undefined;
  if (typeof cursorVal === "number") {
    currentCursorPosition = cursorVal;
  }

  const start =
    typeof detail.selectionStart === "number"
      ? detail.selectionStart
      : typeof detail.cursor === "number"
      ? detail.cursor
      : 0;
  const end =
    typeof detail.selectionEnd === "number"
      ? detail.selectionEnd
      : typeof detail.cursor === "number"
      ? detail.cursor
      : 0;

  if (start >= 0 && end >= start) {
    selectionRange.value = { start, end };
    const selected = editContent.value.slice(start, end);
    selectionText.value = selected;
  } else {
    selectionRange.value = { start: 0, end: 0 };
    selectionText.value = "";
  }
};

const onInputBlur = (e) => {
  // 延迟重置键盘高度，给模态框打开时间
  setTimeout(() => {
    // 如果模态框没有打开，才重置键盘高度
    if (!showWritingBoard.value && !showMapDetailModal.value) {
      // 重置键盘高度和记录
      keyboardHeight.value = 0;
      lastReportedKeyboardHeight = -1;
    }
  }, 100);

  // 移除键盘监听
  if (keyboardHeightChangeCallback) {
    try {
      uni.offKeyboardHeightChange(keyboardHeightChangeCallback);
      keyboardHeightChangeCallback = null;
    } catch (error) {
      console.warn("移除键盘监听失败:", error);
    }
  }

  // 清理定时器
  if (keyboardHeightTimer) {
    clearTimeout(keyboardHeightTimer);
    keyboardHeightTimer = null;
  }

  // 键盘收起后重置滚动位置
  scrollTop.value = 0;

  // 确保所有段落都有正确的缩进
  const currentContent = editContent.value;
  const formattedContent = formatContentIndent(currentContent);

  if (formattedContent !== currentContent) {
    editContent.value = formattedContent;
  }
};

// 长按触发查找选择
const onContentLongPress = () => {
  if (!isEditMode.value) return;
  // 先尝试读取当前选区，保证第二次长按仍能拿到文本
  uni.getSelectedTextRange({
    success: (res) => {
      const start = typeof res.start === "number" ? res.start : 0;
      const end = typeof res.end === "number" ? res.end : start;
      if (end > start) {
        selectionRange.value = { start, end };
        selectionText.value = editContent.value.slice(start, end);
      }
      const keywordNow = (selectionText.value || "").trim();
      if (!keywordNow) {
        uni.showToast({ title: "请先选中文本", icon: "none" });
        return;
      }
      showLookupChoiceModal.value = true;
      console.log("[Lookup] longpress trigger, text:", keywordNow);
    },
    fail: () => {
      const keywordNow = (selectionText.value || "").trim();
      if (!keywordNow) {
        uni.showToast({ title: "请先选中文本", icon: "none" });
        return;
      }
      showLookupChoiceModal.value = true;
      console.log("[Lookup] longpress trigger (fallback), text:", keywordNow);
    },
  });

  const keyword = (selectionText.value || "").trim();
  if (!keyword) return;
  showLookupChoiceModal.value = true;
};

const closeLookupChoice = () => {
  showLookupChoiceModal.value = false;
};

const closeLookupResult = () => {
  showLookupResultModal.value = false;
  lookupResult.value = null;
  lookupTargetType.value = null;
  lookupLoading.value = false;
};

const ensureLookupData = async (type) => {
  if (type === "character" && charactersList.value.length === 0) {
    const list = await fileStorage.getCharacters(userId.value, workId.value);
    charactersList.value = Array.isArray(list) ? list : [];
  }
  if (type === "term" && termsList.value.length === 0) {
    const list = await fileStorage.getTerms(userId.value, workId.value);
    termsList.value = Array.isArray(list) ? list : [];
  }
};

const handleLookupChoice = async (type) => {
  if (lookupLoading.value) return;
  const keyword = (selectionText.value || "").trim();
  if (!keyword) {
    uni.showToast({ title: "请先选择文本", icon: "none" });
    showLookupChoiceModal.value = false;
    return;
  }

  lookupTargetType.value = type;
  showLookupChoiceModal.value = false;
  showLookupResultModal.value = true;
  lookupLoading.value = true;
  lookupResult.value = null;

  try {
    await ensureLookupData(type);
    const list = type === "character" ? charactersList.value : termsList.value;
    const matched =
      Array.isArray(list) &&
      list.find((item) => {
        const name = (item.name || item.title || "").trim();
        return name === keyword;
      });

    if (matched) {
      lookupResult.value = { found: true, item: matched };
    } else {
      lookupResult.value = {
        found: false,
        item: { name: keyword, description: "" },
      };
    }
  } catch (error) {
    console.error("查找失败:", error);
    lookupResult.value = {
      found: false,
      item: { name: keyword, description: "" },
    };
  } finally {
    lookupLoading.value = false;
  }
};

// 已删除自动滚动功能，现在只使用手动滚动

// 已删除智能滚动函数，现在只使用手动滚动

const saveChapterEdit = async () => {
  isSaving.value = true;

  try {
    const workPath = fileStorage.getWorkPath(userId.value, workId.value);
    const chapterPath = `${workPath}/chapters/${chapterId.value}.json`;

    // 更新章节数据
    const updatedChapter = {
      ...chapterInfo.value,
      title: editTitle.value,
      content: editContent.value,
      word_count: wordCount.value,
      updated_at: new Date().toISOString(),
    };

    await fileStorage.writeFile(chapterPath, updatedChapter);

    // 更新显示数据
    chapterInfo.value = updatedChapter;
    chapterContent.value = editContent.value;
    originalTitle.value = editTitle.value;
    originalContent.value = editContent.value;
    hasChanges.value = false;

    // 更新章节列表
    await updateChaptersList(updatedChapter);

    // 更新作品信息
    try {
      await fileStorage.updateWork(userId.value, workId.value, {
        updated_at: new Date().toISOString(),
      });
    } catch (updateError) {
      console.warn("⚠️ 更新作品时间失败，但章节已保存:", updateError);
    }

    lastSaveTime.value = new Date();

    uni.showToast({
      title: "保存成功",
      icon: "success",
    });

    // 退出编辑模式
    isEditMode.value = false;
  } catch (error) {
    console.error("❌ 保存章节失败:", error);
    uni.showToast({
      title: "保存失败",
      icon: "error",
    });
  } finally {
    setTimeout(() => {
      isSaving.value = false;
    }, 1000);
  }
};

// 工具栏功能
const openServiceMenu = () => {
  // 根据是否是编辑模式显示不同的菜单项
  const menuItems = isEditMode.value
    ? ["复制章节", "导出为文本", "章节统计", "适应手机", "删除章节"]
    : ["复制章节", "导出为文本", "章节统计", "删除章节"];

  uni.showActionSheet({
    itemList: menuItems,
    success: (res) => {
      // 直接使用tapIndex，不需要调整索引
      switch (res.tapIndex) {
        case 0:
          copyChapter();
          break;
        case 1:
          exportChapter();
          break;
        case 2:
          showChapterStats();
          break;
        case 3:
          if (isEditMode.value) {
            // 编辑模式下的适应手机功能
            adaptToPhoneInEditMode();
          } else {
            deleteChapter();
          }
          break;
        case 4:
          if (isEditMode.value) {
            deleteChapter();
          }
          break;
      }
    },
  });
};

const openTools = () => {
  uni.showActionSheet({
    itemList: ["查找替换", "插入模板", "格式设置", "历史版本"],
    success: (res) => {
      // TODO: 实现工具功能
    },
  });
};

const adaptToPhone = () => {
  if (isPhoneAdaptMode.value) {
    // 退出适应手机模式
    exitPhoneAdaptMode();
  } else {
    // 进入适应手机模式
    enterPhoneAdaptMode();
  }
};

// 编辑模式下的适应手机功能
const adaptToPhoneInEditMode = () => {
  if (isPhoneAdaptMode.value) {
    // 退出适应手机模式
    exitPhoneAdaptMode();
  } else {
    // 进入适应手机模式
    enterPhoneAdaptMode();

    // 显示提示
    uni.showToast({
      title: "编辑模式下适应手机仅用于预览效果",
      icon: "none",
      duration: 2000,
    });
  }
};

// 进入适应手机模式
const enterPhoneAdaptMode = () => {
  isPhoneAdaptMode.value = true;
  phoneAdaptScale.value = 1.2; // 默认缩放比例

  uni.showToast({
    title: "已进入适应手机模式，双指缩放调整",
    icon: "none",
    duration: 2000,
  });
};

// 退出适应手机模式
const exitPhoneAdaptMode = () => {
  isPhoneAdaptMode.value = false;
  phoneAdaptScale.value = 1;

  uni.showToast({
    title: "已退出适应手机模式",
    icon: "none",
  });
};

const shareChapter = () => {
  uni.share({
    provider: "weixin",
    scene: "WXSceneSession",
    type: 0,
    href: "",
    title: chapterInfo.value.title,
    summary: `来自《${workInfo.value.title}》`,
    imageUrl: "",
    success: () => {
      uni.showToast({
        title: "分享成功",
        icon: "success",
      });
    },
    fail: () => {
      uni.showToast({
        title: "分享失败",
        icon: "error",
      });
    },
  });
};

const copyChapter = () => {
  uni.setClipboardData({
    data: chapterContent.value,
    success: () => {
      uni.showToast({
        title: "已复制到剪贴板",
        icon: "success",
      });
    },
  });
};

const exportChapter = () => {
  // TODO: 实现导出功能
  uni.showToast({
    title: "导出功能开发中",
    icon: "none",
  });
};

const showChapterStats = () => {
  const stats = `字数统计：${wordCount.value}字
段落数：${chapterContent.value.split("").length}段
更新时间：${formatTime(chapterInfo.updated_at)}`;

  uni.showModal({
    title: "章节统计",
    content: stats,
    showCancel: false,
  });
};

const deleteChapter = () => {
  uni.showModal({
    title: "确认删除",
    content: `确定要删除"${chapterInfo.value.title}"吗？此操作不可撤销。`,
    success: (res) => {
      if (res.confirm) {
        // TODO: 实现删除功能
        uni.showToast({
          title: "删除功能开发中",
          icon: "none",
        });
      }
    },
  });
};

const clearTimers = () => {
  if (clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
  if (hideToolbarTimer) {
    clearTimeout(hideToolbarTimer);
    hideToolbarTimer = null;
  }
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
};

onLoad(async (options) => {
  if (!options || !options.workId || !options.chapterId) {
    console.error("❌ 缺少必要参数 workId 或 chapterId");
    uni.showToast({
      title: "参数错误",
      icon: "error",
    });
    setTimeout(() => uni.navigateBack(), 10);
    return;
  }

  workId.value = options.workId;
  // 初始化主题
  isDarkMode.value = themeManager.isDarkMode();

  // 监听主题变更事件
  try {
    if (typeof uni !== "undefined" && uni.$on) {
      uni.$on("theme-changed", (themeData) => {
        isDarkMode.value = themeData.isDark;
      });
    }
  } catch (error) {
    console.warn("主题监听器设置失败:", error);
  }

  chapterId.value = options.chapterId;
  userId.value = options.userId || "default_user";

  // 初始化系统信息
  try {
    const systemInfo = uni.getSystemInfoSync();
    statusBarHeight.value = systemInfo.statusBarHeight || 20;
    viewportHeight.value =
      systemInfo.windowHeight || systemInfo.screenHeight || 667; // 默认iPhone高度
    usableHeight.value = viewportHeight.value;
  } catch (error) {
    console.warn("获取系统信息失败:", error);
    statusBarHeight.value = 20;
    viewportHeight.value = 667;
    usableHeight.value = viewportHeight.value;
  }

  await loadChapterData();

  autoSaveTimer = setInterval(() => {
    if (chapterContent.value.trim() && !isSaving.value) {
      autoSave();
    }
  }, 30000);
});

onUnload(() => {
  clearTimers();
  // 清理写作板状态
  showWritingBoard.value = false;
  showWritingBoardBtn.value = false;
  showMapDetailModal.value = false;
  currentMapData.value = null;
  // 清理键盘监听
  if (keyboardHeightChangeCallback) {
    try {
      uni.offKeyboardHeightChange(keyboardHeightChangeCallback);
      keyboardHeightChangeCallback = null;
    } catch (error) {
      console.warn("清理键盘监听失败:", error);
    }
  }
});

// 方法
const loadChapterData = async () => {
  try {
    // 读取作品配置
    const workPath = fileStorage.getWorkPath(userId.value, workId.value);
    const workConfigPath = `${workPath}/work.config.json`;
    const workConfig = await fileStorage.readFile(workConfigPath);

    if (workConfig) {
      workInfo.value = workConfig;
    }

    // 读取章节文件
    const chapterPath = `${workPath}/chapters/${chapterId.value}.json`;
    const chapterData = await fileStorage.readFile(chapterPath);

    if (chapterData) {
      chapterInfo.value = chapterData;
      chapterContent.value = chapterData.content || "";
      wordCount.value = chapterData.word_count || 0;

      // 初始化编辑数据
      editTitle.value = chapterData.title || "";
      editContent.value = chapterData.content || "";
      originalTitle.value = chapterData.title || "";
      originalContent.value = chapterData.content || "";
    } else {
      console.error("❌ 章节文件不存在");
      uni.showToast({
        title: "章节不存在",
        icon: "error",
      });
      uni.navigateBack();
    }
  } catch (error) {
    console.error("❌ 加载章节数据失败:", error);
    uni.showToast({
      title: "加载失败",
      icon: "error",
    });
  }
};

const saveChapter = async () => {
  if (isSaving.value) return;

  isSaving.value = true;

  try {
    if (!workId.value || !chapterId.value || !userId.value) {
      throw new Error("缺少必要参数");
    }

    const workPath = fileStorage.getWorkPath(userId.value, workId.value);
    const chapterPath = `${workPath}/chapters/${chapterId.value}.json`;

    // 更新章节数据
    const updatedChapter = {
      ...chapterInfo.value,
      content: chapterContent.value,
      word_count: wordCount.value,
      updated_at: new Date().toISOString(),
    };

    await fileStorage.writeFile(chapterPath, updatedChapter);
    chapterInfo.value = updatedChapter;

    // 更新章节列表中的信息
    await updateChaptersList(updatedChapter);

    // 更新作品的最后修改时间
    try {
      await fileStorage.updateWork(userId.value, workId.value, {
        updated_at: new Date().toISOString(),
      });
    } catch (updateError) {
      console.warn("⚠️ 更新作品时间失败，但章节已保存:", updateError);
    }

    lastSaveTime.value = new Date();

    uni.showToast({
      title: "保存成功",
      icon: "success",
    });
  } catch (error) {
    console.error("❌ 保存章节失败:", error);
    uni.showToast({
      title: "保存失败",
      icon: "error",
    });
  } finally {
    setTimeout(() => {
      isSaving.value = false;
    }, 1000);
  }
};

const updateChaptersList = async (updatedChapter) => {
  try {
    const workPath = fileStorage.getWorkPath(userId.value, workId.value);
    const chaptersPath = `${workPath}/chapters/chapters.json`;
    const chaptersList = (await fileStorage.readFile(chaptersPath)) || [];

    const chapterIndex = chaptersList.findIndex(
      (ch) => ch.id === chapterId.value
    );
    if (chapterIndex !== -1) {
      chaptersList[chapterIndex] = {
        ...chaptersList[chapterIndex],
        title: updatedChapter.title,
        word_count: updatedChapter.word_count,
        is_completed: updatedChapter.is_completed,
        updated_at: updatedChapter.updated_at,
        content: "", // chapters.json中content为空，内容只保存在单独的章节文件中
      };

      await fileStorage.writeFile(chaptersPath, chaptersList);
    }
  } catch (error) {
    console.error("❌ 更新章节列表失败:", error);
  }
};

const autoSave = async () => {
  try {
    const workPath = fileStorage.getWorkPath(userId.value, workId.value);
    const chapterPath = `${workPath}/chapters/${chapterId.value}.json`;

    // 更新章节数据
    const updatedChapter = {
      ...chapterInfo.value,
      content: chapterContent.value,
      word_count: wordCount.value,
      updated_at: new Date().toISOString(),
    };

    await fileStorage.writeFile(chapterPath, updatedChapter);
    chapterInfo.value = updatedChapter;

    // 更新章节列表
    await updateChaptersList(updatedChapter);

    lastSaveTime.value = new Date();
  } catch (error) {
    console.warn("⚠️ 自动保存失败:", error);
  }
};

const toggleCompleted = () => {
  chapterInfo.value.is_completed = !chapterInfo.value.is_completed;
  saveChapter();
};

const onContentChange = (e) => {
  const newContent = e.detail.value;
  if (newContent !== chapterContent.value) {
    // 保存到撤销栈
    undoStack.value.push(chapterContent.value);
    if (undoStack.value.length > 20) {
      undoStack.value.shift();
    }
  }

  chapterContent.value = newContent;
  wordCount.value = newContent.length;
  showToolbar();
};

const onEditorFocus = () => {
  isEditorFocused.value = true;
  showQuickMenu.value = true;
  setTimeout(() => {
    showQuickMenu.value = false;
  }, 3000);
};

const onEditorBlur = () => {
  isEditorFocused.value = false;
  showQuickMenu.value = false;
};

// 新增功能方法
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  if (!isFullscreen.value) {
    nextTick(() => {
      editorRef.value?.focus();
    });
  }
};

const handleScroll = (e) => {
  const scrollTop = e.detail.scrollTop;
  isScrolled.value = scrollTop > 50;
};

const onTitleChange = (e) => {
  chapterInfo.value.title = e.detail.value;
};

const insertTemplate = (type) => {
  const templates = {
    dialogue: "「 」",
    description: "这里是一段详细的场景描写，环境氛围的渲染。",
    action: "角色做出了某个动作，推动了情节发展。",
    psychology: "内心独白：角色的想法和感受。",
  };

  const template = templates[type];
  if (!template || !editorRef.value) return;

  const cursorPosition = chapterContent.value.length;
  const newContent = chapterContent.value + "" + template + "";

  // 保存到撤销栈
  undoStack.value.push(chapterContent.value);
  if (undoStack.value.length > 20) {
    undoStack.value.shift();
  }

  chapterContent.value = newContent;
  wordCount.value = newContent.length;

  // 重新聚焦编辑器
  nextTick(() => {
    editorRef.value?.focus();
  });
};

const undoAction = () => {
  if (undoStack.value.length > 0) {
    redoStack.value.push(chapterContent.value);
    chapterContent.value = undoStack.value.pop();
    wordCount.value = chapterContent.value.length;
  }
};

const redoAction = () => {
  if (redoStack.value.length > 0) {
    undoStack.value.push(chapterContent.value);
    chapterContent.value = redoStack.value.pop();
    wordCount.value = chapterContent.value.length;
  }
};

const formatText = (format) => {
  // 文本格式化功能（简化实现）
  const formats = {
    bold: "**粗体文本**",
    italic: "*斜体文本*",
    underline: "__下划线文本__",
  };

  const formatString = formats[format];
  if (formatString && editorRef.value) {
    chapterContent.value += formatString;
    wordCount.value = chapterContent.value.length;
  }
};

const insertLineBreak = () => {
  chapterContent.value += "";
  wordCount.value = chapterContent.value.length;
};

// 工具栏自动隐藏逻辑
const showToolbar = () => {
  isToolbarHidden.value = false;
  if (hideToolbarTimer) {
    clearTimeout(hideToolbarTimer);
  }
  hideToolbarTimer = setTimeout(() => {
    if (!isEditorFocused.value) {
      isToolbarHidden.value = true;
    }
  }, 5000);
};

const formatLastSaveTime = () => {
  if (!lastSaveTime.value) return "";

  const now = new Date();
  const diff = Math.floor((now - lastSaveTime.value) / 1000); // 秒数差

  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
};

const formatTime = (timestamp) => {
  if (!timestamp) return "未知时间";

  try {
    const now = new Date();
    const time = new Date(timestamp);

    if (isNaN(time.getTime())) {
      return "未知时间";
    }

    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diff < 60) return "刚刚";
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;

    return time.toLocaleDateString();
  } catch (error) {
    return "未知时间";
  }
};

const formatContentIndent = (content) => {
  if (!content) return content;

  // 将文本按换行符分割成段落
  const lines = content.split("\n");
  const formattedLines = lines.map((line) => {
    const trimmedLine = line.trim();
    // 如果行不为空，添加缩进（使用两个中文字符宽度）
    if (
      trimmedLine &&
      !trimmedLine.startsWith("　　") &&
      !trimmedLine.startsWith("  ")
    ) {
      return "　　" + trimmedLine; // 使用两个全角空格（中文字符宽度）
    }
    return line;
  });

  return formattedLines.join("\n");
};

const goBack = () => {
  // 检查是否有未保存的更改
  if (chapterContent.value.trim() && !lastSaveTime.value) {
    uni.showModal({
      title: "未保存的更改",
      content: "章节有未保存的更改，是否保存后退出？",
      success: (res) => {
        if (res.confirm) {
          saveChapter().then(() => {
            uni.navigateBack();
          });
        } else if (res.cancel) {
          uni.navigateBack();
        }
      },
    });
  } else {
    uni.navigateBack();
  }
};

// 强制滚动到真正的顶部
const forceScrollToTop = () => {
  scrollTop.value = 0;
};

// 写作板相关方法
const openWritingBoard = async () => {
  showWritingBoard.value = true;
  // 根据当前标签加载数据
  await loadWritingBoardData(currentWritingTab.value);
};

const closeWritingBoard = () => {
  showWritingBoard.value = false;
  showMapDetailModal.value = false;
  currentMapData.value = null;

  // 如果键盘已收起，延迟隐藏按钮，给用户时间看到关闭动画
  if (keyboardHeight.value === 0) {
    setTimeout(() => {
      // 只有在没有打开模态框且键盘确实收起时才隐藏按钮
      if (
        !showWritingBoard.value &&
        !showMapDetailModal.value &&
        keyboardHeight.value === 0
      ) {
        showWritingBoardBtn.value = false;
      }
    }, 300);
  }

  // 恢复输入框焦点
  nextTick(() => {
    if (contentRef.value && isEditMode.value) {
      contentRef.value.focus();
    }
  });
};

const switchWritingTab = async (tabKey) => {
  currentWritingTab.value = tabKey;
  await loadWritingBoardData(tabKey);
};

const loadWritingBoardData = async (tabKey) => {
  if (!workId.value || !userId.value) return;

  try {
    switch (tabKey) {
      case "character":
        if (charactersList.value.length === 0) {
          const characters = await fileStorage.getCharacters(
            userId.value,
            workId.value
          );
          charactersList.value = Array.isArray(characters) ? characters : [];
        }
        break;
      case "term":
        if (termsList.value.length === 0) {
          const terms = await fileStorage.getTerms(userId.value, workId.value);
          termsList.value = Array.isArray(terms) ? terms : [];
        }
        break;
      case "map":
        if (mapsList.value.length === 0) {
          const mapListData = await fileStorage.getMapList(
            userId.value,
            workId.value
          );
          mapsList.value =
            mapListData && Array.isArray(mapListData.maps)
              ? mapListData.maps
              : [];
        }
        break;
    }
  } catch (error) {
    console.error("加载写作板数据失败:", error);
    uni.showToast({
      title: "加载失败",
      icon: "error",
    });
  }
};

// 插入人物名称
const insertCharacterName = (character) => {
  const name = character.name || character.title || "未命名";
  // 不重新聚焦，直接在当前光标位置插入
  insertTextAtCursorDirectly(name);
  // 延迟关闭，确保文本已插入
  setTimeout(() => {
    closeWritingBoard();
  }, 100);
};

// 插入设定名称
const insertTermName = (term) => {
  const name = term.name || term.title || "未命名";
  // 不重新聚焦，直接在当前光标位置插入
  insertTextAtCursorDirectly(name);
  // 延迟关闭，确保文本已插入
  setTimeout(() => {
    closeWritingBoard();
  }, 100);
};

// 在光标位置插入文本
const insertTextAtCursor = (text) => {
  if (!contentRef.value) return;

  // 获取当前光标位置
  const cursorPosition =
    contentRef.value.selectionStart || editContent.value.length;
  const currentContent = editContent.value;

  // 在光标位置插入文本
  const newContent =
    currentContent.slice(0, cursorPosition) +
    text +
    currentContent.slice(cursorPosition);
  editContent.value = newContent;

  // 触发输入事件以更新字数等
  onEditInput();

  // 重新聚焦并设置光标位置到插入文本后
  nextTick(() => {
    if (contentRef.value) {
      contentRef.value.focus();
      // 尝试设置光标位置
      try {
        const newCursorPosition = cursorPosition + text.length;
        contentRef.value.setSelectionRange(
          newCursorPosition,
          newCursorPosition
        );
      } catch (e) {
        console.warn("设置光标位置失败:", e);
      }
    }
  });
};

// 直接在光标位置插入文本（不重新聚焦）
const insertTextAtCursorDirectly = (text) => {
  if (!contentRef.value) {
    return;
  }

  // 优先使用保存的光标位置
  let cursorPosition = currentCursorPosition || editContent.value.length;

  // 再次验证光标位置是否有效
  uni.getSelectedTextRange({
    success: (res) => {
      // 使用API返回的准确位置
      cursorPosition = res.start || cursorPosition;
      performInsert(text, cursorPosition);
    },
    fail: (err) => {
      // 使用之前保存的位置
      performInsert(text, cursorPosition);
    },
  });
};

// 执行插入操作的函数
const performInsert = (text, cursorPosition) => {
  const currentContent = editContent.value;

  // 在光标位置插入文本
  const newContent =
    currentContent.slice(0, cursorPosition) +
    text +
    currentContent.slice(cursorPosition);

  editContent.value = newContent;

  // 更新光标位置到插入文本后
  currentCursorPosition = cursorPosition + text.length;

  // 触发输入事件以更新字数等
  onEditInput();

  // 记录插入操作时间，防止智能滚动立即触发
  lastUserScrollTime = Date.now();

  // 设置光标位置到插入文本后
  nextTick(() => {
    // 使用 uniapp 的方式设置光标位置
    uni.getSelectedTextRange({
      success: (res) => {
        console.log(
          `[插入执行] 设置光标前当前位置: start=${res.start}, end=${res.end}`
        );
      },
    });

    console.log(`[插入成功] 文本已插入，新内容长度: ${newContent.length}`);
  });
};

// 显示地图详情
const showMapDetail = async (map) => {
  try {
    const mapData = await fileStorage.getMapData(
      userId.value,
      workId.value,
      map.id
    );
    if (mapData) {
      currentMapData.value = mapData;
      mapScale.value = 1;
      showMapDetailModal.value = true;
      showWritingBoard.value = false;

      // 初始化canvas并绘制地图
      nextTick(() => {
        initMapCanvas();
        drawMap();
      });
    } else {
      uni.showToast({
        title: "地图数据不存在",
        icon: "error",
      });
    }
  } catch (error) {
    console.error("加载地图详情失败:", error);
    uni.showToast({
      title: "加载失败",
      icon: "error",
    });
  }
};

// 初始化地图canvas
const initMapCanvas = () => {
  try {
    mapCanvasContext = uni.createCanvasContext("mapPreviewCanvas");
    // 获取容器尺寸
    const query = uni.createSelectorQuery();
    query.select(".map-preview-container").boundingClientRect();
    query.exec((res) => {
      if (res && res[0]) {
        mapCanvasWidth.value = res[0].width || 600;
        mapCanvasHeight.value = res[0].height || 400;
        drawMap();
      }
    });
  } catch (error) {
    console.error("初始化地图canvas失败:", error);
  }
};

// 绘制地图
const drawMap = () => {
  if (!mapCanvasContext || !currentMapData.value) return;

  const nodes = currentMapData.value.nodes || [];
  const edges = currentMapData.value.edges || [];

  // 清空画布
  mapCanvasContext.clearRect(0, 0, mapCanvasWidth.value, mapCanvasHeight.value);

  // 绘制背景
  mapCanvasContext.setFillStyle(isDarkMode.value ? "#1a1a1a" : "#f5f5f5");
  mapCanvasContext.fillRect(0, 0, mapCanvasWidth.value, mapCanvasHeight.value);

  // 计算节点位置范围，用于居中显示
  if (nodes.length > 0) {
    const xValues = nodes.map((n) => n.x || 0);
    const yValues = nodes.map((n) => n.y || 0);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const padding = 50;
    const scaleX = (mapCanvasWidth.value - padding * 2) / rangeX;
    const scaleY = (mapCanvasHeight.value - padding * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY, 1); // 不放大，只缩小

    const offsetX = (mapCanvasWidth.value - (maxX + minX) * scale) / 2;
    const offsetY = (mapCanvasHeight.value - (maxY + minY) * scale) / 2;

    // 绘制边
    edges.forEach((edge) => {
      const fromNode = nodes.find(
        (n) => n.id === edge.from || n.id === edge.source
      );
      const toNode = nodes.find(
        (n) => n.id === edge.to || n.id === edge.target
      );
      if (fromNode && toNode) {
        const x1 = (fromNode.x || 0) * scale + offsetX;
        const y1 = (fromNode.y || 0) * scale + offsetY;
        const x2 = (toNode.x || 0) * scale + offsetX;
        const y2 = (toNode.y || 0) * scale + offsetY;

        mapCanvasContext.setStrokeStyle("#999");
        mapCanvasContext.setLineWidth(2);
        mapCanvasContext.beginPath();
        mapCanvasContext.moveTo(x1, y1);
        mapCanvasContext.lineTo(x2, y2);
        mapCanvasContext.stroke();
      }
    });

    // 绘制节点
    nodes.forEach((node) => {
      const x = (node.x || 0) * scale + offsetX;
      const y = (node.y || 0) * scale + offsetY;

      // 绘制节点背景
      mapCanvasContext.setFillStyle("rgba(0, 122, 255, 0.2)");
      mapCanvasContext.setStrokeStyle("rgba(0, 122, 255, 0.4)");
      mapCanvasContext.setLineWidth(2);
      mapCanvasContext.beginPath();
      mapCanvasContext.arc(x, y, 30, 0, 2 * Math.PI);
      mapCanvasContext.fill();
      mapCanvasContext.stroke();

      // 绘制节点文字
      const label = node.label || node.name || node.id || "";
      mapCanvasContext.setFillStyle("#007aff");
      mapCanvasContext.setFontSize(12);
      mapCanvasContext.setTextAlign("center");
      mapCanvasContext.setTextBaseline("middle");
      mapCanvasContext.fillText(label, x, y);
    });
  }

  mapCanvasContext.draw();
};

const closeMapDetail = () => {
  showMapDetailModal.value = false;
  currentMapData.value = null;
  mapScale.value = 1;
  mapCanvasContext = null;
  // 返回写作板
  if (currentWritingTab.value === "map") {
    showWritingBoard.value = true;
  }
};

// 地图缩放
const zoomMapIn = () => {
  mapScale.value = Math.min(mapScale.value + 0.1, 2);
  nextTick(() => {
    drawMap();
  });
};

const zoomMapOut = () => {
  mapScale.value = Math.max(mapScale.value - 0.1, 0.5);
  nextTick(() => {
    drawMap();
  });
};
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  color: #e0e0e0;
  position: relative;
  overflow-x: hidden;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
}

.light-theme {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  color: #333;
}

/* 内容包装器 */
.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  /* 移除固定高度，让内容自适应 */
}

/* 当工具栏固定时，为内容留出空间 */
.content-wrapper.has-toolbar-pinned {
  padding-top: 44px;
}

/* 键盘弹出时移除padding-top，允许滚动到真正的顶部 */
.content-wrapper.has-toolbar-pinned.keyboard-active {
  padding-top: 0;
}

/* 内容区域 */
.content-container {
  flex: 1;
  padding: 30px;
  cursor: pointer;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
}

.edit-container {
  flex: 1;
  padding: 30px;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.chapter-header {
  text-align: center;
  margin-bottom: 40px;
}

.chapter-title {
  font-size: 24px;
  font-weight: 700;
  color: inherit;
  display: block;
  margin-bottom: 8px;
  line-height: 1.3;
  font-family: "SimSun", "宋体", serif;
  /* 宋体三号字，约16pt */
}

.chapter-meta {
  font-size: 14px;
  color: inherit;
  opacity: 0.6;
  display: block;
}

.chapter-content {
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.8;
  width: 100%;
  box-sizing: border-box;
  padding: 0 10px;
  overflow-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
}

/* 适应手机模式样式 */
.content-container.phone-adapt-mode {
  overflow: hidden;
}

.content-container.phone-adapt-mode .chapter-content {
  transition: all 0.3s ease;
  transform-origin: top left;
}

.content-text {
  font-size: 18px;
  color: inherit;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  text-align: justify;
  width: 100%;
  box-sizing: border-box;
  line-height: 1.8;
  display: block;
  font-family: "SimSun", "宋体", serif;
  /* 宋体四号字，约14pt，行高1.8使一行约20字 */
}

/* 移除CSS缩进，改用JavaScript处理 */

/* 顶部工具栏 */
.top-toolbar {
  background: rgba(26, 26, 26, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 20px;
  height: 44px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(-100%);
  opacity: 0;
}

.light-theme .top-toolbar {
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.top-toolbar.show {
  transform: translateY(0);
  opacity: 1;
}

.top-toolbar.pinned {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 998;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  transition: all 0.2s ease;
  cursor: pointer;
  min-width: 44px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toolbar-btn.text-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.light-theme .toolbar-btn.text-btn {
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.toolbar-btn:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.2);
}

.btn-text {
  font-size: 14px;
  color: #007aff;
  font-weight: 500;
}

.btn-text.save-text {
  color: #ff3b30;
}

/* 底部工具栏 */
.bottom-toolbar {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: rgba(26, 26, 26, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 16px;
  z-index: 997;
  transform: translateY(120%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3), 0 -2px 10px rgba(0, 0, 0, 0.2),
    0 -1px 5px rgba(0, 0, 0, 0.1);
  height: 44px;
  display: flex;
  align-items: center;
}

.light-theme .bottom-toolbar {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15), 0 -2px 10px rgba(0, 0, 0, 0.1),
    0 -1px 5px rgba(0, 0, 0, 0.05);
}

.bottom-toolbar.show {
  transform: translateY(0);
}

.toolbar-content {
  display: flex;
  justify-content: space-around;
  align-items: center;
  width: 100%;
}

.tool-item {
  padding: 8px 16px;
  transition: all 0.2s ease;
  cursor: pointer;
  border-radius: 12px;
  min-width: 60px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-item.text-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.light-theme .tool-item.text-btn {
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.tool-item:active {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(0.95);
}

.btn-text {
  font-size: 13px;
  color: inherit;
  font-weight: 500;
}

/* 编辑输入样式 */
.edit-title-input {
  width: 100%;
  height: 50px;
  background: transparent;
  border: none;
  color: inherit;
  font-size: 24px;
  font-weight: 700;
  outline: none;
  padding: 10px 0;
  text-align: center;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 10px;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  font-family: "SimSun", "宋体", serif;
  /* 编辑器标题：宋体三号字，高度50px避免文字遮挡 */
}

.light-theme .edit-title-input {
  border-bottom: 2px solid rgba(0, 0, 0, 0.2);
  font-family: "SimSun", "宋体", serif;
}

.edit-content-section {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  /* 确保内容区域正确布局 */
}

.keyboard-spacer {
  width: 100%;
  flex-shrink: 0;
  /* 占位元素，用于键盘弹出时提供滚动空间 */
}

.edit-content-input {
  width: 100%;
  min-height: 400px;
  background: transparent;
  border: none;
  color: inherit;
  font-size: 18px;
  line-height: 1.8;
  outline: none;
  resize: none;
  font-family: "SimSun", "宋体", serif;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
  /* 编辑器内容：宋体四号字，行高1.8使一行约20字，使用JavaScript处理缩进 */
  /* 禁用uni-app的自动键盘适配，使用手动控制 */
}

.edit-content-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.light-theme .edit-content-input::placeholder {
  color: rgba(0, 0, 0, 0.4);
}

.light-theme .edit-content-input {
  font-family: "SimSun", "宋体", serif;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .content-wrapper {
    min-height: 100vh;
  }

  .content-wrapper.edit-mode {
    padding-top: 44px;
  }

  .content-container {
    padding: 44px 20px 20px;
    padding-right: 20px;
    box-sizing: border-box;
  }

  .chapter-title {
    font-size: 20px;
  }

  .content-text {
    font-size: 16px;
    overflow-wrap: break-word;
    word-break: break-word;
    line-height: 1.8;
    display: block;
    font-family: "SimSun", "宋体", serif;
    /* 移动端：宋体四号字较小字号，行高1.8 */
  }

  .edit-container {
    padding: 20px;
    padding-right: 20px;
    box-sizing: border-box;
    gap: 30px;
  }

  .top-toolbar {
    padding: 6px 16px;
  }

  .bottom-toolbar {
    left: 16px;
    right: 16px;
    padding: 10px 12px;
    height: 40px;
  }

  .toolbar-content {
    gap: 6px;
  }

  .tool-item {
    padding: 6px 12px;
    min-width: 50px;
    height: 28px;
  }

  .toolbar-btn {
    padding: 4px 10px;
    min-width: 40px;
    height: 24px;
  }

  .btn-text {
    font-size: 12px;
  }

  .edit-title-input {
    font-size: 20px;
    text-align: center;
    font-family: "SimSun", "宋体", serif;
    height: 40px;
    padding: 8px 0;
    /* 移动端标题高度40px，避免文字遮挡 */
  }

  .edit-content-input {
    font-size: 16px;
    min-height: 300px;
    line-height: 1.8;
    font-family: "SimSun", "宋体", serif;
    padding: 0;
    /* 移动端编辑器：使用JavaScript处理缩进 */
  }
}

/* 主题切换动画 */
.page-container * {
  transition: background-color 0.3s ease, color 0.3s ease,
    border-color 0.3s ease;
}

/* 写作板按钮 */
.writing-board-btn {
  position: fixed !important;
  width: 56px !important;
  height: 56px !important;
  border-radius: 50% !important;
  background: linear-gradient(135deg, #007aff 0%, #0051d5 100%) !important;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 1000 !important;
  /* 只对bottom属性使用过渡，避免其他属性被影响 */
  transition: bottom 0.15s ease-out !important;
  /* 确保按钮定位基于视口，不受内容区域padding影响 */
  left: auto !important;
  right: 20px !important;
  /* 确保按钮不会受到transform等影响 */
  transform: none !important;
  /* 强制按钮相对于视口定位，不受父容器影响 */
  top: auto !important;
  bottom: 80px !important; /* 默认值，会被JavaScript动态覆盖 */
}

.writing-board-btn:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}

.writing-board-icon {
  font-size: 32px;
  color: #ffffff;
  font-weight: 300;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.light-theme .writing-board-btn {
  background: linear-gradient(135deg, #007aff 0%, #0051d5 100%);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

/* 写作板模态框 */
.writing-board-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.writing-board-modal {
  width: 100%;
  max-width: 600px;
  max-height: 70vh;
  background: rgba(26, 26, 26, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.light-theme .writing-board-modal {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

.writing-board-header {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0;
}

.light-theme .writing-board-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.writing-board-tab {
  flex: 1;
  padding: 16px 20px;
  text-align: center;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  cursor: pointer;
}

.writing-board-tab.active {
  border-bottom-color: #007aff;
}

.tab-text {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  transition: color 0.2s ease;
}

.writing-board-tab.active .tab-text {
  color: #007aff;
}

.light-theme .tab-text {
  color: rgba(0, 0, 0, 0.6);
}

.light-theme .writing-board-tab.active .tab-text {
  color: #007aff;
}

.writing-board-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  box-sizing: border-box;
  width: 100%;
}

.writing-board-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.writing-board-item {
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 12px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.writing-board-item:active {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(0.98);
}

.light-theme .writing-board-item {
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.light-theme .writing-board-item:active {
  background: rgba(0, 0, 0, 0.06);
}

.item-name {
  font-size: 16px;
  color: inherit;
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  width: 100%;
  box-sizing: border-box;
}

.item-desc {
  font-size: 13px;
  color: inherit;
  opacity: 0.6;
  display: block;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;
  width: 100%;
  box-sizing: border-box;
}

.writing-board-empty {
  padding: 40px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
}

.light-theme .writing-board-empty {
  color: rgba(0, 0, 0, 0.4);
}

/* 地图详情模态框 */
.map-detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.map-detail-modal {
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  background: rgba(26, 26, 26, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.light-theme .map-detail-modal {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.map-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .map-detail-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.map-detail-title {
  font-size: 18px;
  font-weight: 600;
  color: inherit;
}

.map-detail-close {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.map-detail-close:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(0.95);
}

.light-theme .map-detail-close {
  background: rgba(0, 0, 0, 0.1);
}

.light-theme .map-detail-close:active {
  background: rgba(0, 0, 0, 0.15);
}

.map-detail-close text {
  font-size: 14px;
  color: inherit;
}

.map-detail-content {
  flex: 1;
  padding: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  position: relative;
}

.map-info-section {
  width: 100%;
  margin-bottom: 16px;
}

.map-description {
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 12px;
}

.light-theme .map-description {
  background: rgba(0, 0, 0, 0.03);
}

.desc-label {
  font-size: 13px;
  color: inherit;
  opacity: 0.6;
  margin-right: 8px;
}

.desc-text {
  font-size: 14px;
  color: inherit;
  line-height: 1.5;
}

.map-stats {
  display: flex;
  gap: 16px;
  padding: 8px 0;
}

.stat-item {
  font-size: 13px;
  color: inherit;
  opacity: 0.7;
}

.map-preview-container {
  width: 100%;
  height: 400px;
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-preview-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.light-theme .map-preview-container {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.map-empty-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.light-theme .map-empty-hint {
  color: rgba(0, 0, 0, 0.5);
}

.lookup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  z-index: 1002;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lookup-modal {
  width: 82%;
  max-width: 520px;
  background: rgba(26, 26, 26, 0.95);
  border-radius: 16px;
  padding: 20px;
  box-sizing: border-box;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.light-theme .lookup-modal {
  background: rgba(255, 255, 255, 0.96);
}

.lookup-title {
  font-size: 16px;
  font-weight: 600;
  color: inherit;
  display: block;
  margin-bottom: 16px;
}

.lookup-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.lookup-btn {
  flex: 1;
  padding: 12px 0;
  border-radius: 12px;
  text-align: center;
  background: rgba(0, 122, 255, 0.15);
  border: 1px solid rgba(0, 122, 255, 0.35);
  color: #007aff;
  font-weight: 600;
}

.lookup-btn:active {
  transform: scale(0.98);
}

.lookup-cancel,
.lookup-close {
  margin-top: 8px;
  padding: 10px 0;
  text-align: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
}

.light-theme .lookup-cancel,
.light-theme .lookup-close {
  background: rgba(0, 0, 0, 0.06);
}

.lookup-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.lookup-name {
  font-size: 17px;
  font-weight: 700;
  color: inherit;
}

.lookup-desc {
  font-size: 14px;
  color: inherit;
  opacity: 0.8;
  line-height: 1.5;
}

.lookup-empty {
  padding: 12px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  margin-bottom: 10px;
}

.light-theme .lookup-empty {
  background: rgba(0, 0, 0, 0.04);
}

.lookup-loading {
  padding: 12px 0;
  text-align: center;
  color: inherit;
  opacity: 0.8;
}

.map-zoom-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.light-theme .map-zoom-controls {
  background: rgba(0, 0, 0, 0.05);
}

.zoom-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.zoom-btn:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(0.95);
}

.light-theme .zoom-btn {
  background: rgba(0, 0, 0, 0.1);
}

.light-theme .zoom-btn:active {
  background: rgba(0, 0, 0, 0.15);
}

.zoom-btn text {
  font-size: 18px;
  color: inherit;
  font-weight: 500;
}

.zoom-text {
  font-size: 14px;
  color: inherit;
  min-width: 50px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .toolbar-main {
    max-width: 50%;
  }

  .tool-label {
    display: none;
  }

  .tool-btn {
    width: 40px;
    height: 40px;
  }

  .action-btn .btn-text {
    display: none;
  }

  .nav-subtitle {
    display: none;
  }

  .writing-board-modal {
    max-height: 80vh;
  }

  .map-detail-modal {
    width: 95%;
    max-height: 90vh;
  }

  .map-preview-container {
    height: 300px;
    min-width: 400px;
    min-height: 300px;
  }
}

/* 全屏模式 */
.editor-main.fullscreen .title-section,
.editor-main.fullscreen .quick-info-bar {
  display: none;
}

.editor-main.fullscreen .nav-header {
  background: transparent;
  border-bottom: none;
}

.editor-main.fullscreen .content-section {
  padding: 0;
}

.editor-main.fullscreen .editor-wrapper {
  height: 100vh;
  border-radius: 0;
  border: none;
  background: transparent;
}

.editor-main.fullscreen .content-editor {
  min-height: 100vh;
  padding: 40px 20px;
}

/* 主题切换动画 */
.page-container * {
  transition: background-color 0.3s ease, color 0.3s ease,
    border-color 0.3s ease;
}
</style>

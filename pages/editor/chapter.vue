<template>
  <view class="page-container" :class="{ 'light-theme': !localDarkMode }">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 顶部导航栏 - 深色固定主题 -->
    <view
      class="top-bar"
      :class="{ show: currentState !== 'A' }"
    >
      <view class="nav-bar">
        <!-- A槽位：编辑/完成切换 (占2字符) -->
        <view class="slot slot-a" @tap="handleSlotA">
          <text class="slot-text">{{ currentState === 'C' ? '完成' : '编辑' }}</text>
        </view>

        <!-- B槽位：保存 (占2字符) - 只在C状态显示 -->
        <view v-if="currentState === 'C'" class="slot slot-b" @tap="handleSlotB">
          <text class="slot-text">保存</text>
        </view>

        <!-- C槽位：留白 -->
        <view class="slot slot-spacer"></view>

        <!-- D槽位：留白 -->
        <view class="slot slot-spacer flex-1"></view>

        <!-- E槽位：图标 (占1字符) - 只在C状态显示 -->
        <view v-if="currentState === 'C'" class="slot slot-icon" @tap="handleSlotE">
          <image class="slot-icon-img" src="/static/icons/E.png" mode="aspectFit" />
        </view>

        <!-- F槽位：图标 (占1字符) -->
        <view class="slot slot-icon" @tap="handleSlotF">
          <image class="slot-icon-img" src="/static/icons/F.png" mode="aspectFit" />
        </view>

        <!-- G槽位：图标 (占1字符) -->
        <view class="slot slot-icon" @tap="handleSlotG">
          <image class="slot-icon-img" src="/static/icons/G.png" mode="aspectFit" />
        </view>
      </view>
    </view>

    <!-- 主内容区域 -->
    <view
      class="content-area"
      :class="{
        'with-top-bar': currentState !== 'A',
        'with-bottom-bar': currentState === 'B',
        'with-expanded-bar': currentState === 'C',
        'panel-open': showNestedListPanel || showGlossaryPanel
      }"
      @tap="readMode === 'page' ? null : handleContentTap"
    >
      <!-- 章节标题 -->
      <view class="chapter-header">
        <text class="chapter-title" v-if="currentState !== 'C'">{{ chapterTitle }}</text>
        <input
          v-else
          class="chapter-title-input"
          v-model="chapterTitle"
          placeholder="章节标题"
          :maxlength="50"
        />
        <text class="chapter-meta" v-if="currentState !== 'C'">
          {{ workTitle }} · {{ wordCount }}字
        </text>
      </view>

      <!-- 内容区域 -->
      <!-- 下拉式阅读模式 / 编辑模式 -->
      <scroll-view
        v-if="readMode === 'scroll' || currentState === 'C'"
        class="content-scroll"
        :scroll-y="currentState !== 'C'"
        :scroll-top="scrollTopValue"
        @scroll="onScroll"
        @tap="handleContentTap"
      >
        <!-- 只读模式 -->
        <view v-if="currentState !== 'C'" id="content-text-view" class="content-text" :style="textStyle">
          {{ formattedContent || '暂无内容...' }}
        </view>

        <!-- 编辑模式 -->
        <textarea
          v-else
          ref="editorRef"
          class="content-editor"
          :style="textStyle"
          v-model="editContent"
          placeholder="开始写作..."
          :maxlength="-1"
          :auto-height="true"
          :adjust-position="false"
          :cursor-spacing="0"
          :cursor="editorCursorPosition"
          :selection-start="editorCursorPosition"
          :selection-end="editorCursorPosition"
          :focus="editorFocused"
          :confirm-hold="true"
          @input="onContentInput"
          @focus="onEditorFocus"
          @blur="onEditorBlur"
          @keyboardheightchange="onKeyboardHeightChange"
        />

        <!-- 键盘弹出时的底部占位 -->
        <view
          v-if="currentState === 'C' && keyboardHeight > 0"
          class="keyboard-spacer"
          :style="{ height: keyboardHeight + 'px' }"
        ></view>
      </scroll-view>

      <!-- 翻页式阅读模式 -->
      <view v-else class="content-page-wrapper">
        <view
          v-for="(page, index) in currentPages"
          :key="index"
          class="page-view"
          :class="{
            'page-slide-left': pageTransition === 'next' && index === currentPageIndex,
            'page-slide-right': pageTransition === 'prev' && index === currentPageIndex,
            'page-active': index === currentPageIndex
          }"
          v-show="index === currentPageIndex"
        >
          <scroll-view class="page-scroll" scroll-y>
            <view class="page-content">
              <!-- 只有第一页显示标题 -->
              <view v-if="index === 0" class="page-header">
                <text class="page-chapter-title">{{ chapterTitle }}</text>
                <text class="page-chapter-meta">{{ workTitle }} · {{ wordCount }}字</text>
              </view>
              <text class="page-text" :style="textStyle">{{ page }}</text>
            </view>
          </scroll-view>
        </view>

        <!-- 翻页模式点击区域覆盖层 -->
        <view v-if="currentState !== 'C'" class="page-touch-overlay">
          <view class="touch-zone touch-zone-left" @tap.stop="handlePagePrev"></view>
          <view class="touch-zone touch-zone-center" @tap.stop="handleContentTap"></view>
          <view class="touch-zone touch-zone-right" @tap.stop="handlePageNext"></view>
        </view>
      </view>

      <!-- 翻页指示器 -->
      <view v-if="readMode === 'page' && currentState !== 'C'" class="page-indicator">
        <text class="page-indicator-text">{{ currentPageIndex + 1 }} / {{ currentPages.length }}</text>
      </view>
    </view>

    <!-- 底部工具栏 - 深色固定主题 -->
    <view
      class="bottom-bar"
      :class="{
        show: currentState === 'B' || currentState === 'C',
        expanded: currentState === 'C',
        'with-keyboard': currentState === 'C' && keyboardHeight > 0
      }"
      :style="bottomBarStyle"
    >
      <!-- B状态：基础工具栏 - 7槽位布局 -->
      <view v-if="currentState === 'B'" class="bottom-bar-content">
        <!-- H槽位：适应手机 -->
        <view class="tool-slot" @tap="handleToolTap('adapt')">
          <view class="tool-icon-wrapper" :class="{ 'tool-active': activeTool === 'adapt' }">
            <image class="tool-icon" src="/static/icons/adapt.png" mode="aspectFit" />
          </view>
          <text class="tool-label" :class="{ 'tool-active-text': activeTool === 'adapt' }">适应手机</text>
        </view>

        <!-- I槽位：留白 -->
        <view class="tool-slot tool-spacer"></view>

        <!-- J槽位：阅读模式 -->
        <view class="tool-slot" @tap="handleToolTap('read')">
          <view class="tool-icon-wrapper" :class="{ 'tool-active': activeTool === 'read' }">
            <image class="tool-icon" src="/static/icons/read.png" mode="aspectFit" />
          </view>
          <text class="tool-label" :class="{ 'tool-active-text': activeTool === 'read' }">阅读模式</text>
        </view>

        <!-- K槽位：留白 -->
        <view class="tool-slot tool-spacer"></view>

        <!-- L槽位：导出文档 -->
        <view class="tool-slot" @tap="handleToolTap('export')">
          <view class="tool-icon-wrapper" :class="{ 'tool-active': activeTool === 'export' }">
            <image class="tool-icon" src="/static/icons/export.png" mode="aspectFit" />
          </view>
          <text class="tool-label" :class="{ 'tool-active-text': activeTool === 'export' }">导出文档</text>
        </view>

        <!-- M槽位：留白 -->
        <view class="tool-slot tool-spacer"></view>

        <!-- N槽位：主题切换 -->
        <view class="tool-slot" @tap="handleToolTap('theme')">
          <view class="tool-icon-wrapper" :class="{ 'tool-active': activeTool === 'theme' }">
            <image class="tool-icon" :src="localDarkMode ? '/static/icons/light.png' : '/static/icons/dark.png'" mode="aspectFit" />
          </view>
          <text class="tool-label" :class="{ 'tool-active-text': activeTool === 'theme' }">{{ localDarkMode ? '浅色模式' : '深色模式' }}</text>
        </view>
      </view>

      <!-- C状态：扩展工具栏 -->
      <view v-if="currentState === 'C'" class="bottom-bar-expanded">
        <text class="word-count">{{ wordCount }} 字</text>
        <view class="tool-icons">
          <view class="icon-tool" @tap="handleToolTap('indent')">
            <text class="icon-text">⇥</text>
          </view>
          <view class="icon-tool" @tap="handleToolTap('writing-board')">
            <text class="icon-text">+</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Snackbar 提示 -->
    <view class="snackbar" :class="{ show: showSnackbar }">
      <text class="snackbar-text">{{ snackbarText }}</text>
    </view>

    <!-- 浮动操作按钮 FAB - 仅B状态显示 -->
    <view
      v-if="currentState === 'B'"
      class="fab"
      @tap="enterEditMode"
    >
      <text class="fab-icon">✎</text>
    </view>
    
    <!-- 功能E：多级列表面板 -->
    <NestedListPanel
      ref="nestedListPanelRef"
      :is-visible="showNestedListPanel"
      :work-id="workId"
      :chapter-id="chapterId"
      :status-bar-height="statusBarHeight"
      @close="showNestedListPanel = false"
    />
    
    <!-- 功能G：词库面板 -->
    <GlossaryPanel
      ref="glossaryPanelRef"
      :is-visible="showGlossaryPanel"
      :work-id="workId"
      :chapter-id="chapterId"
      :status-bar-height="statusBarHeight"
      @close="showGlossaryPanel = false"
      @before-insert="handleBeforeInsert"
      @insert-text="handleInsertText"
    />
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import FileSystemStorage from '@/utils/fileSystemStorage.js';
import themeManager, { isDarkMode as getIsDarkMode } from '@/utils/themeManager.js';
import NestedListPanel from '@/components/chapter/NestedListPanel.vue';
import GlossaryPanel from '@/components/chapter/GlossaryPanel.vue';

const fileStorage = FileSystemStorage;

// ============ 字体样式管理 ============
// 字体大小配置（单位：px）
const fontSize = ref(19); // 默认四号字约19px
// 行距配置（倍数）
const lineHeight = ref(1.8); // 默认1.5倍行距

// 计算实际行高（用于样式绑定）
const computedLineHeight = computed(() => {
  return `${lineHeight.value}`;
});

// 字体样式对象（用于动态绑定）
const textStyle = computed(() => {
  return {
    fontSize: `${fontSize.value}px`,
    lineHeight: computedLineHeight.value,
    fontFamily: "'CustomSongTi', 'SimSun', '宋体', serif"
  };
});

// ============ 状态管理 ============
// 当前状态：A-纯阅读，B-工具栏模式，C-编辑模式
const currentState = ref('A');

// 功能E滑出框状态 - 只在C状态可用
const showNestedListPanel = ref(false);

// 功能G滑出框状态 - 只在C状态可用
const showGlossaryPanel = ref(false);

// NestedListPanel 组件引用
const nestedListPanelRef = ref(null);

// GlossaryPanel 组件引用
const glossaryPanelRef = ref(null);

// 编辑器引用
const editorRef = ref(null);

// 编辑器光标位置
const editorCursorPosition = ref(0);

// 主题
const isDarkMode = ref(getIsDarkMode());

// 局部主题（仅影响内容区域）
const localDarkMode = ref(true); // 默认深色

// 工具栏激活状态
const activeTool = ref('');

// 阅读模式：scroll-下拉式，page-翻页式
const readMode = ref('scroll');

// 分页相关
const currentPages = ref([]); // 分页内容数组
const currentPageIndex = ref(0); // 当前页码

// 翻页动画
const pageTransition = ref(''); // 'prev' | 'next' | ''

// 作品和章节信息
const workId = ref('');
const chapterId = ref('');
const userId = ref('');
const workTitle = ref('加载中...');
const chapterTitle = ref('');
const chapterContent = ref('');

// 编辑相关
const editContent = ref('');
const originalContent = ref('');
const wordCount = ref(0);

// 撤销/重做栈
const undoStack = ref([]);
const redoStack = ref([]);
const canUndo = computed(() => undoStack.value.length > 0);
const canRedo = computed(() => redoStack.value.length > 0);

// 键盘高度
const keyboardHeight = ref(0);

// 状态栏高度
const statusBarHeight = ref(20);

// 屏幕高度
const screenHeight = ref(800);

// Snackbar
const showSnackbar = ref(false);
const snackbarText = ref('');

// ============ 计算属性 ============
const formattedContent = computed(() => {
  if (!chapterContent.value) return '';
  // 简单的段落格式化
  const lines = chapterContent.value.split('\n');
  return lines.map(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('　　')) {
      return '　　' + trimmed;
    }
    return line;
  }).join('\n');
});

// 底部工具栏样式 - 键盘弹出时跟随
const bottomBarStyle = computed(() => {
  if (currentState.value === 'C' && keyboardHeight.value > 0) {
    return {
      bottom: keyboardHeight.value + 'px',
      transition: 'bottom 0.2s ease-out'
    };
  }
  return {
    bottom: '0px'
  };
});

// 滚动位置控制
const scrollTopValue = ref(0);

// ============ 状态切换方法 ============

// A → B：点击内容区域
const handleContentTap = () => {
  if (currentState.value === 'A') {
    currentState.value = 'B';
    showSnackbarMessage('点击编辑按钮开始写作');
  } else if (currentState.value === 'B') {
    // B → A：再次点击内容区域
    currentState.value = 'A';
  }
};

// B → C：进入编辑模式
const enterEditMode = () => {
  if (currentState.value !== 'B') return;

  // 标记为正在初始化，跳过自动缩进处理
  isApplyingIndent = true;

  currentState.value = 'C';
  editContent.value = chapterContent.value;
  originalContent.value = chapterContent.value;
  undoStack.value = [];
  redoStack.value = [];
  
  // 初始化光标位置
  editorCursorPosition.value = editContent.value.length;

  // 编辑模式强制使用下拉式
  readMode.value = 'scroll';

  // 延迟重置标记，确保watch不会触发自动缩进
  setTimeout(() => {
    isApplyingIndent = false;
  }, 100);

  nextTick(() => {
    // 自动聚焦输入框
    editorFocused.value = true;
    setTimeout(() => {
      editorFocused.value = false;
    }, 150);
  });
};

// C → B：退出编辑模式（保存）
const exitEditMode = async () => {
  if (currentState.value !== 'C') return;

  // 保存内容
  await saveChapter();

  currentState.value = 'B';
  chapterContent.value = editContent.value;
  keyboardHeight.value = 0;

  showSnackbarMessage('已保存');
};

// ============ 导航栏槽位事件 ============

// A槽位：编辑/完成切换
const handleSlotA = () => {
  if (currentState.value === 'B') {
    enterEditMode();
  } else if (currentState.value === 'C') {
    exitEditMode();
  }
};

// B槽位：保存
const handleSlotB = async () => {
  if (currentState.value === 'C') {
    // 编辑模式下保存
    await saveChapter();
    chapterContent.value = editContent.value;
    showSnackbarMessage('已保存');
  } else {
    showSnackbarMessage('已保存');
  }
};

// E槽位：功能E - 多级列表面板
const handleSlotE = () => {
  if (currentState.value !== 'C') return;
  showNestedListPanel.value = !showNestedListPanel.value;
  // E和G互斥：打开E时关闭G
  if (showNestedListPanel.value) {
    showGlossaryPanel.value = false;
  }
};

// F槽位：功能F - 在B和C状态都可用
const handleSlotF = () => {
  showSnackbarMessage('功能F开发中');
};

// G槽位：功能G - 词库面板
const handleSlotG = () => {
  if (currentState.value !== 'C') return;
  
  // 如果即将打开面板，先记录当前光标位置
  if (!showGlossaryPanel.value) {
    // 尝试获取当前光标位置（通过textarea的selectionStart）
    const query = uni.createSelectorQuery().in(this);
    query.select('.content-editor').fields({
      context: true
    }, (res) => {
      if (res && res.context) {
        // 如果可能，获取光标位置
        try {
          const textarea = res.context;
          if (textarea.selectionStart !== undefined) {
            editorCursorPosition.value = textarea.selectionStart;
          }
        } catch (e) {
          // 如果无法获取，使用当前内容长度
          editorCursorPosition.value = editContent.value.length;
        }
      }
    }).exec();
  }
  
  showGlossaryPanel.value = !showGlossaryPanel.value;
  // E和G互斥：打开G时关闭E
  if (showGlossaryPanel.value) {
    showNestedListPanel.value = false;
  }
};

// 编辑器focus状态
const editorFocused = ref(false);

// 处理词库插入前的准备（记录光标位置）
const handleBeforeInsert = () => {
  // 尝试通过 selector query 获取 textarea 的光标位置
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const query = uni.createSelectorQuery().in(currentPage);
    query.select('.content-editor').fields({
      context: true,
      node: true
    }, (res) => {
      if (res && res.node) {
        // 微信小程序端可以通过节点获取
        const node = res.node;
        if (node.selectionStart !== undefined) {
          editorCursorPosition.value = node.selectionStart;
        }
      }
    }).exec();
  } catch (e) {
    // 获取失败时保持当前记录的位置
    console.log('获取光标位置失败，使用记录值:', editorCursorPosition.value);
  }
};

// 处理词库插入文本
const handleInsertText = (text) => {
  if (currentState.value !== 'C') return;
  
  // 标记为正在应用外部插入，跳过自动缩进处理
  isApplyingIndent = true;
  
  // 使用记录的光标位置（如果为0则可能是未初始化，使用末尾）
  let cursorPos = editorCursorPosition.value;
  if (!cursorPos || cursorPos <= 0) {
    cursorPos = editContent.value.length;
  }
  
  // 确保光标位置不超过内容长度
  if (cursorPos > editContent.value.length) {
    cursorPos = editContent.value.length;
  }
  
  const before = editContent.value.slice(0, cursorPos);
  const after = editContent.value.slice(cursorPos);
  editContent.value = before + text + after;
  
  // 更新字数（不包含缩进）
  wordCount.value = calculateWordCount(editContent.value);
  hasChanges.value = true;
  
  // 更新光标位置
  const newCursorPos = cursorPos + text.length;
  editorCursorPosition.value = newCursorPos;
  
  // 延迟重置标记
  setTimeout(() => {
    isApplyingIndent = false;
  }, 50);
  
  // 设置focus状态，触发编辑器聚焦
  nextTick(() => {
    editorFocused.value = true;
    // 150ms后重置，允许下次聚焦
    setTimeout(() => {
      editorFocused.value = false;
    }, 150);
  });
};

// ============ 编辑相关方法 ============

const onContentInput = (e) => {
  wordCount.value = calculateWordCount(editContent.value);
  hasChanges.value = true;
  // 记录光标位置（优先使用 detail.cursor，否则通过 target 获取）
  if (e && e.detail) {
    editorCursorPosition.value = e.detail.cursor ?? editContent.value.length;
  }
};

const onEditorFocus = (e) => {
  // 编辑器获得焦点时记录光标位置
  if (e && e.detail) {
    const pos = e.detail.cursor ?? e.detail.value?.length ?? editContent.value.length;
    editorCursorPosition.value = pos;
  }
};

const onEditorBlur = (e) => {
  // 编辑器失去焦点时记录光标位置
  // 优先使用 detail.cursor，如果没有则尝试其他方式
  if (e && e.detail) {
    editorCursorPosition.value = e.detail.cursor ?? editorCursorPosition.value;
  }
};

const onKeyboardHeightChange = (e) => {
  if (e && typeof e.height === 'number') {
    keyboardHeight.value = e.height;
  }
};

// 撤销
const handleUndo = () => {
  if (!canUndo.value) return;
  redoStack.value.push(editContent.value);
  editContent.value = undoStack.value.pop();
  wordCount.value = calculateWordCount(editContent.value);
};

// 重做
const handleRedo = () => {
  if (!canRedo.value) return;
  undoStack.value.push(editContent.value);
  editContent.value = redoStack.value.pop();
  wordCount.value = calculateWordCount(editContent.value);
};

// 保存更改标记
const hasChanges = ref(false);

// 标记是否正在处理自动缩进，防止循环
let isApplyingIndent = false;

// 计算字数（不包含缩进的全角空格）
const calculateWordCount = (content) => {
  if (!content) return 0;
  // 去掉所有缩进的全角空格后计算长度
  return content.replace(/　　/g, '').length;
};

// 监听内容变化，加入撤销栈
watch(editContent, (newVal, oldVal) => {
  if (isApplyingIndent) return; // 如果是自动缩进触发的变化，跳过
  
  if (oldVal !== undefined && newVal !== oldVal && currentState.value === 'C') {
    undoStack.value.push(oldVal);
    if (undoStack.value.length > 50) {
      undoStack.value.shift();
    }
    
    // 检测是否刚刚输入了换行符（行数增加且实际包含换行符）
    const oldLines = (oldVal || '').split('\n');
    const newLines = (newVal || '').split('\n');
    
    // 只有当行数增加且新内容包含实际的\n换行符时才触发（防止视觉软换行误触发）
    if (newLines.length > oldLines.length && newVal.includes('\n')) {
      // 延迟处理，确保textarea已完成更新
      setTimeout(() => {
        applyAutoIndentOnNewLine(oldLines, newLines);
      }, 10);
    }
  }
});

// 自动缩进新行（只处理因换行产生的新行和上一行）
const applyAutoIndentOnNewLine = (oldLines, newLines) => {
  isApplyingIndent = true;
  
  // 结果行数组
  const resultLines = [...newLines];
  let hasChanged = false;
  
  // 给旧行的最后一行（用户刚刚写完的那行）添加缩进
  const lastOldLineIndex = oldLines.length - 1;
  if (lastOldLineIndex >= 0) {
    const lastOldLine = oldLines[lastOldLineIndex];
    if (!lastOldLine.startsWith('　　')) {
      resultLines[lastOldLineIndex] = '　　' + lastOldLine;
      hasChanged = true;
    }
  }
  
  // 给所有新增的行添加缩进（从旧行长度开始到新高度的所有行）
  for (let i = oldLines.length; i < newLines.length; i++) {
    const line = newLines[i];
    // 如果当前行没有缩进，添加缩进（包括空行）
    if (!line.startsWith('　　')) {
      resultLines[i] = '　　' + line;
      hasChanged = true;
    }
  }
  
  if (hasChanged) {
    editContent.value = resultLines.join('\n');
    // 使用不含缩进的字数统计
    wordCount.value = calculateWordCount(editContent.value);
  }
  
  // 延迟重置标记
  setTimeout(() => {
    isApplyingIndent = false;
  }, 50);
};

// 监听状态变化，退出编辑模式时重新分页
watch(currentState, (newState, oldState) => {
  if (oldState === 'C' && newState !== 'C' && readMode.value === 'page') {
    calculatePages();
    currentPageIndex.value = 0;
  }
  // 退出C状态时关闭E和G面板
  if (newState !== 'C') {
    showNestedListPanel.value = false;
    showGlossaryPanel.value = false;
  }
});

// 监听章节内容变化，翻页模式下重新分页
watch(chapterContent, () => {
  if (readMode.value === 'page' && currentState.value !== 'C') {
    calculatePages();
  }
});

// ============ 工具栏方法 ============

const handleToolTap = (tool) => {
  // 设置激活状态
  activeTool.value = tool;

  // 300ms后清除激活状态
  setTimeout(() => {
    activeTool.value = '';
  }, 300);

  switch (tool) {
    case 'adapt':
      showSnackbarMessage('适应手机功能开发中');
      break;
    case 'read':
      toggleReadMode();
      break;
    case 'export':
      showSnackbarMessage('导出文档功能开发中');
      break;
    case 'theme':
      // 切换局部主题
      localDarkMode.value = !localDarkMode.value;
      showSnackbarMessage(localDarkMode.value ? '已切换到深色模式' : '已切换到浅色模式');
      break;
    case 'indent':
      // 自动缩进
      autoIndent();
      break;
    case 'writing-board':
      showSnackbarMessage('写作板开发中');
      break;
  }
};

// ============ 阅读模式相关 ============

// 切换阅读模式
const toggleReadMode = () => {
  // if (currentState.value === 'C') {
  //   // 编辑模式强制使用下拉式
  //   showSnackbarMessage('编辑模式下使用下拉式');
  //   return;
  // }

  // if (readMode.value === 'scroll') {
  //   // 下拉式 → 翻页式：计算分页并跳转到第一页
  //   calculatePages();
  //   readMode.value = 'page';
  //   currentPageIndex.value = 0;
  //   showSnackbarMessage('已切换到翻页模式');
  // } else {
  //   // 翻页式 → 下拉式：跳转到顶部
  //   readMode.value = 'scroll';
  //   scrollTopValue.value = 0;
  //   showSnackbarMessage('已切换到下拉模式');
  // }
  // 阅读模式功能维护中
  showSnackbarMessage('该功能维护中');
};

// 计算分页
const calculatePages = () => {
  // 获取原始内容并格式化
  let content = chapterContent.value || '';
  if (content) {
    const lines = content.split('\n');
    content = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('　　')) {
        return '　　' + trimmed;
      }
      return line;
    }).join('\n');
  } else {
    content = '暂无内容...';
    currentPages.value = [content];
    return;
  }

  // 每页固定23行单位
  const linesPerPage = 23;
  // 每行18个字
  const charsPerLine = 18;

  // 按段落分割（保留空段落用于间距）
  const paragraphs = content.split(/\n+/);

  // 分页：每页最多23行，段落可以跨页截断
  const pages = [];
  let currentPageLines = 0;
  let currentPageContent = '';

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];

    // 空段落处理（段落间距）
    if (!para.trim()) {
      if (currentPageContent && currentPageLines < linesPerPage) {
        currentPageLines += 1;
      }
      continue;
    }

    const paraLength = para.length;
    // 计算这个段落需要多少行
    const paraLines = Math.ceil(paraLength / charsPerLine);

    // 如果不是第一个段落，先加1行空白（段落间距）
    if (currentPageContent && currentPageLines < linesPerPage) {
      currentPageLines += 1;
    }

    // 计算当前页剩余可用行数
    const remainingLines = linesPerPage - currentPageLines;

    // 检查段落是否能完整放入当前页
    if (paraLines <= remainingLines) {
      // 可以完整放入
      currentPageContent += (currentPageContent ? '\n\n' : '') + para;
      currentPageLines += paraLines;
    } else {
      // 段落需要跨页截断
      // 当前页能放多少字
      const charsInCurrentPage = remainingLines * charsPerLine;

      if (charsInCurrentPage > 0) {
        // 截断段落，第一部分放入当前页
        currentPageContent += (currentPageContent ? '\n\n' : '') + para.substring(0, charsInCurrentPage);
        pages.push(currentPageContent);

        // 剩余部分放入下一页
        const remainingPara = para.substring(charsInCurrentPage);
        currentPageContent = remainingPara;
        currentPageLines = Math.ceil(remainingPara.length / charsPerLine);
      } else {
        // 当前页没有空间，整个段落放入新页
        if (currentPageContent) {
          pages.push(currentPageContent);
        }
        currentPageContent = para;
        currentPageLines = paraLines;
      }
    }
  }

  // 保存最后一页
  if (currentPageContent) {
    pages.push(currentPageContent);
  }

  // 最多100页
  if (pages.length > 100) {
    pages.length = 100;
  }

  currentPages.value = pages.length > 0 ? pages : [content];
};

// 上一页
const handlePagePrev = () => {
  if (currentPageIndex.value > 0) {
    pageTransition.value = 'prev';
    setTimeout(() => {
      currentPageIndex.value--;
      setTimeout(() => {
        pageTransition.value = '';
      }, 50);
    }, 150);
  }
};

// 下一页
const handlePageNext = () => {
  if (currentPageIndex.value < currentPages.value.length - 1) {
    pageTransition.value = 'next';
    setTimeout(() => {
      currentPageIndex.value++;
      setTimeout(() => {
        pageTransition.value = '';
      }, 50);
    }, 150);
  }
};

// 滚动事件
const onScroll = () => {
  // 滚动处理
};

const autoIndent = () => {
  if (currentState.value !== 'C') return;
  const lines = editContent.value.split('\n');
  const formatted = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('　　')) {
      return '　　' + trimmed;
    }
    return line;
  });
  editContent.value = formatted.join('\n');
  showSnackbarMessage('已自动缩进');
};

// ============ 数据加载与保存 ============

const loadChapterData = async () => {
  try {
    const workPath = fileStorage.getWorkPath(userId.value, workId.value);

    // 加载作品信息
    const workConfig = await fileStorage.readFile(`${workPath}/work.config.json`);
    if (workConfig) {
      workTitle.value = workConfig.title || '未知作品';
    }

    // 加载章节内容
    const chapterData = await fileStorage.readFile(`${workPath}/chapters/${chapterId.value}.json`);
    if (chapterData) {
      chapterTitle.value = chapterData.title || '未命名章节';
      chapterContent.value = chapterData.content || '';
      wordCount.value = chapterData.word_count || calculateWordCount(chapterContent.value);
    }
  } catch (error) {
    console.error('加载章节数据失败:', error);
    showSnackbarMessage('加载失败');
  }
};

const saveChapter = async () => {
  try {
    const workPath = fileStorage.getWorkPath(userId.value, workId.value);
    const chapterPath = `${workPath}/chapters/${chapterId.value}.json`;
    
    const updatedChapter = {
      id: chapterId.value,
      title: chapterTitle.value,
      content: editContent.value,
      word_count: wordCount.value,
      updated_at: new Date().toISOString()
    };
    
    await fileStorage.writeFile(chapterPath, updatedChapter);
    
    // 更新章节列表
    await updateChaptersList(updatedChapter);
  } catch (error) {
    console.error('保存章节失败:', error);
    showSnackbarMessage('保存失败');
  }
};

const updateChaptersList = async (updatedChapter) => {
  try {
    const workPath = fileStorage.getWorkPath(userId.value, workId.value);
    const chaptersPath = `${workPath}/chapters/chapters.json`;
    const chaptersList = await fileStorage.readFile(chaptersPath) || [];
    
    const index = chaptersList.findIndex(ch => ch.id === chapterId.value);
    if (index !== -1) {
      chaptersList[index] = {
        ...chaptersList[index],
        title: updatedChapter.title,
        word_count: updatedChapter.word_count,
        updated_at: updatedChapter.updated_at,
        content: ''
      };
      await fileStorage.writeFile(chaptersPath, chaptersList);
    }
  } catch (error) {
    console.error('更新章节列表失败:', error);
  }
};

// ============ 辅助方法 ============

const showSnackbarMessage = (message) => {
  snackbarText.value = message;
  showSnackbar.value = true;
  setTimeout(() => {
    showSnackbar.value = false;
  }, 2000);
};

// ============ 生命周期 ============

onLoad((options) => {
  // 加载自定义字体
  uni.loadFontFace({
    family: 'CustomSongTi',
    source: 'url("/static/fonts/SourceHanSerifSC-Regular.otf")',
    success: () => {
      console.log('字体加载成功');
    },
    fail: (err) => {
      console.error('字体加载失败:', err);
    }
  });

  // 初始化主题
  isDarkMode.value = themeManager.isDarkMode();

  // 监听主题变化
  try {
    uni.$on('theme-changed', (data) => {
      isDarkMode.value = data.isDark;
    });
  } catch (e) {
    console.warn('主题监听设置失败');
  }

  // 获取系统信息
  try {
    const systemInfo = uni.getSystemInfoSync();
    statusBarHeight.value = systemInfo.statusBarHeight || 20;
    // 获取屏幕高度用于计算
    screenHeight.value = systemInfo.screenHeight || 800;
  } catch (e) {
    console.warn('获取系统信息失败');
  }

  // 监听键盘高度变化
  uni.onKeyboardHeightChange((res) => {
    keyboardHeight.value = res.height;
  });

  // 获取页面参数
  if (!options?.workId || !options?.chapterId) {
    showSnackbarMessage('参数错误');
    setTimeout(() => uni.navigateBack(), 1000);
    return;
  }

  workId.value = options.workId;
  chapterId.value = options.chapterId;
  userId.value = options.userId || 'default_user';

  // 加载数据
  loadChapterData();
});

onUnload(() => {
  // 移除键盘监听
  uni.offKeyboardHeightChange();
});
</script>

<style scoped>
/* ============ 基础容器 ============ */
.page-container {
  min-height: 100vh;
  background: #1a1a1a;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  position: relative;
}

.light-theme {
  background: #fafafa;
  color: #333;
}

.status-bar {
  background: transparent;
}

/* ============ 顶部导航栏 - 深色固定主题 ============ */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  transform: translateY(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.top-bar.show {
  transform: translateY(0);
}

.nav-bar {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 12px;
  padding-top: var(--status-bar-height, 20px);
  background: #1e1e1e;
  border-bottom: 1px solid #333;
  /* 强制深色，不随主题变化 */
}

/* 槽位通用样式 */
.slot {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  color: #e0e0e0;
}

/* A槽位：编辑/完成切换 - 占2字符宽度 */
.slot-a {
  min-width: 64px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  margin-right: 8px;
}

.slot-a:active {
  background: rgba(255, 255, 255, 0.2);
}

/* B槽位：保存 - 占2份 */
.slot-b {
  min-width: 64px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  margin-right: 8px;
}

.slot-b:active {
  background: rgba(255, 255, 255, 0.2);
}

/* C、D槽位：留白 */
.slot-spacer {
  width: 8px;
}

.slot-spacer.flex-1 {
  flex: 1;
}

/* E、F、G槽位：图标 - 各占1字符宽度 */
.slot-icon {
  width: 40px;
  margin-left: 4px;
}

.slot-icon:active {
  opacity: 0.7;
}

.slot-icon-img {
  width: 24px;
  height: 24px;
}

.slot-text {
  font-size: 15px;
  font-weight: 500;
  color: #e0e0e0;
}

/* ============ 内容区域 ============ */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  position: relative;
  transition: padding-top 0.3s ease, padding-bottom 0.3s ease;
}

.content-area.with-top-bar {
  padding-top: 72px;
}

.content-area.with-bottom-bar {
  padding-bottom: 64px;
}

.content-area.with-expanded-bar {
  padding-bottom: 56px;
}

/* 滑块打开时，内容区域禁止滚动（防止穿透） */
.content-area.panel-open {
  overflow: hidden;
  touch-action: none;
}

.chapter-header {
  text-align: center;
  margin-bottom: 24px;
}

.chapter-title {
  font-size: 22px;
  font-weight: 700;
  color: inherit;
  display: block;
  margin-bottom: 8px;
}

.chapter-title-input {
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  background: transparent;
  border: none;
  border-bottom: 2px solid #007aff;
  color: inherit;
  width: 100%;
  padding: 8px;
}

.chapter-meta {
  font-size: 13px;
  color: inherit;
  opacity: 0.6;
}

.content-scroll {
  flex: 1;
}

.content-text {
  color: inherit;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* ============ 翻页式阅读模式 ============ */
.content-page-wrapper {
  flex: 1;
  position: relative;
  width: 100%;
  overflow: hidden;
}

.page-view {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

/* 下一页动画 - 当前页向左滑出 */
.page-slide-left {
  transform: translateX(-100%);
  opacity: 0;
}

/* 上一页动画 - 当前页向右滑出 */
.page-slide-right {
  transform: translateX(100%);
  opacity: 0;
}

.page-scroll {
  width: 100%;
  height: 100%;
}

.page-content {
  padding: 16px;
}

/* 翻页模式标题 - 只在第一页显示 */
.page-header {
  text-align: center;
  margin-bottom: 24px;
}

.page-chapter-title {
  font-size: 22px;
  font-weight: 700;
  color: inherit;
  display: block;
  margin-bottom: 8px;
}

.page-chapter-meta {
  font-size: 13px;
  color: inherit;
  opacity: 0.6;
}

.page-text {
  color: inherit;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 翻页模式点击区域 */
.page-touch-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  z-index: 10;
}

.touch-zone {
  flex: 1;
  height: 100%;
}

/* 左侧1/3：上一页 */
.touch-zone-left {
  cursor: pointer;
}

/* 中间1/3：切换状态 */
.touch-zone-center {
  cursor: pointer;
}

/* 右侧1/3：下一页 */
.touch-zone-right {
  cursor: pointer;
}

/* 翻页指示器 */
.page-indicator {
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  padding: 6px 16px;
  border-radius: 16px;
  z-index: 50;
}

.page-indicator-text {
  font-size: 12px;
  color: #fff;
}

.content-editor {
  width: 100%;
  min-height: 300px;
  background: transparent;
  color: inherit;
  border: none;
  outline: none;
  resize: none;
}

.keyboard-spacer {
  width: 100%;
}

/* ============ 底部工具栏 - 深色固定主题 ============ */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #1e1e1e;
  border-top: 1px solid #333;
  z-index: 100;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  /* 强制深色，不随主题变化 */
}

.bottom-bar.show {
  transform: translateY(0);
}

.bottom-bar.with-keyboard {
  /* 键盘弹出时的样式 */
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
}

/* B状态：基础工具栏 - 7槽位布局 */
.bottom-bar-content {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 72px;
  padding: 0 8px;
}

/* 工具槽位 */
.tool-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  max-width: 80px;
  padding: 6px 4px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.tool-slot:active {
  background: rgba(255, 255, 255, 0.1);
}

.tool-spacer {
  flex: 0.5;
  max-width: 20px;
  pointer-events: none;
}

/* 工具图标容器 */
.tool-icon-wrapper {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.tool-icon {
  width: 24px;
  height: 24px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

/* 激活状态 - 提高透明度 */
.tool-icon-wrapper.tool-active .tool-icon {
  opacity: 1;
}

/* 工具文字 */
.tool-label {
  font-size: 11px;
  color: #e0e0e0;
  text-align: center;
  white-space: nowrap;
  transition: color 0.2s ease;
}

/* 激活状态文字 - 蓝色 */
.tool-label.tool-active-text {
  color: #007aff;
}

/* C状态：扩展工具栏 */
.bottom-bar-expanded {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
  padding: 0 20px;
}

.word-count {
  font-size: 14px;
  color: inherit;
  opacity: 0.7;
}

.tool-icons {
  display: flex;
  gap: 16px;
}

.icon-tool {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 18px;
}

.light-theme .icon-tool {
  background: rgba(0, 0, 0, 0.05);
}

.icon-text {
  font-size: 18px;
  color: #007aff;
}

/* ============ FloatingActionButton ============ */
.fab {
  position: fixed;
  right: 20px;
  bottom: 80px;
  width: 56px;
  height: 56px;
  background: #007aff;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4);
  z-index: 99;
}

.fab:active {
  transform: scale(0.95);
}

.fab-icon {
  font-size: 24px;
  color: #fff;
}

/* ============ Snackbar ============ */
.snackbar {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: rgba(50, 50, 50, 0.95);
  padding: 12px 24px;
  border-radius: 8px;
  z-index: 200;
  opacity: 0;
  transition: all 0.3s ease;
}

.light-theme .snackbar {
  background: rgba(50, 50, 50, 0.9);
}

.snackbar.show {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.snackbar-text {
  color: #fff;
  font-size: 14px;
}
</style>

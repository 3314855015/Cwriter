<template>
  <view class="page-container" :class="{ 'light-theme': !isDarkMode }">



    <!-- 顶部工具栏 -->
    <view class="top-toolbar" 
          :class="{ 
            'show': showTopToolbar,
            'pinned': isToolbarPinned && showTopToolbar 
          }"
          :style="{ 
            position: (isToolbarPinned && showTopToolbar) ? 'fixed' : 'relative',
            top: (isToolbarPinned && showTopToolbar) ? '0' : 'auto',
            left: (isToolbarPinned && showTopToolbar) ? '0' : 'auto',
            right: (isToolbarPinned && showTopToolbar) ? '0' : 'auto',
            zIndex: (isToolbarPinned && showTopToolbar) ? 998 : 'auto'
          }">
      <view class="toolbar-left">
        <view class="toolbar-btn text-btn" @tap="toggleEditMode">
          <text class="btn-text" :class="{ 'save-text': hasChanges }">
            {{ isEditMode ? (hasChanges ? '保存' : '完成') : '编辑' }}
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
    <view class="content-wrapper" :class="{ 'edit-mode': isEditMode, 'has-toolbar-pinned': isToolbarPinned && showTopToolbar }">

      
      <!-- 只读内容区域 -->
      <scroll-view v-if="!isEditMode" 
                   class="content-container" 
                   @tap="toggleToolbars" 
                   scroll-y="true" 
                   @scroll="handleContentScroll" 
                   @scrolltoupper="onScrollToUpper"
                   :style="{ height: '100vh' }">
        <view class="chapter-header">
          <text class="chapter-title">{{ chapterInfo.title }}</text>
          <text class="chapter-meta">{{ workInfo.title }} · {{ wordCount }}字 · {{ formatTime(chapterInfo.updated_at) }}</text>
        </view>
        
        <view class="chapter-content">
          <view class="content-text">{{ formattedContent || '暂无内容...' }}</view>
        </view>
      </scroll-view>

      <!-- 编辑内容区域 -->
      <scroll-view v-else 
                   class="edit-container" 
                   @tap.stop 
                   scroll-y="true" 
                   @scroll="handleContentScroll" 
                   @scrolltoupper="onScrollToUpper"
                   :style="{ height: '100vh' }"
                   :scroll-top="scrollTop"
                   ref="editScrollViewRef">
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
        
        <view class="edit-content-section" :style="{ 'padding-bottom': (keyboardHeight + 300) + 'px' }">
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
          />
        </view>
      </scroll-view>
    </view>

    <!-- 底部工具栏 -->
    <view class="bottom-toolbar" :class="{ 'show': showBottomToolbar && !isEditMode }">
      <view class="toolbar-content">
        <view class="tool-item text-btn" @tap="openTools">
          <text class="btn-text">工具</text>
        </view>
        <view class="tool-item text-btn" @tap="adaptToPhone">
          <text class="btn-text">适应手机</text>
        </view>
        <view class="tool-item text-btn" @tap="shareChapter">
          <text class="btn-text">分享</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, nextTick, watch, computed } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import FileSystemStorage from "@/utils/fileSystemStorage.js";
import themeManager, { isDarkMode as getIsDarkMode } from '@/utils/themeManager.js';

const fileStorage = FileSystemStorage;

// 响应式数据
const currentTime = ref("");
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

// 滚动控制
const scrollTop = ref(0);

// 撤销重做栈
const undoStack = ref([]);
const redoStack = ref([]);

// 编辑器状态控制
const isEditorFocused = ref(false);
const showQuickMenu = ref(false);
const isFullscreen = ref(false);
const isScrolled = ref(false);
const isToolbarHidden = ref(false);

// 计算属性
const formattedContent = computed(() => {
  return formatContentIndent(chapterContent.value);
});

let clockTimer = null;
let hideToolbarTimer = null;
let autoSaveTimer = null;

// 滚动监听
const handleContentScroll = (e) => {
  const scrollTop = e.detail.scrollTop;
  const threshold = 44; // 工具栏高度
  
  // 只要工具栏显示且滚动超过阈值，就启用固定模式
  if (showTopToolbar.value && scrollTop > threshold && !isToolbarPinned.value) {
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
  
  nextTick(() => {
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
  const lines = currentContent.split('\n');
  
  // 为新段落添加缩进
  const formattedLines = lines.map((line, index) => {
    const trimmedLine = line.trim();
    // 如果当前行不为空且没有缩进，添加缩进
    if (trimmedLine && !trimmedLine.startsWith('　　') && !trimmedLine.startsWith('  ') && index > 0) {
      // 检查前一行是否以换行符结束（确保是新段落）
      const prevLine = lines[index - 1] || '';
      if (prevLine.trim() !== '') {
        return '　　' + trimmedLine;
      }
    }
    return line;
  });
  
  // 检查是否需要更新内容（避免循环触发）
  const formattedContent = formattedLines.join('\n');
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

const onInputFocus = (e) => {
  // 监听键盘高度变化
  uni.onKeyboardHeightChange((res) => {
    keyboardHeight.value = res.height || 0;
    
    // 键盘弹出时，主要通过大量的padding-bottom来推高内容到屏幕上部
    // 同时也进行适度的光标滚动作为补充
    if (res.height > 0) {
      setTimeout(() => {
        scrollToCursor();
      }, 300);
    }
  });
};

const onInputBlur = (e) => {
  // 失去焦点时重置键盘高度
  keyboardHeight.value = 0;
  uni.offKeyboardHeightChange();
  
  // 确保所有段落都有正确的缩进
  const currentContent = editContent.value;
  const formattedContent = formatContentIndent(currentContent);
  
  if (formattedContent !== currentContent) {
    editContent.value = formattedContent;
  }
};

// 滚动到光标位置
const scrollToCursor = () => {
  if (!contentRef.value) return;
  
  // 使用 uni.createSelectorQuery 获取编辑器位置
  const query = uni.createSelectorQuery();
  query.select('.edit-content-input').boundingClientRect();
  query.selectViewport().scrollOffset();
  query.exec((res) => {
    if (res && res[0] && res[1]) {
      const inputRect = res[0];
      const viewport = res[1];
      const keyboardH = keyboardHeight.value;
      
      // 计算编辑器底部位置
      const inputBottom = inputRect.bottom;
      const viewportHeight = uni.getSystemInfoSync().windowHeight;
      const availableHeight = viewportHeight - keyboardH;
      
      // 如果编辑器底部被键盘遮挡，滚动视图
      if (inputBottom > availableHeight) {
        const scrollDistance = inputBottom - availableHeight + 50; // 额外50px的边距，确保完全可见
        scrollTop.value = viewport.scrollTop + scrollDistance;
      }
    }
  });
};

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
  uni.showActionSheet({
    itemList: ['复制章节', '导出为文本', '章节统计', '删除章节'],
    success: (res) => {
      switch(res.tapIndex) {
        case 0: copyChapter(); break;
        case 1: exportChapter(); break;
        case 2: showChapterStats(); break;
        case 3: deleteChapter(); break;
      }
    }
  });
};

const openTools = () => {
  uni.showActionSheet({
    itemList: ['查找替换', '插入模板', '格式设置', '历史版本'],
    success: (res) => {
      // TODO: 实现工具功能
    }
  });
};

const adaptToPhone = () => {
  uni.showModal({
    title: '阅读设置',
    content: '调整字体大小和间距以适应手机阅读',
    showCancel: true,
    success: (res) => {
      if (res.confirm) {
        // TODO: 实现阅读设置
      }
    }
  });
};

const shareChapter = () => {
  uni.share({
    provider: 'weixin',
    scene: 'WXSceneSession',
    type: 0,
    href: '',
    title: chapterInfo.value.title,
    summary: `来自《${workInfo.value.title}》`,
    imageUrl: '',
    success: () => {
      uni.showToast({
        title: '分享成功',
        icon: 'success'
      });
    },
    fail: () => {
      uni.showToast({
        title: '分享失败',
        icon: 'error'
      });
    }
  });
};

const copyChapter = () => {
  uni.setClipboardData({
    data: chapterContent.value,
    success: () => {
      uni.showToast({
        title: '已复制到剪贴板',
        icon: 'success'
      });
    }
  });
};

const exportChapter = () => {
  // TODO: 实现导出功能
  uni.showToast({
    title: '导出功能开发中',
    icon: 'none'
  });
};

const showChapterStats = () => {
  const stats = `字数统计：${wordCount.value}字
段落数：${chapterContent.value.split('').length}段
更新时间：${formatTime(chapterInfo.updated_at)}`;
  
  uni.showModal({
    title: '章节统计',
    content: stats,
    showCancel: false
  });
};

const deleteChapter = () => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除"${chapterInfo.value.title}"吗？此操作不可撤销。`,
    success: (res) => {
      if (res.confirm) {
        // TODO: 实现删除功能
        uni.showToast({
          title: '删除功能开发中',
          icon: 'none'
        });
      }
    }
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
  isDarkMode.value = themeManager.isDarkMode()
  
  // 监听主题变更事件
  try {
    if (typeof uni !== 'undefined' && uni.$on) {
      uni.$on('theme-changed', (themeData) => {
        isDarkMode.value = themeData.isDark
      })
    }
  } catch (error) {
    console.warn('主题监听器设置失败:', error)
  }

  chapterId.value = options.chapterId;
  userId.value = options.userId || "default_user";

  await loadChapterData();

  updateTime();
  clockTimer = setInterval(updateTime, 60000);
  autoSaveTimer = setInterval(() => {
    if (chapterContent.value.trim() && !isSaving.value) {
      autoSave();
    }
  }, 30000);
});

onUnload(() => {
  clearTimers();
});

// 方法
const updateTime = () => {
  const now = new Date();
  currentTime.value = `${now.getHours()}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

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
    dialogue: '「 」',
    description: '这里是一段详细的场景描写，环境氛围的渲染。',
    action: '角色做出了某个动作，推动了情节发展。',
    psychology: '内心独白：角色的想法和感受。'
  };
  
  const template = templates[type];
  if (!template || !editorRef.value) return;
  
  const cursorPosition = chapterContent.value.length;
  const newContent = chapterContent.value + '' + template + '';
  
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
    bold: '**粗体文本**',
    italic: '*斜体文本*',
    underline: '__下划线文本__'
  };
  
  const formatString = formats[format];
  if (formatString && editorRef.value) {
    chapterContent.value += formatString;
    wordCount.value = chapterContent.value.length;
  }
};

const insertLineBreak = () => {
  chapterContent.value += '';
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
  if (!timestamp) return '未知时间';
  
  try {
    const now = new Date();
    const time = new Date(timestamp);
    
    if (isNaN(time.getTime())) {
      return '未知时间';
    }
    
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
    
    return time.toLocaleDateString();
  } catch (error) {
    return '未知时间';
  }
};

const formatContentIndent = (content) => {
  if (!content) return content;
  
  // 将文本按换行符分割成段落
  const lines = content.split('\n');
  const formattedLines = lines.map(line => {
    const trimmedLine = line.trim();
    // 如果行不为空，添加缩进（使用两个中文字符宽度）
    if (trimmedLine && !trimmedLine.startsWith('　　') && !trimmedLine.startsWith('  ')) {
      return '　　' + trimmedLine; // 使用两个全角空格（中文字符宽度）
    }
    return line;
  });
  
  return formattedLines.join('\n');
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
  min-height: 100vh;
}

/* 当工具栏固定时，为内容留出空间 */
.content-wrapper.has-toolbar-pinned {
  padding-top: 44px;
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
  font-family: 'SimSun', '宋体', serif;
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
  font-family: 'SimSun', '宋体', serif;
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
  box-shadow: 
    0 -4px 20px rgba(0, 0, 0, 0.3),
    0 -2px 10px rgba(0, 0, 0, 0.2),
    0 -1px 5px rgba(0, 0, 0, 0.1);
  height: 44px;
  display: flex;
  align-items: center;
}

.light-theme .bottom-toolbar {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 
    0 -4px 20px rgba(0, 0, 0, 0.15),
    0 -2px 10px rgba(0, 0, 0, 0.1),
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
  font-family: 'SimSun', '宋体', serif;
  /* 编辑器标题：宋体三号字，高度50px避免文字遮挡 */
}

.light-theme .edit-title-input {
  border-bottom: 2px solid rgba(0, 0, 0, 0.2);
  font-family: 'SimSun', '宋体', serif;
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
  font-family: 'SimSun', '宋体', serif;
  padding: 0;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
  /* 编辑器内容：宋体四号字，行高1.8使一行约20字，使用JavaScript处理缩进 */
}

.edit-content-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.light-theme .edit-content-input::placeholder {
  color: rgba(0, 0, 0, 0.4);
}

.light-theme .edit-content-input {
  font-family: 'SimSun', '宋体', serif;
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
    font-family: 'SimSun', '宋体', serif;
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
    font-family: 'SimSun', '宋体', serif;
    height: 40px;
    padding: 8px 0;
    /* 移动端标题高度40px，避免文字遮挡 */
  }
  
  .edit-content-input {
    font-size: 16px;
    min-height: 300px;
    line-height: 1.8;
    font-family: 'SimSun', '宋体', serif;
    padding: 0;
    /* 移动端编辑器：使用JavaScript处理缩进 */
  }
}

/* 主题切换动画 */
.page-container * {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
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
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
</style>

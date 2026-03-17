<template>
  <view class="import-panel" :class="{ 'light-theme': !isDarkMode }">
    <!-- 样式选择栏 -->
    <StyleSelector v-model="styleConfig" :is-dark-mode="isDarkMode" />

    <!-- 文件选择器 -->
    <view class="file-selector">
      <view class="file-display" @tap="selectFile">
        <view class="file-info">
          <text class="file-icon">📄</text>
          <text class="file-name">{{ selectedFileName || '点击选择要导入的文件' }}</text>
        </view>
        <text class="file-arrow">›</text>
      </view>
    </view>

    <!-- 预览区域 -->
    <scroll-view class="preview-area" scroll-y>
      <view class="preview-content" v-if="previewData">
        <!-- 书名 -->
        <view class="preview-book-title">
          <text class="book-title-text">{{ previewData.title || '未命名作品' }}</text>
        </view>

        <!-- 简介 -->
        <view class="preview-description" v-if="previewData.description">
          <text class="description-text">{{ previewData.description }}</text>
        </view>

        <!-- 章节列表 -->
        <view class="preview-chapters">
          <view class="chapters-header">
            <text class="chapters-label">章节结构预览</text>
            <text class="chapters-count">{{ previewData.chapters?.length || 0 }} 章</text>
          </view>
          
          <view 
            v-for="(chapter, index) in previewData.chapters" 
            :key="index"
            class="chapter-item"
          >
            <text class="chapter-number">{{ index + 1 }}</text>
            <text class="chapter-title">{{ chapter.title || '未命名章节' }}</text>
            <text class="chapter-words">{{ formatWordCount(chapter.content?.length || 0) }}</text>
          </view>
        </view>
      </view>

      <!-- 加载中 -->
      <view class="preview-loading" v-else-if="isLoading">
        <text class="loading-text">{{ loadingText }}</text>
      </view>

      <!-- 空状态 -->
      <view class="preview-empty" v-else>
        <text class="empty-icon">📄</text>
        <text class="empty-text">请选择要导入的文件</text>
        <text class="empty-hint">支持 DOCX 格式</text>
      </view>
    </scroll-view>

    <!-- 底部操作 -->
    <view class="panel-actions">
      <view 
        class="action-btn primary" 
        :class="{ disabled: !canImport }"
        @tap="handleImport"
      >
        <text class="btn-text">{{ isImporting ? '导入中...' : '开始导入' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import StyleSelector from './StyleSelector.vue';

const props = defineProps({
  userId: {
    type: String,
    default: ''
  },
  isDarkMode: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['import-success', 'import-error']);

// 样式配置
const styleConfig = ref({
  bookTitle: { font: '宋体', size: 22, bold: true },
  volumeTitle: { font: '宋体', size: 18, bold: true },
  chapterTitle: { font: '宋体', size: 16, bold: true },
  content: { font: '宋体', size: 14, bold: false },
  format: 'pdf',
  includeDescription: true,
  splitVolume: true
});

// 状态
const selectedFileName = ref('');
const selectedFilePath = ref('');
const previewData = ref(null);
const isLoading = ref(false);
const loadingText = ref('');
const isImporting = ref(false);

// 计算属性
const canImport = computed(() => {
  return selectedFilePath.value && !isImporting.value && previewData.value;
});

// 选择文件
const selectFile = () => {
  // #ifdef APP-PLUS
  uni.showActionSheet({
    itemList: ['文件管理器选择', '手动输入路径'],
    success: (res) => {
      if (res.tapIndex === 0) {
        selectFileWithPicker();
      } else {
        selectFileManually();
      }
    }
  });
  // #endif

  // #ifndef APP-PLUS
  uni.showToast({
    title: '请在APP中使用',
    icon: 'none'
  });
  // #endif
};

// 文件管理器选择
const selectFileWithPicker = () => {
  try {
    uni.chooseFile({
      count: 1,
      type: 'file',
      extension: ['.docx', '.DOCX'],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          const file = res.tempFiles[0];
          selectedFileName.value = file.name;
          selectedFilePath.value = file.path || file.uri;
          parseFile();
        }
      },
      fail: () => {
        setTimeout(selectFileManually, 500);
      }
    });
  } catch (error) {
    selectFileManually();
  }
};

// 手动输入路径
const selectFileManually = () => {
  uni.showModal({
    title: '选择DOCX文件',
    editable: true,
    placeholderText: '请输入文件路径',
    content: selectedFilePath.value || '',
    success: (res) => {
      if (res.confirm && res.content) {
        const path = res.content.trim();
        if (!path.toLowerCase().endsWith('.docx')) {
          uni.showToast({ title: '请选择DOCX文件', icon: 'none' });
          return;
        }
        selectedFilePath.value = path;
        selectedFileName.value = path.split('/').pop();
        parseFile();
      }
    }
  });
};

// 解析文件
const parseFile = async () => {
  if (!selectedFilePath.value) return;
  
  isLoading.value = true;
  loadingText.value = '解析文件中...';
  
  try {
    // TODO: 调用原生插件解析
    // 模拟数据
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    previewData.value = {
      title: '示例作品',
      description: '这是一段简介...',
      chapters: [
        { title: '第一章 开端', content: '正文内容...' },
        { title: '第二章 发展', content: '正文内容...' },
        { title: '第三章 高潮', content: '正文内容...' }
      ]
    };
    
    loadingText.value = '';
  } catch (error) {
    console.error('解析失败:', error);
    uni.showToast({ title: '解析失败', icon: 'error' });
  } finally {
    isLoading.value = false;
  }
};

// 执行导入
const handleImport = async () => {
  if (!canImport.value) return;
  
  isImporting.value = true;
  loadingText.value = '导入中...';
  
  try {
    // TODO: 调用原生插件导入
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    uni.showToast({ title: '导入成功', icon: 'success' });
    emit('import-success', previewData.value);
    
    // 重置
    selectedFileName.value = '';
    selectedFilePath.value = '';
    previewData.value = null;
  } catch (error) {
    console.error('导入失败:', error);
    uni.showToast({ title: '导入失败', icon: 'error' });
    emit('import-error', error);
  } finally {
    isImporting.value = false;
    loadingText.value = '';
  }
};

// 格式化字数
const formatWordCount = (count) => {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万字';
  }
  return count + '字';
};
</script>

<style scoped>
.import-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
}

.light-theme.import-panel {
  background: #ffffff;
}

/* 文件选择器 */
.file-selector {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.light-theme .file-selector {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.file-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255, 107, 53, 0.1);
  border: 1px dashed rgba(255, 107, 53, 0.3);
  border-radius: 8px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.file-icon {
  font-size: 20px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #ff6b35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-arrow {
  font-size: 18px;
  color: #ff6b35;
}

/* 预览区域 */
.preview-area {
  flex: 1;
  padding: 12px;
  background: #1a1a1a;
}

.light-theme .preview-area {
  background: #ffffff;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-book-title {
  text-align: center;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.light-theme .preview-book-title {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.book-title-text {
  font-size: 20px;
  font-weight: 700;
  color: #ff6b35;
}

.preview-description {
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.light-theme .preview-description {
  background: rgba(0, 0, 0, 0.02);
}

.description-text {
  font-size: 13px;
  color: #b3b3b3;
  line-height: 1.6;
}

.light-theme .description-text {
  color: #666666;
}

.preview-chapters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chapters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.chapters-label {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.light-theme .chapters-label {
  color: #333333;
}

.chapters-count {
  font-size: 12px;
  color: #ff6b35;
  background: rgba(255, 107, 53, 0.2);
  padding: 4px 10px;
  border-radius: 12px;
}

.chapter-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  gap: 12px;
}

.light-theme .chapter-item {
  background: rgba(0, 0, 0, 0.02);
}

.chapter-number {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background: rgba(255, 107, 53, 0.2);
  color: #ff6b35;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chapter-title {
  flex: 1;
  font-size: 14px;
  color: #ffffff;
}

.light-theme .chapter-title {
  color: #333333;
}

.chapter-words {
  font-size: 11px;
  color: #888888;
}

/* 加载状态 */
.preview-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.loading-text {
  font-size: 14px;
  color: #ff6b35;
}

/* 空状态 */
.preview-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 8px;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  color: #888888;
}

.empty-hint {
  font-size: 12px;
  color: #666666;
}

/* 底部操作 */
.panel-actions {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.light-theme .panel-actions {
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.action-btn {
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn.primary {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.action-btn.primary:active {
  transform: scale(0.98);
}

.action-btn.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.btn-text {
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
}
</style>

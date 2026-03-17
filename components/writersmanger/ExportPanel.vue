<template>
  <view class="export-panel" :class="{ 'light-theme': !isDarkMode }">
    <!-- 样式选择栏 -->
    <StyleSelector v-model="styleConfig" :is-dark-mode="isDarkMode" />

    <!-- 作品选择器 -->
    <view class="work-selector">
      <view class="selector-header">
        <text class="selector-label">选择作品</text>
        <text class="selector-hint">{{ selectedWork ? selectedWork.title : '请选择' }}</text>
      </view>
      <view class="work-display" @tap="showWorkPicker">
        <text class="work-name">{{ selectedWork?.title || '点击选择要导出的作品' }}</text>
        <text class="work-arrow">›</text>
      </view>
    </view>

    <!-- 路径选择器 -->
    <view class="path-selector">
      <view class="selector-header">
        <text class="selector-label">导出路径</text>
      </view>
      <view class="path-display" @tap="selectPath">
        <text class="path-text">{{ exportPath || '点击选择保存路径' }}</text>
        <text class="path-icon">📁</text>
      </view>
    </view>

    <!-- 预览区域 - PDF图片预览 -->
    <scroll-view class="preview-area" scroll-y>
      <view class="preview-content" v-if="previewImage">
        <!-- PDF预览图片 -->
        <view class="pdf-preview">
          <image 
            class="preview-image" 
            :src="previewImage" 
            mode="widthFix"
          />
          <view class="preview-overlay">
            <text class="preview-hint">预览效果</text>
          </view>
        </view>
        
        <!-- 导出信息 -->
        <view class="export-info">
          <view class="info-row">
            <text class="info-label">格式</text>
            <text class="info-value">{{ styleConfig.format.toUpperCase() }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">章节数</text>
            <text class="info-value">{{ chapterCount }} 章</text>
          </view>
          <view class="info-row">
            <text class="info-label">预估字数</text>
            <text class="info-value">{{ formatWordCount(estimatedWords) }}</text>
          </view>
        </view>
      </view>

      <!-- 加载中 -->
      <view class="preview-loading" v-else-if="isLoading">
        <text class="loading-text">{{ loadingText }}</text>
      </view>

      <!-- 空状态 -->
      <view class="preview-empty" v-else>
        <text class="empty-icon">📑</text>
        <text class="empty-text">选择作品后预览效果</text>
        <text class="empty-hint">将生成{{ styleConfig.format.toUpperCase() }}预览</text>
      </view>
    </scroll-view>

    <!-- 底部操作 -->
    <view class="panel-actions">
      <view 
        class="action-btn primary" 
        :class="{ disabled: !canExport }"
        @tap="handleExport"
      >
        <text class="btn-text">{{ isExporting ? '导出中...' : '开始导出' }}</text>
      </view>
    </view>

    <!-- 作品选择弹窗 -->
    <view class="work-picker-overlay" v-if="showWorkPickerFlag" @tap="showWorkPickerFlag = false">
      <view class="work-picker-modal" @tap.stop>
        <view class="picker-header">
          <text class="picker-title">选择作品</text>
        </view>
        <scroll-view scroll-y class="picker-scroll">
          <view 
            v-for="work in works" 
            :key="work.id"
            class="work-option"
            :class="{ selected: selectedWork?.id === work.id }"
            @tap="selectWork(work)"
          >
            <view class="work-option-info">
              <text class="work-option-title">{{ work.title }}</text>
              <text class="work-option-meta">{{ work.chapterCount }}章 · {{ formatWordCount(work.wordCount) }}</text>
            </view>
            <view class="work-option-check" v-if="selectedWork?.id === work.id">
              <text class="check-icon">✓</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import StyleSelector from './StyleSelector.vue';
import FileSystemStorage from '@/utils/fileSystemStorage.js';
import { OfflineAuthService } from '@/utils/offlineAuth.js';

const fileStorage = FileSystemStorage;

const props = defineProps({
  userId: {
    type: String,
    default: ''
  },
  initialWorkId: {
    type: String,
    default: ''
  },
  isDarkMode: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['export-success', 'export-error']);

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
const works = ref([]);
const selectedWork = ref(null);
const exportPath = ref('');
const previewImage = ref('');
const isLoading = ref(false);
const loadingText = ref('');
const isExporting = ref(false);
const showWorkPickerFlag = ref(false);
const currentUser = ref(null);

// 计算属性
const canExport = computed(() => {
  return selectedWork.value && exportPath.value && !isExporting.value;
});

const chapterCount = computed(() => {
  return selectedWork.value?.chapterCount || 0;
});

const estimatedWords = computed(() => {
  return selectedWork.value?.wordCount || 0;
});

// 加载作品列表
const loadWorks = async () => {
  if (!currentUser.value?.id) return;
  
  try {
    const userWorks = await fileStorage.getUserWorks(currentUser.value.id);
    works.value = userWorks.map(work => ({
      id: work.id,
      title: work.title || '未命名作品',
      chapterCount: work.chapter_count || 0,
      wordCount: work.word_count || 0,
      local_file_path: work.local_file_path
    }));

    // 如果有初始作品ID，自动选中
    if (props.initialWorkId) {
      const found = works.value.find(w => w.id === props.initialWorkId);
      if (found) {
        selectWork(found);
      }
    } else if (works.value.length > 0) {
      // 默认选中第一个
      selectWork(works.value[0]);
    }
  } catch (error) {
    console.error('加载作品列表失败:', error);
  }
};

// 选择作品
const selectWork = (work) => {
  selectedWork.value = work;
  showWorkPickerFlag.value = false;
  
  // 更新导出路径
  updateExportPath();
  
  // 生成预览
  generatePreview();
};

// 更新导出路径
const updateExportPath = () => {
  if (selectedWork.value) {
    const ext = styleConfig.value.format;
    const fileName = `${selectedWork.value.title}.${ext}`;
    exportPath.value = `_downloads/${fileName}`;
  }
};

// 选择路径
const selectPath = () => {
  uni.showActionSheet({
    itemList: ['使用默认路径', '自定义路径'],
    success: (res) => {
      if (res.tapIndex === 0) {
        updateExportPath();
        uni.showToast({ title: '已使用默认路径', icon: 'success' });
      } else {
        uni.showModal({
          title: '自定义路径',
          editable: true,
          placeholderText: '请输入文件路径',
          content: exportPath.value,
          success: (modalRes) => {
            if (modalRes.confirm && modalRes.content) {
              exportPath.value = modalRes.content.trim();
            }
          }
        });
      }
    }
  });
};

// 生成预览
const generatePreview = async () => {
  if (!selectedWork.value) return;
  
  isLoading.value = true;
  loadingText.value = '生成预览中...';
  
  try {
    // TODO: 调用原生插件生成PDF预览图
    // 模拟预览
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 使用占位图
    previewImage.value = '/static/images/pdf-preview-placeholder.png';
    
    loadingText.value = '';
  } catch (error) {
    console.error('生成预览失败:', error);
  } finally {
    isLoading.value = false;
  }
};

// 执行导出
const handleExport = async () => {
  if (!canExport.value) return;
  
  isExporting.value = true;
  loadingText.value = '导出中...';
  
  try {
    // TODO: 调用原生插件导出
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    uni.showToast({ title: '导出成功', icon: 'success' });
    emit('export-success', {
      workId: selectedWork.value.id,
      path: exportPath.value,
      format: styleConfig.value.format
    });
    
    // 询问是否打开文件
    uni.showModal({
      title: '导出成功',
      content: `文件已保存到：\n${exportPath.value}\n\n是否打开文件位置？`,
      confirmText: '打开',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          // TODO: 打开文件管理器
        }
      }
    });
  } catch (error) {
    console.error('导出失败:', error);
    uni.showToast({ title: '导出失败', icon: 'error' });
    emit('export-error', error);
  } finally {
    isExporting.value = false;
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

// 监听格式变化
watch(() => styleConfig.value.format, () => {
  updateExportPath();
  if (selectedWork.value) {
    generatePreview();
  }
});

// 初始化
onMounted(async () => {
  try {
    currentUser.value = await OfflineAuthService.getCurrentUser();
    if (!currentUser.value?.id) {
      currentUser.value = { id: 'default_user', username: '离线用户' };
    }
  } catch (error) {
    currentUser.value = { id: 'default_user', username: '离线用户' };
  }
  
  await loadWorks();
});
</script>

<style scoped>
.export-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
}

.light-theme.export-panel {
  background: #ffffff;
}

/* 作品选择器 */
.work-selector {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.light-theme .work-selector {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.selector-label {
  font-size: 12px;
  color: #ff6b35;
  font-weight: 600;
}

.selector-hint {
  font-size: 11px;
  color: #888888;
}

.work-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255, 107, 53, 0.1);
  border: 1px solid rgba(255, 107, 53, 0.2);
  border-radius: 8px;
}

.work-name {
  flex: 1;
  font-size: 14px;
  color: #ff6b35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-arrow {
  font-size: 18px;
  color: #ff6b35;
}

/* 路径选择器 */
.path-selector {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.light-theme .path-selector {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.path-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.light-theme .path-display {
  background: rgba(0, 0, 0, 0.02);
}

.path-text {
  flex: 1;
  font-size: 13px;
  color: #b3b3b3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.light-theme .path-text {
  color: #666666;
}

.path-icon {
  font-size: 16px;
  margin-left: 8px;
}

/* 预览区域 */
.preview-area {
  flex: 1;
  padding: 12px;
  background: #1a1a1a;
  width: 100%;
}

.light-theme .preview-area {
  background: #ffffff;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pdf-preview {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.light-theme .pdf-preview {
  background: rgba(0, 0, 0, 0.02);
}

.preview-image {
  width: 100%;
  min-height: 200px;
}

.preview-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
}

.preview-hint {
  font-size: 12px;
  color: #ffffff;
  text-align: center;
  display: block;
}

.export-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  width: 100%;
}

.light-theme .export-info {
  background: rgba(0, 0, 0, 0.02);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 13px;
  color: #888888;
}

.info-value {
  font-size: 13px;
  color: #ffffff;
  font-weight: 500;
}

.light-theme .info-value {
  color: #333333;
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

/* 作品选择弹窗 */
.work-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 300;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.work-picker-modal {
  width: 100%;
  max-height: 60vh;
  background: #2a2a2a;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
}

.light-theme .work-picker-modal {
  background: #ffffff;
}

.picker-header {
  padding: 16px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .picker-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.picker-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.light-theme .picker-title {
  color: #333333;
}

.picker-scroll {
  flex: 1;
  max-height: 40vh;
}

.work-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.light-theme .work-option {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.work-option.selected {
  background: rgba(255, 107, 53, 0.1);
}

.work-option-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.work-option-title {
  font-size: 15px;
  color: #ffffff;
}

.light-theme .work-option-title {
  color: #333333;
}

.work-option.selected .work-option-title {
  color: #ff6b35;
}

.work-option-meta {
  font-size: 12px;
  color: #888888;
}

.work-option-check {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon {
  font-size: 16px;
  color: #ff6b35;
}
</style>

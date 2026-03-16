<template>
  <!-- 遮罩层 -->
  <view 
    v-if="isVisible" 
    class="catalog-mask" 
    @tap="closePanel"
    :class="{ 'show': isVisible }"
  ></view>
  

  <!-- 目录栏面板 -->
  <view 
    class="catalog-panel" 
    :class="{ 'show': isVisible }"
    @tap.stop
  >
    <!-- 状态栏占位 -->
    <view class="status-bar-placeholder" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <!-- 标题栏 -->
    <view class="catalog-header">
      <text class="catalog-title">目录</text>
    </view>

    <!-- 功能区域 -->
    <view class="catalog-content">
      <!-- 索引栏 -->
      <view class="index-column">
        <view class="index-item book-name" :class="{ 'active': false }">
          <text class="index-text">{{ workTitle }}</text>
        </view>
        <scroll-view scroll-y class="index-scroll">
          <view 
            v-for="(volume, index) in volumes" 
            :key="volume.id"
            class="index-item"
            :class="{ 'active': activeVolumeId === volume.id }"
            @tap="scrollToVolume(volume.id)"
          >
            <text class="index-text">{{ volume.name || volume.title || '未命名卷' }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 滚动栏 -->
      <scroll-view 
        scroll-y 
        class="content-column"
        :scroll-into-view="scrollIntoView"
        scroll-with-animation
      >
        <!-- 书名 -->
        <view class="content-section book-section">
          <text class="book-title-text">{{ workTitle }}</text>
        </view>

        <!-- 卷和章节列表 -->
        <view 
          v-for="volume in volumes" 
          :key="volume.id"
          :id="'volume-' + volume.id"
          class="volume-section"
        >
          <!-- 卷名 -->
          <view class="volume-header">
            <text class="volume-title-text">{{ volume.name || volume.title || '未命名卷' }}</text>
          </view>

          <!-- 卷内章节 -->
          <view 
            v-for="(chapter, cIndex) in volume.chapters" 
            :key="chapter.id"
            class="chapter-item"
            @tap="openChapter(chapter, volume.id)"
          >
            <text class="chapter-title-text">第{{ getChapterNumber(volume, cIndex) }}章 {{ chapter.title || '未命名章节' }}</text>
            <view class="chapter-meta">
              <text class="chapter-words">{{ chapter.word_count || 0 }}字</text>
              <view 
                class="chapter-status"
                :class="{ 'completed': chapter.is_completed }"
              >
                <text>{{ chapter.is_completed ? '已完成' : '写作中' }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import FileSystemStorage from '@/utils/fileSystemStorage.js';

const fileStorage = FileSystemStorage;

// Props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  workId: {
    type: String,
    default: ''
  },
  userId: {
    type: String,
    default: ''
  },
  workTitle: {
    type: String,
    default: '未命名作品'
  }
});

// Emits
const emit = defineEmits(['close', 'open-chapter']);

// 状态栏高度
const statusBarHeight = ref(0);

// 当前激活的卷ID
const activeVolumeId = ref(null);

// 滚动到的目标元素ID
const scrollIntoView = ref('');

// 卷数据
const volumesData = ref([]);

// 加载卷数据
const loadVolumesData = async () => {
  if (!props.workId || !props.userId) {
    return;
  }

  try {
    // 获取所有卷
    const volumes = await fileStorage.getVolumes(props.userId, props.workId);
    
    // 为每个卷加载章节
    const volumesWithChapters = await Promise.all(
      volumes.map(async (volume) => {
        const chapters = await fileStorage.getChaptersByVolume(
          props.userId,
          props.workId,
          volume.id
        );
        return {
          ...volume,
          chapters: chapters
        };
      })
    );

    volumesData.value = volumesWithChapters;

    // 设置默认激活卷
    if (volumesWithChapters.length > 0) {
      activeVolumeId.value = volumesWithChapters[0].id;
    }
  } catch (error) {
    console.error('加载卷数据失败:', error);
    volumesData.value = [];
  }
};

// 计算卷结构
const volumes = computed(() => {
  return volumesData.value;
});

// 计算章节编号（全局连续编号）
const getChapterNumber = (volume, chapterIndex) => {
  let num = 1;
  
  // 找到当前卷在列表中的位置
  for (const v of volumesData.value) {
    if (v.id === volume.id) {
      // 当前卷，加上章节在卷内的索引
      return num + chapterIndex;
    }
    // 还没到当前卷，累加前面卷的章节数
    num += (v.chapters?.length || 0);
  }
  
  return num + chapterIndex;
};

// 滚动到指定卷
const scrollToVolume = (volumeId) => {
  activeVolumeId.value = volumeId;
  scrollIntoView.value = 'volume-' + volumeId;
};

// 打开章节
const openChapter = (chapter, volumeId) => {
  // 添加 volume_id 到章节数据
  emit('open-chapter', { ...chapter, volume_id: volumeId });
  closePanel();
};

// 关闭面板
const closePanel = () => {
  emit('close');
};

// 监听面板显示，加载数据
watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    loadVolumesData();
  }
});

// 组件挂载时加载数据
onMounted(() => {
  // 获取状态栏高度
  try {
    const systemInfo = uni.getSystemInfoSync();
    statusBarHeight.value = systemInfo.statusBarHeight || 0;
  } catch (error) {
    console.warn('获取状态栏高度失败:', error);
  }
  
  if (props.workId && props.userId) {
    loadVolumesData();
  }
});
</script>

<style scoped>
/* 遮罩层 */
.catalog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.catalog-mask.show {
  opacity: 1;
}

/* 目录栏面板 */
.catalog-panel {
  position: fixed;
  top: 0;
  left: 0;
  width: 66.67%; /* 屏幕的2/3 */
  height: 100vh;
  background: rgba(30, 30, 30, 0.98);
  z-index: 999;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
}

.light-theme .catalog-panel {
  background: rgba(255, 255, 255, 0.98);
}

.catalog-panel.show {
  transform: translateX(0);
}

/* 状态栏占位 */
.status-bar-placeholder {
  background: rgba(45, 45, 45, 0.9);
  flex-shrink: 0;
}

.light-theme .status-bar-placeholder {
  background: rgba(255, 255, 255, 0.9);
}

.light-theme .catalog-panel {
  background: rgba(255, 255, 255, 0.98);
}

.catalog-panel.show {
  transform: translateX(0);
}

/* 标题栏 */
.catalog-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(45, 45, 45, 0.9);
}

.light-theme .catalog-header {
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.catalog-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.light-theme .catalog-title {
  color: #333333;
}

/* 功能区域 */
.catalog-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 索引栏 */
.index-column {
  width: 33.33%; /* 目录滑块的1/3 */
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
}

.light-theme .index-column {
  border-right: 1px solid rgba(0, 0, 0, 0.1);
}

.index-scroll {
  flex: 1;
  overflow-y: auto;
}

.index-item {
  padding: 16px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
}

.light-theme .index-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.index-item.active {
  background: rgba(255, 107, 53, 0.1);
  border-left: 3px solid #ff6b35;
}

.index-item.book-name {
  background: rgba(255, 255, 255, 0.05);
}

.light-theme .index-item.book-name {
  background: rgba(0, 0, 0, 0.05);
}

.index-text {
  font-size: 14px;
  color: #b3b3b3;
  word-break: break-all;
}

.light-theme .index-text {
  color: #666666;
}

.index-item.active .index-text {
  color: #ff6b35;
  font-weight: 500;
}

.index-item.book-name .index-text {
  color: #ffffff;
  font-weight: 600;
}

.light-theme .index-item.book-name .index-text {
  color: #333333;
}

/* 滚动栏 */
.content-column {
  width: 66.67%; /* 目录滑块的2/3 */
  flex: 1;
  overflow-y: auto;
}

/* 书名区域 */
.book-section {
  padding: 20px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .book-section {
  background: rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.book-title-text {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
}

.light-theme .book-title-text {
  color: #333333;
}

/* 卷区域 */
.volume-section {
  border-bottom: 8px solid rgba(255, 255, 255, 0.05);
}

.light-theme .volume-section {
  border-bottom: 8px solid rgba(0, 0, 0, 0.05);
}

/* 卷名 */
.volume-header {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}

.light-theme .volume-header {
  background: rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.volume-title-text {
  font-size: 16px;
  font-weight: 600;
  color: #ff6b35;
}

.light-theme .volume-title-text {
  color: #ff6b35;
}

/* 章节项 */
.chapter-item {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
}

.light-theme .chapter-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.chapter-item:active {
  background: rgba(255, 255, 255, 0.05);
}

.light-theme .chapter-item:active {
  background: rgba(0, 0, 0, 0.05);
}

.chapter-title-text {
  font-size: 14px;
  color: #ffffff;
  display: block;
  margin-bottom: 6px;
}

.light-theme .chapter-title-text {
  color: #333333;
}

.chapter-meta {
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
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  background: #ff6b35;
  color: white;
}

.chapter-status.completed {
  background: #4ecdc4;
}

.chapter-status text {
  font-size: 10px;
}
</style>

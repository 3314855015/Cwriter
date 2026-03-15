<template>
  <!-- 伏笔侧边面板 - 使用绝对定位跟随内容滚动 -->
  <view class="foreshadowing-panel">
    <!-- 为每个段落渲染图标 -->
    <view
      v-for="(bounds, index) in sortedParagraphBounds"
      :key="index"
      class="icon-wrapper"
      :style="{ top: bounds.centerY + 'px' }"
      @tap="handleIconClick(bounds.index)"
    >
      <view
        class="icon-circle"
        :class="getIconClass(bounds.index)"
        :style="getIconStyle(bounds.index)"
      >
        <text class="icon-text" :style="getTextStyle(bounds.index)">
          {{ getIconText(bounds.index) }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, inject } from 'vue';

// ============ Props & Emits ============
const props = defineProps({
  paragraphBounds: {
    type: Array,
    default: () => []
  },
  foreshadowings: {
    type: Array,
    default: () => []
  },
  chapterId: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['icon-click']);

// 注入主题
const isDarkMode = inject('isDarkMode', true);

// ============ 计算属性 ============
const sortedParagraphBounds = computed(() => {
  return [...props.paragraphBounds].sort((a, b) => a.index - b.index);
});

// ============ 方法 ============

// 获取段落的伏笔统计
const getForeshadowingStats = (paragraphIndex) => {
  // 只统计在当前章节、当前段落创建的伏笔
  const createdHere = props.foreshadowings.filter(f => 
    f.chapterId === props.chapterId && 
    f.createdParagraphIndex === paragraphIndex
  );
  
  // 统计在当前章节、当前段落回收的伏笔
  const recycledHere = props.foreshadowings.filter(f => 
    f.status === 'RECYCLED' &&
    f.recycledChapterId === props.chapterId &&
    f.recycledParagraphIndex === paragraphIndex
  );
  
  return {
    pendingCount: createdHere.filter(f => f.status === 'PENDING').length,
    recycledCount: createdHere.filter(f => f.status === 'RECYCLED').length,
    recycledHereCount: recycledHere.length,
    totalCount: createdHere.length + recycledHere.length
  };
};

// 获取图标类名
const getIconClass = (paragraphIndex) => {
  const stats = getForeshadowingStats(paragraphIndex);
  if (stats.pendingCount > 0 && stats.recycledCount > 0) {
    return 'has-both';
  } else if (stats.pendingCount > 0) {
    return 'has-pending';
  } else if (stats.recycledCount > 0 || stats.recycledHereCount > 0) {
    return 'has-recycled';
  }
  return 'empty';
};

// 获取图标背景样式
const getIconStyle = (paragraphIndex) => {
  const stats = getForeshadowingStats(paragraphIndex);
  const dark = isDarkMode.value;
  
  if (stats.pendingCount > 0 && stats.recycledCount > 0) {
    return { backgroundColor: '#007aff' };
  } else if (stats.pendingCount > 0) {
    return { backgroundColor: dark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)' };
  } else if (stats.recycledCount > 0 || stats.recycledHereCount > 0) {
    return { backgroundColor: 'rgba(0, 122, 255, 0.5)' };
  }
  return { backgroundColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' };
};

// 获取文字样式
const getTextStyle = (paragraphIndex) => {
  const stats = getForeshadowingStats(paragraphIndex);
  const dark = isDarkMode.value;
  
  if (stats.pendingCount > 0 && stats.recycledCount > 0) {
    return { color: '#fff' };
  } else if (stats.recycledCount > 0 || stats.recycledHereCount > 0) {
    return { color: '#fff' };
  }
  return { color: dark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)' };
};

// 获取图标文字
const getIconText = (paragraphIndex) => {
  const stats = getForeshadowingStats(paragraphIndex);
  if (stats.totalCount === 0) {
    return '+';
  }
  return stats.totalCount.toString();
};

// 点击图标
const handleIconClick = (paragraphIndex) => {
  emit('icon-click', paragraphIndex);
};
</script>

<style scoped>
.foreshadowing-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 16px;
  pointer-events: none;
}

.icon-wrapper {
  position: absolute;
  right: 0;
  width: 16px;
  height: 16px;
  transform: translateY(-50%);
  pointer-events: auto;
}

.icon-circle {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-text {
  font-size: 9px;
  font-weight: bold;
}

.empty {
  opacity: 0.6;
}

.has-pending {
  opacity: 1;
}

.has-recycled {
  opacity: 1;
}

.has-both {
  opacity: 1;
}
</style>

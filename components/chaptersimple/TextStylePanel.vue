<template>
  <view v-if="isVisible" class="text-style-panel">
    <!-- 字符控制栏 -->
    <view class="style-control-row">
      <view class="slider-container">
        <slider 
          :value="tempFontSize" 
          min="8" 
          max="32" 
          step="1"
          block-size="20"
          activeColor="#007aff"
          backgroundColor="rgba(255,255,255,0.2)"
          @changing="onFontSizeChanging"
          @change="onFontSizeChange"
        />
      </view>
      <view class="number-input-container">
        <input 
          class="font-size-input"
          type="number"
          v-model="tempFontSize"
          :maxlength="2"
          @blur="onFontSizeInputBlur"
        />
        <text class="unit-label">px</text>
      </view>
    </view>

    <!-- 行距控制栏 -->
    <view class="style-control-row">
      <text class="control-label">行距</text>
      <view class="line-height-picker">
        <view 
          v-for="item in lineHeightOptions" 
          :key="item"
          class="line-height-option"
          :class="{ 'active': lineHeight === item }"
          @tap="selectLineHeight(item)"
        >
          {{ item.toFixed(1) }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue';

// Props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  fontSize: {
    type: Number,
    default: 16
  },
  lineHeight: {
    type: Number,
    default: 1.8
  }
});

// Emits
const emit = defineEmits(['update:fontSize', 'update:lineHeight']);

// 行距选项
const lineHeightOptions = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0];

// 临时字体大小（用于滑块拖动过程中的显示）
const tempFontSize = ref(props.fontSize);

// 监听外部 fontSize 变化
watch(() => props.fontSize, (newVal) => {
  tempFontSize.value = newVal;
});

// 滑块拖动过程中更新临时字体大小
const onFontSizeChanging = (e) => {
  tempFontSize.value = Math.round(e.detail.value);
};

// 滑块拖动结束，更新字体大小
const onFontSizeChange = (e) => {
  const size = Math.round(e.detail.value);
  tempFontSize.value = size;
  emit('update:fontSize', size);
};

// 数字输入框失焦，更新字体大小
const onFontSizeInputBlur = () => {
  let size = parseInt(tempFontSize.value);
  // 验证范围
  if (isNaN(size) || size < 8) {
    size = 8;
  } else if (size > 32) {
    size = 32;
  }
  tempFontSize.value = size;
  emit('update:fontSize', size);
};

// 选择行距
const selectLineHeight = (value) => {
  emit('update:lineHeight', value);
};
</script>

<style scoped>
/* ============ 文字样式面板 ============ */
.text-style-panel {
  background: rgba(30, 30, 30, 0.98);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 16px;
  animation: slideUp 0.3s ease;
}

.light-theme .text-style-panel {
  background: rgba(255, 255, 255, 0.98);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.style-control-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.style-control-row:last-child {
  margin-bottom: 0;
}

/* 字符控制栏 */
.slider-container {
  flex: 3;
  padding-right: 12px;
}

.slider-container slider {
  width: 100%;
}

.number-input-container {
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 4px 8px;
}

.light-theme .number-input-container {
  background: rgba(0, 0, 0, 0.05);
}

.font-size-input {
  width: 32px;
  font-size: 16px;
  color: #fff;
  text-align: center;
  background: transparent;
}

.light-theme .font-size-input {
  color: #333;
}

.unit-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.light-theme .unit-label {
  color: rgba(0, 0, 0, 0.5);
}

/* 行距控制栏 */
.control-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  width: 40px;
  flex-shrink: 0;
}

.light-theme .control-label {
  color: rgba(0, 0, 0, 0.7);
}

.line-height-picker {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: 8px;
}

.line-height-option {
  min-width: 40px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s ease;
}

.light-theme .line-height-option {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.6);
}

.line-height-option.active {
  background: #007aff;
  color: #fff;
}

.line-height-option:active {
  opacity: 0.7;
}
</style>

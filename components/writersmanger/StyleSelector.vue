<template>
  <view class="style-selector" :class="{ 'light-theme': !isDarkMode }">
    <!-- 样式选择区 (2/3) -->
    <view class="style-section">
      <text class="section-label">样式选择</text>
      <view class="style-options">
        <!-- 书名样式 -->
        <view class="style-row">
          <text class="style-name">书名</text>
          <view class="style-input-group">
            <input
              class="style-input font-input"
              :value="config.bookTitle.font"
              @input="updateFont('bookTitle', $event.detail.value)"
              placeholder="字体"
            />
            <input
              class="style-input size-input"
              :value="config.bookTitle.size"
              @input="updateSize('bookTitle', $event.detail.value)"
              type="number"
              placeholder="字号"
            />
            <view
              class="style-checkbox"
              :class="{ active: config.bookTitle.bold }"
              @click.stop="toggleBold('bookTitle')"
            >
              <text class="checkbox-text">B</text>
            </view>
          </view>
        </view>

        <!-- 卷名样式 -->
        <view class="style-row">
          <text class="style-name">卷名</text>
          <view class="style-input-group">
            <input
              class="style-input font-input"
              :value="config.volumeTitle.font"
              @input="updateFont('volumeTitle', $event.detail.value)"
              placeholder="字体"
            />
            <input
              class="style-input size-input"
              :value="config.volumeTitle.size"
              @input="updateSize('volumeTitle', $event.detail.value)"
              type="number"
              placeholder="字号"
            />
            <view
              class="style-checkbox"
              :class="{ active: config.volumeTitle.bold }"
              @click.stop="toggleBold('volumeTitle')"
            >
              <text class="checkbox-text">B</text>
            </view>
          </view>
        </view>

        <!-- 章名样式 -->
        <view class="style-row">
          <text class="style-name">章名</text>
          <view class="style-input-group">
            <input
              class="style-input font-input"
              :value="config.chapterTitle.font"
              @input="updateFont('chapterTitle', $event.detail.value)"
              placeholder="字体"
            />
            <input
              class="style-input size-input"
              :value="config.chapterTitle.size"
              @input="updateSize('chapterTitle', $event.detail.value)"
              type="number"
              placeholder="字号"
            />
            <view
              class="style-checkbox"
              :class="{ active: config.chapterTitle.bold }"
              @click.stop="toggleBold('chapterTitle')"
            >
              <text class="checkbox-text">B</text>
            </view>
          </view>
        </view>

        <!-- 正文样式 -->
        <view class="style-row">
          <text class="style-name">正文</text>
          <view class="style-input-group">
            <input
              class="style-input font-input"
              :value="config.content.font"
              @input="updateFont('content', $event.detail.value)"
              placeholder="字体"
            />
            <input
              class="style-input size-input"
              :value="config.content.size"
              @input="updateSize('content', $event.detail.value)"
              type="number"
              placeholder="字号"
            />
            <view
              class="style-checkbox disabled"
              :class="{ active: config.content.bold }"
            >
              <text class="checkbox-text">B</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 功能开关区 (1/3) -->
    <view class="switch-section">
      <text class="section-label">功能开关</text>
      <view class="switch-options">
        <!-- PDF/Word 开关 -->
        <view class="switch-row">
          <text class="switch-name">格式</text>
          <view class="switch-toggle">
            <view
              class="toggle-option"
              :class="{ active: config.format === 'pdf' }"
              @click.stop="setFormat('pdf')"
            >
              <text class="toggle-text">PDF</text>
            </view>
            <view
              class="toggle-option"
              :class="{ active: config.format === 'docx' }"
              @click.stop="setFormat('docx')"
            >
              <text class="toggle-text">Word</text>
            </view>
          </view>
        </view>

        <!-- 简介 开关 -->
        <view class="switch-row">
          <text class="switch-name">简介</text>
          <view class="switch-toggle">
            <view
              class="toggle-option"
              :class="{ active: config.includeDescription }"
              @click.stop="setDescription(true)"
            >
              <text class="toggle-text">有</text>
            </view>
            <view
              class="toggle-option"
              :class="{ active: !config.includeDescription }"
              @click.stop="setDescription(false)"
            >
              <text class="toggle-text">无</text>
            </view>
          </view>
        </view>

        <!-- 分卷 开关 -->
        <view class="switch-row">
          <text class="switch-name">分卷</text>
          <view class="switch-toggle">
            <view
              class="toggle-option"
              :class="{ active: config.splitVolume }"
              @click.stop="setSplitVolume(true)"
            >
              <text class="toggle-text">是</text>
            </view>
            <view
              class="toggle-option"
              :class="{ active: !config.splitVolume }"
              @click.stop="setSplitVolume(false)"
            >
              <text class="toggle-text">否</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      bookTitle: { font: '宋体', size: 22, bold: true },
      volumeTitle: { font: '宋体', size: 18, bold: true },
      chapterTitle: { font: '宋体', size: 16, bold: true },
      content: { font: '宋体', size: 14, bold: false },
      format: 'pdf',
      includeDescription: true,
      splitVolume: true
    })
  },
  isDarkMode: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:modelValue']);

// 直接使用 computed，避免 watch 循环
const config = computed(() => props.modelValue);

// 更新配置的方法
const updateConfig = (key, value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  });
};

const updateNestedConfig = (parent, key, value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [parent]: {
      ...props.modelValue[parent],
      [key]: value
    }
  });
};

// 事件处理方法
const toggleBold = (field) => {
  updateNestedConfig(field, 'bold', !config.value[field].bold);
};

const setFormat = (format) => {
  updateConfig('format', format);
};

const setDescription = (value) => {
  updateConfig('includeDescription', value);
};

const setSplitVolume = (value) => {
  updateConfig('splitVolume', value);
};

// 字体和字号更新
const updateFont = (field, value) => {
  updateNestedConfig(field, 'font', value);
};

const updateSize = (field, value) => {
  updateNestedConfig(field, 'size', Number(value) || 14);
};
</script>

<style scoped>
.style-selector {
  display: flex;
  padding: 12px;
  background: rgba(40, 40, 40, 1);
  gap: 12px;
}

.light-theme.style-selector {
  background: #ffffff;
}

/* 样式选择区 (2/3) */
.style-section {
  flex: 2;
  display: flex;
  flex-direction: column;
}

.section-label {
  font-size: 12px;
  color: #ff6b35;
  font-weight: 600;
  margin-bottom: 8px;
}

.style-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.style-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.style-name {
  font-size: 13px;
  color: #b3b3b3;
  width: 36px;
  flex-shrink: 0;
}

.light-theme .style-name {
  color: #666666;
}

.style-input-group {
  flex: 1;
  display: flex;
  gap: 6px;
}

.style-input {
  height: 28px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  font-size: 12px;
}

.light-theme .style-input {
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.03);
  color: #333333;
}

.font-input {
  flex: 1;
}

.size-input {
  width: 48px;
  text-align: center;
}

.style-checkbox {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.light-theme .style-checkbox {
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.03);
}

.style-checkbox.active {
  background: rgba(255, 107, 53, 0.2);
  border-color: #ff6b35;
}

.style-checkbox.disabled {
  opacity: 0.3;
  pointer-events: none;
}

.checkbox-text {
  font-size: 12px;
  font-weight: bold;
  color: #b3b3b3;
}

.style-checkbox.active .checkbox-text {
  color: #ff6b35;
}

/* 功能开关区 (1/3) */
.switch-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.switch-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.switch-name {
  font-size: 12px;
  color: #b3b3b3;
  width: 32px;
  flex-shrink: 0;
}

.light-theme .switch-name {
  color: #666666;
}

.switch-toggle {
  flex: 1;
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .switch-toggle {
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.toggle-option {
  flex: 1;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
}

.light-theme .toggle-option {
  background: rgba(0, 0, 0, 0.03);
}

.toggle-option.active {
  background: rgba(255, 107, 53, 0.2);
}

.toggle-text {
  font-size: 11px;
  color: #888888;
}

.toggle-option.active .toggle-text {
  color: #ff6b35;
  font-weight: 600;
}
</style>

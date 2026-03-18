<template>
  <!-- 创建章节模态框 -->
  <view class="modal-overlay" v-if="isVisible" @tap="handleClose">
    <view class="create-chapter-modal" @tap.stop>
      <view class="modal-header">
        <text class="modal-title">创建新章节</text>
      </view>
      <view class="modal-body">
        <!-- 章节标题输入 -->
        <view class="chapter-title-input-area">
          <input
            class="chapter-title-input"
            v-model="chapterTitle"
            placeholder="请输入章节标题"
            :maxlength="50"
            :focus="isVisible"
            @confirm="handleConfirm"
          />
          <text class="input-counter">{{ chapterTitle.length }}/50</text>
        </view>
      </view>
      <view class="modal-footer">
        <view class="modal-btn cancel" @tap="handleClose">
          <text class="btn-text">取消</text>
        </view>
        <view class="modal-btn confirm" :class="{ disabled: !chapterTitle.trim() }" @tap="handleConfirm">
          <text class="btn-text">创建</text>
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
  }
});

// Emits
const emit = defineEmits(['close', 'confirm']);

// 章节标题
const chapterTitle = ref('');

// 监听显示状态，显示时清空输入
watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    chapterTitle.value = '';
  }
});

// 关闭模态框
const handleClose = () => {
  emit('close');
};

// 确认创建
const handleConfirm = () => {
  const title = chapterTitle.value.trim();
  if (!title) {
    uni.showToast({ title: '请输入章节标题', icon: 'none' });
    return;
  }
  emit('confirm', title);
};
</script>

<style scoped>
/* 模态框遮罩层 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 创建章节模态框 */
.create-chapter-modal {
  width: 85%;
  max-width: 340px;
  background: #2a2a2a;
  border-radius: 16px;
  overflow: hidden;
}

.light-theme .create-chapter-modal {
  background: #ffffff;
}

/* 模态框头部 */
.modal-header {
  padding: 20px 20px 12px;
  text-align: center;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.light-theme .modal-title {
  color: #333333;
}

/* 模态框内容区 */
.modal-body {
  padding: 12px 20px 20px;
}

/* 章节标题输入区域 */
.chapter-title-input-area {
  position: relative;
}

.chapter-title-input {
  width: 100%;
  height: 44px;
  padding: 0 16px;
  padding-right: 50px;
  background: #1a1a1a;
  border: 1px solid #404040;
  border-radius: 8px;
  color: #ffffff;
  font-size: 16px;
  box-sizing: border-box;
}

.light-theme .chapter-title-input {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  color: #333333;
}

.input-counter {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #666666;
}

/* 模态框底部按钮 */
.modal-footer {
  display: flex;
  border-top: 1px solid #404040;
}

.light-theme .modal-footer {
  border-top: 1px solid #e0e0e0;
}

.modal-btn {
  flex: 1;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-btn.cancel .btn-text {
  color: #999999;
}

.modal-btn.confirm .btn-text {
  color: #ff6b35;
  font-weight: 500;
}

.modal-btn.disabled .btn-text {
  color: #666666;
}
</style>

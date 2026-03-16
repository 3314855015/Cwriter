<template>
  <view 
    class="custom-modal-overlay" 
    v-show="visible"
    @tap="handleOverlayTap"
    @touchmove.stop.prevent="preventMove"
  >
    <view 
      class="custom-modal-container" 
      :style="containerStyle"
      @tap.stop
      @touchmove.stop
    >
      <!-- 标题 -->
      <view v-if="title" class="modal-header">
        <text class="modal-title">{{ title }}</text>
      </view>

      <!-- 内容插槽 -->
      <view class="modal-body">
        <!-- 额外内容插槽（在输入框之前） -->
        <slot name="extra"></slot>
        <slot>
          <!-- 默认输入框 -->
          <view v-if="editable" class="input-wrapper">
            <input
              class="modal-input"
              v-model="inputValue"
              :placeholder="placeholder"
              :maxlength="maxlength"
              :focus="inputFocus"
              :type="inputType"
              :adjust-position="true"
              confirm-type="done"
              cursor-spacing="20"
              placeholder-class="input-placeholder"
              @confirm="handleConfirm"
              @focus="onFocus"
              @blur="onBlur"
            />
            <text v-if="showCounter" class="input-counter">{{ inputValue.length }}/{{ maxlength }}</text>
          </view>
          <text v-else class="modal-content-text">{{ content }}</text>
        </slot>
      </view>

      <!-- 按钮区域 -->
      <view class="modal-footer">
        <view 
          v-if="showCancel" 
          class="modal-btn cancel-btn" 
          @tap="handleCancel"
        >
          <text class="btn-text">{{ cancelText }}</text>
        </view>
        <view 
          class="modal-btn confirm-btn" 
          :class="{ disabled: confirmDisabled }"
          @tap="handleConfirm"
        >
          <text class="btn-text">{{ confirmText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'CustomModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    },
    content: {
      type: String,
      default: ''
    },
    editable: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: String,
      default: '请输入内容'
    },
    inputType: {
      type: String,
      default: 'text'
    },
    maxlength: {
      type: Number,
      default: 100
    },
    showCounter: {
      type: Boolean,
      default: false
    },
    showCancel: {
      type: Boolean,
      default: true
    },
    cancelText: {
      type: String,
      default: '取消'
    },
    confirmText: {
      type: String,
      default: '确定'
    },
    closeOnClickOverlay: {
      type: Boolean,
      default: true
    },
    customStyle: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      inputValue: '',
      inputFocus: false
    };
  },
  computed: {
    containerStyle() {
      return { ...this.customStyle };
    },
    confirmDisabled() {
      return this.editable && !this.inputValue.trim();
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.inputValue = '';
        this.$nextTick(() => {
          setTimeout(() => {
            this.inputFocus = true;
          }, 150);
        });
      } else {
        this.inputFocus = false;
      }
    }
  },
  methods: {
    preventMove() {},
    handleOverlayTap() {
      if (this.closeOnClickOverlay) this.handleCancel();
    },
    handleCancel() {
      this.inputFocus = false;
      this.$emit('cancel');
      this.$emit('update:visible', false);
    },
    handleConfirm() {
      if (this.confirmDisabled) return;
      this.inputFocus = false;
      const result = {
        confirm: true,
        content: this.editable ? this.inputValue : this.content
      };
      this.$emit('confirm', result);
      this.$emit('success', result);
      this.$emit('update:visible', false);
    },
    onFocus() {
      this.inputFocus = true;
    },
    onBlur() {
      this.inputFocus = false;
    },
    getValue() {
      return this.inputValue;
    },
    setValue(val) {
      this.inputValue = val;
    }
  }
};
</script>

<style scoped>
.custom-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.custom-modal-container {
  width: 85%;
  max-width: 320px;
  background: #2a2a2a;
  border-radius: 16px;
  overflow: hidden;
}

.modal-header {
  padding: 20px 20px 12px;
  text-align: center;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.modal-body {
  padding: 12px 20px 20px;
}

.modal-content-text {
  font-size: 15px;
  color: #b3b3b3;
  line-height: 1.6;
  text-align: center;
}

.input-wrapper {
  position: relative;
  padding-bottom: 16px;
}

.modal-input {
  width: 100%;
  height: 44px;
  padding: 0 16px;
  background: #1a1a1a;
  border: 1px solid #404040;
  border-radius: 8px;
  color: #ffffff;
  font-size: 16px;
  box-sizing: border-box;
}

.modal-input:focus {
  border-color: #ff6b35;
}

.input-placeholder {
  color: #666666;
}

.input-counter {
  position: absolute;
  right: 0;
  bottom: 0;
  font-size: 12px;
  color: #666666;
}

.modal-footer {
  display: flex;
  border-top: 1px solid #404040;
}

.modal-btn {
  flex: 1;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-btn:active {
  background: rgba(255, 255, 255, 0.05);
}

.cancel-btn {
  border-right: 1px solid #404040;
}

.cancel-btn .btn-text {
  color: #999999;
  font-size: 16px;
}

.confirm-btn .btn-text {
  color: #ff6b35;
  font-size: 16px;
  font-weight: 500;
}

.confirm-btn.disabled .btn-text {
  color: #666666;
}
</style>

<template>
  <view class="modal-mask" v-if="visible" @tap="closeModal">
    <view class="modal-container" @tap.stop>
      <!-- 弹窗头部 -->
      <view class="modal-header">
        <text class="modal-title">创建新作品</text>
        <button class="close-btn" @tap="closeModal">
          <text class="close-text">×</text>
        </button>
      </view>

      <!-- 表单内容 -->
      <view class="modal-content">
        <!-- 作品标题 -->
        <view class="form-group">
          <text class="form-label">作品标题 <text class="required">*</text></text>
        <textarea 
          class="form-input title-textarea" 
          v-model="workData.title" 
          placeholder="请输入作品标题"
          maxlength="100"
          auto-height
          :show-confirm-bar="false"
          :adjust-position="false"
        />
          <text class="char-count">{{ workData.title.length }}/100</text>
          <text class="field-error" v-if="showTitleError">请输入作品标题</text>
        </view>

        <!-- 结构类型 -->
        <view class="form-group">
          <text class="form-label">结构类型 <text class="required">*</text></text>
          <view class="radio-group">
            <view 
              v-for="structure in structureTypes" 
              :key="structure.value" 
              class="radio-item"
              :class="{ active: workData.structure_type === structure.value }"
              @tap="workData.structure_type = structure.value"
            >
              <text class="radio-text">{{ structure.label }}</text>
            </view>
          </view>
          <text class="field-error" v-if="showStructureError">请选择结构类型</text>
        </view>

        <!-- 作品描述 -->
        <view class="form-group">
          <text class="form-label">作品描述（可选）</text>
          <textarea 
            class="form-textarea" 
            v-model="workData.description" 
            placeholder="简要描述作品内容或设定"
            maxlength="300"
            auto-height
          />
          <text class="char-count">{{ workData.description.length }}/300</text>
        </view>

        <!-- 错误提示 -->
        <view class="error-message" v-if="errorMessage">
          {{ errorMessage }}
        </view>
      </view>

      <!-- 弹窗底部 -->
      <view class="modal-footer">
        <button class="btn-cancel" @tap="closeModal">取消</button>
        <button class="btn-confirm" @tap="confirmCreate" :disabled="!isFormValid">
          {{ isLoading ? '创建中...' : '创建作品' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import FileSystemStorage from '@/utils/fileSystemStorage.js'

// 使用导入的实例（已经是实例，不需要 new）
const fileStorage = FileSystemStorage

// 组件加载时进行环境检测
onMounted(() => {
  try {
    const systemInfo = uni.getSystemInfoSync()
    
    if (systemInfo.uniPlatform === 'app') {
      // App环境使用plus.io
      if (typeof plus !== 'undefined' && plus.io) {
        console.log('✅ [CreateWorkModal] App环境文件系统API可用 (plus.io)')
      } else {
        console.log('⚠️ [CreateWorkModal] App环境但plus.io不可用，使用localStorage降级方案')
      }
    } else if (systemInfo.uniPlatform === 'mp-weixin') {
      // 小程序环境使用uni.getFileSystemManager
      if (typeof uni.getFileSystemManager === 'function') {
        console.log('✅ [CreateWorkModal] 小程序环境文件系统API可用 (uni.getFileSystemManager)')
      } else {
        console.log('⚠️ [CreateWorkModal] 小程序环境但文件系统API不可用，使用localStorage降级方案')
      }
    } else if (systemInfo.uniPlatform === 'h5') {
      // H5环境使用localStorage
      console.log('✅ [CreateWorkModal] H5环境使用localStorage方案')
    } else {
      console.log('⚠️ [CreateWorkModal] 未知环境，使用localStorage降级方案')
    }
  } catch (e) {
    console.error('[CreateWorkModal] 获取系统信息失败:', e)
    console.log('⚠️ [CreateWorkModal] 系统信息获取失败，使用localStorage降级方案')
  }
})

// 定义props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    required: true
  }
})

// 定义emits
const emit = defineEmits(['update:visible', 'created'])

// 响应式数据
const workData = ref({
  title: '',
  description: '',
  category: 'novel',
  structure_type: 'single'
})

const errorMessage = ref('')
const isLoading = ref(false)
const showTitleError = ref(false)
const showStructureError = ref(false)


// 结构类型选项
const structureTypes = ref([
  { value: 'single', label: '整体作品' },
  { value: 'chapterized', label: '分章节作品' }
])

// 计算属性：表单验证
const isFormValid = computed(() => {
  return workData.value.title.trim().length > 0 && workData.value.title.trim().length <= 100
})

// 监听标题变化，实时验证
watch(() => workData.value.title, (newTitle) => {
  showTitleError.value = newTitle.trim().length === 0
})

// 监听结构类型变化，实时验证
watch(() => workData.value.structure_type, (newStructure) => {
  showStructureError.value = !newStructure
})

// 监听结构类型变化，实时验证
watch(() => workData.value.structure_type, (newStructure) => {
  showStructureError.value = !newStructure
})

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    // 重置表单
    workData.value = {
      title: '',
      description: '',
      category: 'novel',
      structure_type: 'single',
      initialContent: ''
    }
    errorMessage.value = ''
    isLoading.value = false
  }
})

// 关闭弹窗
const closeModal = () => {
  emit('update:visible', false)
}

// 确认创建
const confirmCreate = async () => {
  // 验证必填项
  if (!workData.value.title.trim()) {
    showTitleError.value = true
    errorMessage.value = '请填写作品标题'
    return
  }
  
  if (workData.value.title.trim().length > 100) {
    errorMessage.value = '作品标题不能超过100个字符'
    return
  }

  // 验证结构类型
  if (!workData.value.structure_type) {
    showStructureError.value = true
    errorMessage.value = '请选择结构类型'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    // 创建新作品
    const newWork = await fileStorage.createWork(props.userId, {
      title: workData.value.title.trim(),
      description: workData.value.description.trim(),
      category: workData.value.category,
      structure_type: workData.value.structure_type
    })
    
    console.log('✅ 作品创建成功:', newWork)

    // 显示成功提示
    uni.showToast({
      title: '作品创建成功',
      icon: 'success',
      duration: 2000
    })

    // 触发创建成功事件
    emit('created', newWork)
    
    // 关闭弹窗
    closeModal()

  } catch (error) {
    console.error('创建作品失败:', error)
    errorMessage.value = '创建作品失败，请稍后重试'
    
    uni.showToast({
      title: '创建失败',
      icon: 'error',
      duration: 2000
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  background: #2D2D2D;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #404040;
  position: relative;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #FFFFFF;
  flex: 1;
  text-align: center;
}

.close-btn {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  position: absolute;
  right: 10px;
  top: 10px;
}

.close-text {
  font-size: 28px;
  color: #B3B3B3;
  font-weight: 300;
  line-height: 1;
}

.close-btn:active .close-text {
  color: #FFFFFF;
}

.modal-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  color: #B3B3B3;
  margin-bottom: 8px;
  font-weight: 500;
}

.required {
  color: #FF6B35;
  margin-left: 4px;
}

.field-error {
  display: block;
  font-size: 12px;
  color: #FF6B35;
  margin-top: 4px;
}

.form-input {
  width: 100%;
  background: #404040;
  border: 1px solid #555555;
  border-radius: 6px;
  padding: 12px;
  color: #FFFFFF;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #FF6B35;
  outline: none;
}

.title-textarea {
  min-height: 44px;
  max-height: 44px;
  resize: none;
  line-height: 1.4;
}

.form-textarea {
  width: 100%;
  background: #404040;
  border: 1px solid #555555;
  border-radius: 6px;
  padding: 12px;
  color: #FFFFFF;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
  box-sizing: border-box;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #808080;
  margin-top: 4px;
}

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.radio-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #404040;
  border: 1px solid #555555;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 120px;
  justify-content: center;
}

.radio-item.active {
  background: #FF6B35;
  border-color: #FF6B35;
}

.radio-item:active {
  transform: scale(0.98);
}

.radio-text {
  font-size: 14px;
  color: #FFFFFF;
}

.error-message {
  background: rgba(255, 107, 53, 0.1);
  border: 1px solid rgba(255, 107, 53, 0.3);
  border-radius: 6px;
  padding: 12px;
  color: #FF6B35;
  font-size: 14px;
  margin-top: 16px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #404040;
}

.btn-cancel, .btn-confirm {
  flex: 1;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #404040;
  color: #B3B3B3;
}

.btn-cancel:active {
  background: #555555;
}

.btn-confirm {
  background: #FF6B35;
  color: #FFFFFF;
}

.btn-confirm:active:not(:disabled) {
  background: #E55A2B;
  transform: translateY(1px);
}

.btn-confirm:disabled {
  background: #808080;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 亮色主题样式 */
:global(.light-theme) .modal-container {
  background: #FFFFFF;
}

:global(.light-theme) .modal-title {
  color: #333333;
}

:global(.light-theme) .close-btn {
  background: rgba(0, 0, 0, 0.1);
}

:global(.light-theme) .form-label {
  color: #666666;
}

:global(.light-theme) .form-input,
:global(.light-theme) .form-textarea {
  background: #F5F5F5;
  border-color: #E0E0E0;
  color: #333333;
}

:global(.light-theme) .radio-label {
  background: #F5F5F5;
  border-color: #E0E0E0;
}

:global(.light-theme) .radio-text {
  color: #333333;
}

:global(.light-theme) .btn-cancel {
  background: #F5F5F5;
  color: #666666;
}

:global(.light-theme) .modal-header,
:global(.light-theme) .modal-footer {
  border-color: #E0E0E0;
}
</style>
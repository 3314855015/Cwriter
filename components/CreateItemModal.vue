<template>
  <view class="modal-mask" v-if="visible" @tap="closeModal">
    <view class="modal-container" @tap.stop>
      <!-- 弹窗头部 -->
      <view class="modal-header">
        <text class="modal-title">{{ getModalTitle() }}</text>
        <button class="close-btn" @tap="closeModal">
          <text class="close-text">×</text>
        </button>
      </view>

      <!-- 表单内容 -->
      <view class="modal-content">
        <!-- 创建章节 -->
        <view v-if="itemType === 'chapter'" class="form-group">
          <text class="form-label">章节标题 <text class="required">*</text></text>
          <input 
            class="form-input" 
            v-model="itemData.title" 
            placeholder="请输入章节标题"
            maxlength="100"
          />
          <text class="char-count">{{ itemData.title.length }}/100</text>
          
          <text class="form-label">章节内容</text>
          <textarea 
            class="form-textarea" 
            v-model="itemData.content" 
            placeholder="请输入章节内容"
            auto-height
          />
        </view>

        <!-- 创建人物 -->
        <view v-else-if="itemType === 'character'" class="form-group">
          <text class="form-label">人物名称 <text class="required">*</text></text>
          <input 
            class="form-input" 
            v-model="itemData.name" 
            placeholder="请输入人物名称"
            maxlength="50"
          />
          
          <text class="form-label">人物描述</text>
          <textarea 
            class="form-textarea" 
            v-model="itemData.description" 
            placeholder="请输入人物描述"
            auto-height
          />
          
          <text class="form-label">人物标签</text>
          <view class="tags-container">
            <view 
              v-for="tag in itemData.tags" 
              :key="tag"
              class="tag-item"
            >
              <text class="tag-text">{{ tag }}</text>
              <text class="tag-remove" @tap="removeTag(tag)">×</text>
            </view>
            <input 
              class="tag-input" 
              v-model="newTag" 
              placeholder="添加标签"
              @confirm="addTag"
            />
          </view>
        </view>

        <!-- 创建设定 -->
        <view v-else-if="itemType === 'setting'" class="form-group">
          <text class="form-label">设定标题 <text class="required">*</text></text>
          <input 
            class="form-input" 
            v-model="itemData.title" 
            placeholder="请输入设定标题"
            maxlength="100"
          />
          <text class="char-count">{{ itemData.title.length }}/100</text>
          
          <text class="form-label">设定类型</text>
          <view class="radio-group">
            <view 
              v-for="type in settingTypes" 
              :key="type.value"
              class="radio-item"
              :class="{ active: itemData.type === type.value }"
              @tap="itemData.type = type.value"
            >
              <text class="radio-text">{{ type.label }}</text>
            </view>
          </view>
          
          <text class="form-label">设定内容</text>
          <textarea 
            class="form-textarea" 
            v-model="itemData.content" 
            placeholder="请输入设定内容"
            auto-height
          />
        </view>

        <!-- 创建伏笔 -->
        <view v-else-if="itemType === 'foreshadowing'" class="form-group">
          <text class="form-label">伏笔标题 <text class="required">*</text></text>
          <input 
            class="form-input" 
            v-model="itemData.title" 
            placeholder="请输入伏笔标题"
            maxlength="100"
          />
          <text class="char-count">{{ itemData.title.length }}/100</text>
          
          <text class="form-label">相关章节</text>
          <picker 
            class="form-picker" 
            :range="chapterOptions" 
            :value="itemData.chapterIndex"
            @change="onChapterChange"
          >
            <view class="picker-display">
              {{ chapterOptions[itemData.chapterIndex] || '选择章节' }}
              <image class="picker-arrow" src="/static/icons/cog.svg" mode="aspectFit"></image>
            </view>
          </picker>
          
          <text class="form-label">伏笔内容</text>
          <textarea 
            class="form-textarea" 
            v-model="itemData.content" 
            placeholder="请输入伏笔内容"
            auto-height
          />
        </view>
      </view>

      <!-- 错误提示 -->
      <view class="error-message" v-if="errorMessage">
        {{ errorMessage }}
      </view>

      <!-- 弹窗底部 -->
      <view class="modal-footer">
        <button class="btn-cancel" @tap="closeModal">取消</button>
        <button class="btn-confirm" @tap="confirmCreate" :disabled="!isFormValid">
          {{ isLoading ? '创建中...' : '创建' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// 定义props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  workTitle: {
    type: String,
    default: ''
  },
  itemType: {
    type: String,
    default: ''
  }
})

// 定义emits
const emit = defineEmits(['update:visible', 'created'])

// 响应式数据
const itemData = ref({
  title: '',
  content: '',
  name: '',
  description: '',
  type: 'worldview',
  tags: [],
  chapterIndex: -1
})

const newTag = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

// 设定类型选项
const settingTypes = ref([
  { value: 'worldview', label: '世界观' },
  { value: 'background', label: '背景故事' },
  { value: 'culture', label: '文化制度' },
  { value: 'geography', label: '地理环境' },
  { value: 'technology', label: '科技设定' },
  { value: 'magic', label: '魔法设定' },
  { value: 'organization', label: '组织势力' }
])

// 章节选项（示例数据）
const chapterOptions = ref([
  '第一章：开始',
  '第二章：发展',
  '第三章：转折',
  '第四章：高潮',
  '第五章：结局'
])

// 计算属性：表单验证
const isFormValid = computed(() => {
  switch (props.itemType) {
    case 'chapter':
      return itemData.value.title.trim().length > 0 && itemData.value.title.trim().length <= 100
    case 'character':
      return itemData.value.name.trim().length > 0 && itemData.value.name.trim().length <= 50
    case 'setting':
      return itemData.value.title.trim().length > 0 && itemData.value.title.trim().length <= 100
    case 'foreshadowing':
      return itemData.value.title.trim().length > 0 && itemData.value.title.trim().length <= 100
    default:
      return false
  }
})

// 计算属性：弹窗标题
const getModalTitle = () => {
  const titleMap = {
    'chapter': `新建章节 - ${props.workTitle}`,
    'character': `新建人物 - ${props.workTitle}`,
    'setting': `新建设定 - ${props.workTitle}`,
    'foreshadowing': `新建伏笔 - ${props.workTitle}`,
    'subitem': '新建项目'
  }
  return titleMap[props.itemType] || '新建项目'
}

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    // 重置表单
    resetForm()
  }
})

// 重置表单
const resetForm = () => {
  itemData.value = {
    title: '',
    content: '',
    name: '',
    description: '',
    type: 'worldview',
    tags: [],
    chapterIndex: -1
  }
  errorMessage.value = ''
  isLoading.value = false
}

// 添加标签
const addTag = () => {
  const tag = newTag.value.trim()
  if (tag && !itemData.value.tags.includes(tag) && itemData.value.tags.length < 10) {
    itemData.value.tags.push(tag)
    newTag.value = ''
  }
}

// 移除标签
const removeTag = (tag) => {
  const index = itemData.value.tags.indexOf(tag)
  if (index > -1) {
    itemData.value.tags.splice(index, 1)
  }
}

// 章节选择变化
const onChapterChange = (e) => {
  itemData.value.chapterIndex = e.detail.value
}

// 确认创建
const confirmCreate = async () => {
  // 验证必填项
  if (!isFormValid.value) {
    errorMessage.value = '请填写所有必填项'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    // 根据类型创建不同的数据结构
    let newItem = {}
    
    switch (props.itemType) {
      case 'chapter':
        newItem = {
          id: Date.now().toString(),
          title: itemData.value.title.trim(),
          content: itemData.value.content,
          type: 'chapter',
          created_at: new Date().toISOString()
        }
        break
        
      case 'character':
        newItem = {
          id: Date.now().toString(),
          name: itemData.value.name.trim(),
          description: itemData.value.description.trim(),
          tags: itemData.value.tags,
          type: 'character',
          created_at: new Date().toISOString()
        }
        break
        
      case 'setting':
        newItem = {
          id: Date.now().toString(),
          title: itemData.value.title.trim(),
          content: itemData.value.content.trim(),
          type: itemData.value.type,
          settingType: itemData.value.type,
          created_at: new Date().toISOString()
        }
        break
        
      case 'foreshadowing':
        newItem = {
          id: Date.now().toString(),
          title: itemData.value.title.trim(),
          content: itemData.value.content.trim(),
          chapterIndex: itemData.value.chapterIndex,
          chapterName: chapterOptions.value[itemData.value.chapterIndex] || '',
          type: 'foreshadowing',
          created_at: new Date().toISOString()
        }
        break
    }

    // 触发创建成功事件
    emit('created', newItem)
    closeModal()
    
    uni.showToast({
      title: '创建成功',
      icon: 'success'
    })
    
  } catch (error) {
    console.error('创建失败:', error)
    errorMessage.value = '创建失败，请稍后重试'
    
    uni.showToast({
      title: '创建失败',
      icon: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

// 关闭弹窗
const closeModal = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.0.7);
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
}

.close-text {
  font-size: 28px;
  color: #B3B3B3;
  font-weight: 300;
  line-height: 1;
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
  gap: 8px;
}

.radio-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #404040;
  border: 1px solid #555555;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 100px;
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

.form-picker {
  width: 100%;
  background: #404040;
  border: 1px solid #555555;
  border-radius: 6px;
  padding: 12px;
  color: #FFFFFF;
  font-size: 14px;
  box-sizing: border-box;
}

.picker-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  color: #FFFFFF;
}

.picker-arrow {
  width: 12px;
  height: 12px;
  transform: rotate(90deg);
  opacity: 0.7;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.tag-item {
  display: flex;
  align-items: center;
  background: #FF6B35;
  border-radius: 4px;
  padding: 4px 8px;
  gap: 4px;
}

.tag-text {
  font-size: 12px;
  color: #FFFFFF;
}

.tag-remove {
  font-size: 16px;
  color: #FFFFFF;
  cursor: pointer;
  opacity: 0.8;
}

.tag-remove:hover {
  opacity: 1;
}

.tag-input {
  flex: 1;
  min-width: 80px;
  background: transparent;
  border: 1px solid #555555;
  border-radius: 4px;
  padding: 4px 8px;
  color: #FFFFFF;
  font-size: 12px;
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
  border: 1px solid #555555;
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

:global(.light-theme) .form-label {
  color: #666666;
}

:global(.light-theme) .form-input,
:global(.light-theme) .form-textarea,
:global(.light-theme) .form-picker {
  background: #F5F5F5;
  border-color: #E0E0E0;
  color: #333333;
}

:global(.light-theme) .radio-item {
  background: #F5F5F5;
  border-color: #E0E0E0;
}

:global(.light-theme) .radio-item.active {
  background: #FF6B35;
  border-color: #FF6B35;
}

:global(.light-theme) .tag-input {
  border-color: #E0E0E0;
  color: #333333;
}

:global(.light-theme) .btn-cancel {
  background: #F5F5F5;
  color: #666666;
  border-color: #E0E0E0;
}

:global(.light-theme) .modal-footer {
  border-color: #E0E0E0;
}
</style>
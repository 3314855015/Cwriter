<template>
  <view class="modal-mask" v-if="visible" @tap="closeModal">
    <view class="modal-container" @tap.stop>
      <!-- 弹窗头部 -->
      <view class="modal-header">
        <text class="modal-title">作品管理</text>
        <button class="close-btn" @tap="closeModal">
          <text class="close-text">×</text>
        </button>
      </view>

      <!-- 当前路径导航 -->
      <view class="breadcrumb">
        <text class="breadcrumb-item" @tap="navigateToRoot">作品管理</text>
        <text class="breadcrumb-separator" v-if="currentPath.length > 0">></text>
        <text class="breadcrumb-item" v-for="(item, index) in currentPath" :key="index">
          {{ item.name }}
        </text>
      </view>

      <!-- 内容区域 -->
      <view class="modal-content">
        <!-- 作品根目录 -->
        <view v-if="currentPath.length === 0" class="works-grid">
          <view 
            v-for="work in worksList" 
            :key="work.id" 
            class="folder-item"
            @tap="enterWork(work)"
          >
            <view class="folder-icon">
              <image class="folder-img" src="/static/icons/folder-open.svg" mode="aspectFit"></image>
            </view>
            <text class="folder-name">{{ work.title }}</text>
            <text class="folder-info">{{ formatWorkInfo(work) }}</text>
          </view>
        </view>

        <!-- 作品内部结构 -->
        <view v-else class="structure-grid">
          <view 
            v-for="item in structureItems" 
            :key="item.id" 
            class="structure-item"
            @tap="enterStructure(item)"
          >
            <view class="structure-icon">
              <image 
                class="structure-img" 
                :src="getItemIcon(item)" 
                mode="aspectFit"
              ></image>
            </view>
            <text class="structure-name">{{ getDisplayName(item) }}</text>
            <text class="structure-info">{{ getItemInfo(item) }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮区域 -->
      <view class="action-bar" v-if="currentWork">
        <button class="action-btn" @tap="createNewItem">
          <image class="action-icon" src="/static/icons/plus.svg" mode="aspectFit"></image>
          <text class="action-text">新建</text>
        </button>
        <button class="action-btn" @tap="showImportOptions">
          <image class="action-icon" src="/static/icons/import.svg" mode="aspectFit"></image>
          <text class="action-text">导入</text>
        </button>
        <button class="action-btn danger" @tap="deleteCurrentItem">
          <image class="action-icon" src="/static/icons/trash.svg" mode="aspectFit"></image>
          <text class="action-text">删除</text>
        </button>
      </view>

      <!-- 弹窗底部 -->
      <view class="modal-footer">
        <button class="btn-cancel" @tap="closeModal">关闭</button>
      </view>
    </view>
  </view>

  <!-- 新建项目弹窗 -->
  <CreateItemModal 
    :visible="showCreateModal"
    :workTitle="currentWork?.title"
    :itemType="newItemType"
    @update:visible="showCreateModal = $event"
    @created="handleItemCreated"
  />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import FileSystemStorage from '@/utils/fileSystemStorage.js'
import CreateItemModal from './CreateItemModal.vue'

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
const emit = defineEmits(['update:visible'])

// 响应式数据
const currentPath = ref([])
const currentWork = ref(null)
const worksList = ref([])
const showCreateModal = ref(false)
const newItemType = ref('')

// 创建文件系统实例
const fileStorage = FileSystemStorage

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadWorksList()
  }
})

// 加载作品列表
const loadWorksList = async () => {
  try {
    const works = await fileStorage.getUserWorks(props.userId)
    worksList.value = works
  } catch (error) {
    console.error('加载作品列表失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'error'
    })
  }
}

// 格式化作品信息
const formatWorkInfo = (work) => {
  const wordCount = work.content?.manuscript?.word_count || 0
  const updatedTime = new Date(work.updated_at)
  const timeAgo = getTimeAgo(updatedTime)
  
  if (timeAgo.includes('天')) {
    return `${wordCount}字 · ${timeAgo}`
  } else {
    return `${wordCount}字 · ${timeAgo}`
  }
}

// 时间差计算
const getTimeAgo = (date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString()
}

// 进入作品
const enterWork = (work) => {
  currentWork.value = work
  currentPath.value = [{
    id: work.id,
    name: work.title,
    type: 'work'
  }]
}

// 导航到根目录
const navigateToRoot = () => {
  currentWork.value = null
  currentPath.value = []
}

// 获取结构化项目
const structureItems = computed(() => {
  if (!currentWork.value) return []
  
  const currentLevel = currentPath.value[currentPath.value.length - 1]
  
  if (currentPath.value.length === 1) {
    // 作品根目录
    return [
      {
        id: `${currentWork.value.id}_manuscript`,
        name: '稿纸',
        type: 'manuscript',
        icon: 'document',
        description: '主要创作内容'
      },
      {
        id: `${currentWork.value.id}_characters`,
        name: '人物',
        type: 'characters',
        icon: 'users',
        description: '人物设定'
      },
      {
        id: `${currentWork.value.id}_settings`,
        name: '设定',
        type: 'settings',
        icon: 'cog',
        description: '世界观、背景设定'
      },
      {
        id: `${currentWork.value.id}_foreshadowings`,
        name: '伏笔',
        type: 'foreshadowings',
        icon: 'lightbulb',
        description: '伏笔线索'
      },
      {
        id: `${currentWork.value.id}_maps`,
        name: '地图',
        type: 'maps',
        icon: 'map',
        description: '场景地图'
      }
    ]
  }
  
  return []
})

// 获取项目图标
const getItemIcon = (item) => {
  const iconMap = {
    'document': '/static/icons/file.svg',
    'users': '/static/icons/user-plus.svg',
    'cog': '/static/icons/cog.svg',
    'lightbulb': '/static/icons/lightbulb.svg',
    'map': '/static/icons/map.svg'
  }
  return iconMap[item.icon] || '/static/icons/file.svg'
}

// 获取显示名称
const getDisplayName = (item) => {
  return item.name
}

// 获取项目信息
const getItemInfo = (item) => {
  return item.description || ''
}

// 进入结构项目
const enterStructure = (item) => {
  // 根据不同类型显示不同的子内容
  showStructureContent(item.type)
}

// 显示结构内容
const showStructureContent = (type) => {
  uni.showToast({
    title: `打开${type}管理`,
    icon: 'none',
    duration: 2000
  })
  
  // TODO: 这里将来可以实现具体的管理功能
  // 比如：showCharactersManage(), showMapsManage() 等
}

// 创建新项目
const createNewItem = () => {
  // 根据当前层级确定创建类型
  if (currentPath.value.length === 1) {
    // 在作品根目录，可以创建各种内容
    newItemType.value = 'chapter'
    showCreateModal.value = true
  } else {
    // 在子目录中
    newItemType.value = 'subitem'
    showCreateModal.value = true
  }
}

// 显示导入选项
const showImportOptions = () => {
  uni.showToast({
    title: '导入功能开发中',
    icon: 'none'
  })
}

// 删除当前项目
const deleteCurrentItem = async () => {
  if (currentPath.value.length === 0) {
    // 删除整个作品
    const confirmed = await showConfirmDialog('确认删除', `确定要删除作品"${currentWork.value.title}"吗？此操作不可恢复！`)
    if (confirmed) {
      try {
        await fileStorage.deleteWork(props.userId, currentWork.value.id)
        await loadWorksList()
        navigateToRoot()
        
        uni.showToast({
          title: '作品删除成功',
          icon: 'success'
        })
      } catch (error) {
        console.error('删除作品失败:', error)
        uni.showToast({
          title: '删除失败',
          icon: 'error'
        })
      }
    }
  } else {
    // 删除子项目
    uni.showToast({
      title: '删除功能开发中',
      icon: 'none'
    })
  }
}

// 显示确认对话框
const showConfirmDialog = (title, content) => {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        resolve(res.confirm)
      }
    })
  })
}

// 处理项目创建成功
const handleItemCreated = (newItem) => {
  showCreateModal.value = false
  uni.showToast({
    title: '创建成功',
    icon: 'success'
  })
}

// 关闭弹窗
const closeModal = () => {
  emit('update:visible', false)
  navigateToRoot()
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
  max-width: 600px;
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

.breadcrumb {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #1A1A1A;
  border-bottom: 1px solid #404040;
}

.breadcrumb-item {
  font-size: 14px;
  color: #FF6B35;
  margin-right: 4px;
}

.breadcrumb-separator {
  color: #666666;
  margin: 0 8px;
}

.modal-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
  padding: 8px 0;
}

.structure-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  padding: 8px 0;
}

.folder-item, .structure-item {
  background: #404040;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.2s ease;
  border: 1px solid #555555;
}

.folder-item:active, .structure-item:active {
  background: #555555;
  transform: translateY(1px);
}

.folder-icon, .structure-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.folder-img, .structure-img {
  width: 40px;
  height: 40px;
}

.folder-name, .structure-name {
  font-size: 14px;
  color: #FFFFFF;
  font-weight: 500;
  margin-bottom: 4px;
}

.folder-info, .structure-info {
  font-size: 12px;
  color: #B3B3B3;
  line-height: 1.3;
}

.action-bar {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #404040;
  border-bottom: 1px solid #404040;
  background: #1A1A1A;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 6px;
  background: #404040;
  color: #FFFFFF;
  border: 1px solid #555555;
  font-size: 14px;
}

.action-btn:active {
  background: #555555;
}

.action-btn.danger {
  background: rgba(255, 107, 53, 0.2);
  border-color: #FF6B35;
  color: #FF6B35;
}

.action-btn.danger:active {
  background: rgba(255, 107, 53, 0.3);
}

.action-icon {
  width: 16px;
  height: 16px;
}

.action-text {
  font-size: 14px;
  font-weight: 500;
}

.modal-footer {
  display: flex;
  padding: 20px;
  border-top: 1px solid #404040;
}

.btn-cancel {
  width: 100%;
  padding: 12px;
  border-radius: 6px;
  background: #404040;
  color: #B3B3B3;
  border: 1px solid #555555;
  font-size: 14px;
  font-weight: 500;
}

.btn-cancel:active {
  background: #555555;
}

/* 亮色主题样式 */
:global(.light-theme) .modal-container {
  background: #FFFFFF;
}

:global(.light-theme) .modal-title {
  color: #333333;
}

:global(.light-theme) .breadcrumb {
  background: #F8F8F8;
  border-color: #E0E0E0;
}

:global(.light-theme) .folder-item, 
:global(.light-theme) .structure-item {
  background: #F5F5F5;
  border-color: #E0E0E0;
}

:global(.light-theme) .folder-item:active,
:global(.light-theme) .structure-item:active {
  background: #E8E8E8;
}

:global(.light-theme) .folder-name,
:global(.light-theme) .structure-name {
  color: #333333;
}

:global(.light-theme) .folder-info,
:global(.light-theme) .structure-info {
  color: #666666;
}

:global(.light-theme) .action-bar {
  background: #F8F8F8;
  border-color: #E0E0E0;
}

:global(.light-theme) .action-btn {
  background: #F5F5F5;
  border-color: #E0E0E0;
  color: #333333;
}

:global(.light-theme) .action-btn:active {
  background: #E8E8E8;
}

:global(.light-theme) .modal-footer {
  border-color: #E0E0E0;
}

:global(.light-theme) .btn-cancel {
  background: #F5F5F5;
  color: #666666;
  border-color: #E0E0E0;
}
</style>
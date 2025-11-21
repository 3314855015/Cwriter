<template>
  <view class="modal-mask" v-if="visible" @tap="closeModal">
    <view class="modal-container" @tap.stop>
      <!-- 弹窗头部 -->
      <view class="modal-header">
        <text class="modal-title">{{ currentWork ? currentWork.title : '作品列表' }}</text>
        <button class="close-btn" @tap="closeModal">
          <text class="close-text">×</text>
        </button>
      </view>

      <!-- 内容区域 -->
      <view class="modal-content">
        <!-- 作品列表状态 -->
        <transition name="fade-slide">
          <view v-if="!currentWork" key="works-list" class="works-container">
            <!-- 作品网格 -->
            <view class="works-grid">
              <!-- 作品列表 -->
              <view 
                v-for="work in worksList" 
                :key="work.id" 
                class="work-item"
                @tap="enterWork(work)"
              >
                <view class="work-content">
                  <text class="work-title">{{ work.title }}</text>
                  <text class="work-delete" @tap.stop="deleteWorkItem(work)">×</text>
                </view>
              </view>
              
              <!-- 空状态 -->
              <view v-if="worksList.length === 0" class="empty-state">
                <view class="empty-icon">📚</view>
                <text class="empty-text">暂无作品</text>
                <text class="empty-subtitle">创建你的第一个作品开始写作</text>
              </view>
            </view>
          </view>

          <!-- 作品管理状态 -->
          <view v-else key="work-management" class="work-management-container">
            <!-- 返回按钮 -->
            <view class="back-section">
              <view class="back-button" @tap="navigateToRoot">
                <text class="back-arrow">←</text>
                <text class="back-text">返回作品列表</text>
              </view>
            </view>
            
            <!-- 作品管理悬浮单元格 -->
            <view class="work-management-grid">
              <view class="management-cell" @tap="openChapterManagement">
                <text class="cell-title">章节管理</text>
              </view>
              <view class="management-cell" @tap="openCharacterManagement">
                <text class="cell-title">人物管理</text>
              </view>
              <view class="management-cell" @tap="openDraftManagement">
                <text class="cell-title">草稿管理</text>
              </view>
              <view class="management-cell" @tap="openGlossaryManagement">
                <text class="cell-title">术语管理</text>
              </view>
              <view class="management-cell" @tap="openMapManagement">
                <text class="cell-title">地图管理</text>
              </view>
            </view>
          </view>
        </transition>
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
    // 确保userId有效，如果无效则使用默认用户
    const effectiveUserId = props.userId || 'default_user'
    
    if (props.userId !== effectiveUserId) {
      console.warn('⚠️ userId为空或无效，使用默认用户:', {
        original: props.userId,
        effective: effectiveUserId
      })
    }
    
    // 首先初始化用户存储
    await fileStorage.initUserStorage(effectiveUserId)
    
    // 调试：输出存储路径信息
    fileStorage.logStoragePaths(effectiveUserId)
    
    // 加载作品列表（扫描 works 目录下的所有 work.config.json）
    const userWorks = await fileStorage.getUserWorks(effectiveUserId)
    
    console.log('📚 加载到的作品数据:', userWorks)
    
    // 使用 Promise.all 来并行处理所有作品的字数计算
    const worksPromises = userWorks.map(async (work) => {
      // 计算字数：尝试从文档文件获取，如果没有则从标题和描述估算
      let wordCount = 0
      try {
        // 尝试读取文档内容来计算字数
        const manuscriptPath = `${work.local_file_path}/settings/manuscript.json`
        const manuscript = await fileStorage.readFile(manuscriptPath)
        if (manuscript && manuscript.word_count) {
          wordCount = manuscript.word_count
        } else if (manuscript && manuscript.content) {
          wordCount = manuscript.content.replace(/\s/g, '').length
        } else {
          // 估算字数：标题 + 描述
          wordCount = (work.title?.length || 0) + (work.description?.length || 0)
        }
      } catch (error) {
        // 如果读取失败，使用估算字数
        wordCount = (work.title?.length || 0) + (work.description?.length || 0)
      }
      
      return {
        id: work.id,
        title: work.title || '未命名作品',
        description: work.description || '',
        word_count: wordCount,
        created_at: work.created_at,
        updated_at: work.updated_at,
        structure_type: work.structure_type,
        file_structure: work.file_structure,
        local_file_path: work.local_file_path,
        folderName: work.folderName,
        content: work.content, // 保留原始内容数据
        is_active: work.is_active
      }
    })
    
    // 等待所有作品数据处理完成
    worksList.value = await Promise.all(worksPromises)
    
    console.log('✅ 作品列表加载完成，共', worksList.value.length, '个作品')
    
  } catch (error) {
    console.error('❌ 加载作品列表失败:', error)
    console.error('错误详情:', error.stack)
    uni.showToast({
      title: '加载失败',
      icon: 'error'
    })
    
    // 失败时设置为空数组
    worksList.value = []
  }
}

// 格式化作品信息
const formatWorkInfo = (work) => {
  // 使用已计算好的字数
  const wordCount = work.word_count || 0
  const updatedTime = new Date(work.updated_at || work.created_at)
  const timeAgo = getTimeAgo(updatedTime)
  
  return `${wordCount}字 · ${timeAgo}`
}

// 时间差计算
const getTimeAgo = (date) => {
  if (!date) return '未知时间'
  
  try {
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
  } catch (error) {
    console.warn('时间格式化失败:', error)
    return '未知时间'
  }
}

// 进入作品
const enterWork = (work) => {
  console.log('📂 进入作品:', work)
  currentWork.value = work
  // 不再设置currentPath，直接显示作品管理悬浮单元格
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

// 删除单个作品
const deleteWorkItem = async (work) => {
  const confirmed = await showConfirmDialog('确认删除', `确定要删除作品"${work.title || '未命名作品'}"吗？

此操作将永久删除作品及其所有内容，包括章节、人物设定、世界观等。

此操作不可恢复！`)
  if (confirmed) {
    try {
      // 确保userId有效，如果无效则使用默认用户
      const effectiveUserId = props.userId || 'default_user'
      
      console.log('🗑️ 开始删除作品:', work.id, work.title)
      
      await fileStorage.deleteWork(effectiveUserId, work.id)
      
      console.log('✅ 作品删除成功，重新加载列表')
      
      await loadWorksList()
      
      uni.showToast({
        title: '作品删除成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('❌ 删除作品失败:', error)
      console.error('错误详情:', error.stack)
      uni.showToast({
        title: '删除失败，请重试',
        icon: 'error'
      })
    }
  }
}

// 作品管理功能处理
const openChapterManagement = () => {
  uni.showToast({
    title: '章节管理功能开发中',
    icon: 'none'
  })
}

const openCharacterManagement = () => {
  uni.showToast({
    title: '人物管理功能开发中',
    icon: 'none'
  })
}

const openDraftManagement = () => {
  uni.showToast({
    title: '草稿管理功能开发中',
    icon: 'none'
  })
}

const openGlossaryManagement = () => {
  uni.showToast({
    title: '术语管理功能开发中',
    icon: 'none'
  })
}

const openMapManagement = () => {
  uni.showToast({
    title: '地图管理功能开发中',
    icon: 'none'
  })
}

// 删除当前项目
const deleteCurrentItem = async () => {
  if (currentPath.value.length === 0) {
    // 删除整个作品
    const confirmed = await showConfirmDialog('确认删除', `确定要删除作品"${currentWork.value?.title || '未命名作品'}"吗？

此操作将永久删除作品及其所有内容，包括章节、人物设定、世界观等。

此操作不可恢复！`)
    if (confirmed) {
      try {
        // 确保userId有效，如果无效则使用默认用户
        const effectiveUserId = props.userId || 'default_user'
        
        console.log('🗑️ 开始删除作品:', currentWork.value?.id, currentWork.value?.title)
        
        await fileStorage.deleteWork(effectiveUserId, currentWork.value.id)
        
        console.log('✅ 作品删除成功，重新加载列表')
        
        await loadWorksList()
        navigateToRoot()
        
        uni.showToast({
          title: '作品删除成功',
          icon: 'success'
        })
      } catch (error) {
        console.error('❌ 删除作品失败:', error)
        console.error('错误详情:', error.stack)
        uni.showToast({
          title: '删除失败，请重试',
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

// 返回作品列表
const navigateToRoot = () => {
  currentWork.value = null
  currentPath.value = []
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
  overflow: hidden;
  position: relative;
}

.works-container {
  height: 100%;
  overflow-y: auto;
}

.work-management-container {
  height: 100%;
  overflow-y: auto;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 8px 0;
  min-height: 200px;
}

/* 返回区域样式 */
.back-section {
  margin-bottom: 20px;
  padding: 12px 0;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 107, 53, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 107, 53, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
  width: fit-content;
}

.back-button:active {
  background: rgba(255, 107, 53, 0.2);
  transform: translateY(1px);
}

.back-arrow {
  font-size: 16px;
  color: #FF6B35;
  font-weight: bold;
}

.back-text {
  font-size: 14px;
  color: #FF6B35;
  font-weight: 500;
}

/* 亮色主题下的返回按钮 */
:global(.light-theme) .back-button {
  background: rgba(255, 107, 53, 0.05);
  border-color: rgba(255, 107, 53, 0.2);
}

:global(.light-theme) .back-button:active {
  background: rgba(255, 107, 53, 0.1);
}

/* 切换动画 */
.fade-slide-enter-active {
  transition: all 0.3s ease;
}

.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 空状态样式 */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  color: #FFFFFF;
  margin-bottom: 8px;
  font-weight: 500;
}

.empty-subtitle {
  font-size: 14px;
  color: #B3B3B3;
  line-height: 1.4;
}

/* 亮色主题下的空状态 */
:global(.light-theme) .empty-text {
  color: #333333;
}

:global(.light-theme) .empty-subtitle {
  color: #666666;
}

.structure-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  padding: 8px 0;
}

/* 作品单元样式 */
.work-item {
  background: #404040;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
  border: 1px solid #555555;
  position: relative;
  cursor: pointer;
}

.work-item:active {
  background: #555555;
  transform: translateY(1px);
}

.work-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.work-title {
  font-size: 16px;
  color: #FFFFFF;
  font-weight: 500;
  flex: 1;
}

.work-delete {
  font-size: 20px;
  color: #FF6B35;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.2s ease;
  opacity: 0.7;
}

.work-delete:hover {
  opacity: 1;
  background: rgba(255, 107, 53, 0.2);
}

/* 作品管理悬浮单元格样式 */
.work-management-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  padding: 20px 0;
  max-width: 800px;
  margin: 0 auto;
  min-height: 300px;
  align-content: center;
}

.management-cell {
  background: #404040;
  border-radius: 12px;
  padding: 24px 16px;
  text-align: center;
  border: 1px solid #555555;
  transition: all 0.3s ease;
  cursor: pointer;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.management-cell:active {
  background: #555555;
  transform: translateY(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.cell-title {
  font-size: 15px;
  color: #FFFFFF;
  font-weight: 500;
}

/* 亮色主题下的作品管理单元格 */
:global(.light-theme) .work-item {
  background: #F5F5F5;
  border-color: #E0E0E0;
}

:global(.light-theme) .work-item:active {
  background: #E8E8E8;
}

:global(.light-theme) .work-title {
  color: #333333;
}

:global(.light-theme) .management-cell {
  background: #F5F5F5;
  border-color: #E0E0E0;
}

:global(.light-theme) .management-cell:active {
  background: #E8E8E8;
}

:global(.light-theme) .cell-title {
  color: #333333;
}

/* 结构项目样式（保留原有的） */
.structure-item {
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

.structure-item:active {
  background: #555555;
  transform: translateY(1px);
}

.structure-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.structure-img {
  width: 40px;
  height: 40px;
}

.structure-name {
  font-size: 14px;
  color: #FFFFFF;
  font-weight: 500;
  margin-bottom: 4px;
}

.structure-info {
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
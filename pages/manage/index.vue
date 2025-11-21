<template>
  <view class="page-container" :class="{ 'light-theme': !isDarkMode }">
    <!-- 状态栏 -->
    <view class="status-bar">
      <text class="status-time">{{ currentTime }}</text>
      <view class="status-icons">
        <image class="status-icon" src="/static/icons/signal.svg" mode="aspectFit"></image>
        <image class="status-icon" src="/static/icons/wifi.svg" mode="aspectFit"></image>
        <image class="status-icon" src="/static/icons/battery.svg" mode="aspectFit"></image>
      </view>
    </view>

    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">文件管理</text>
      <text class="page-subtitle">管理您的创作内容</text>
    </view>

    <!-- 文件管理内容 -->
    <view class="manage-content">
      <!-- 操作工具栏 -->
      <view class="toolbar">
        <view class="toolbar-item disabled" @tap="showImport">
          <text class="toolbar-text">导入</text>
        </view>
        <view class="toolbar-item disabled" @tap="showExport">
          <text class="toolbar-text">导出</text>
        </view>
        <view class="toolbar-item" @tap="loadLocalWorks">
          <text class="toolbar-text">加载</text>
        </view>
        <view class="toolbar-item" @tap="deleteSelected">
          <text class="toolbar-text">删除</text>
        </view>
      </view>

    <!-- 作品列表 -->
    <view class="works-section">
      <view class="section-header">
        <text class="section-title">作品列表</text>
        <text class="work-count">共 {{ works.length }} 部作品</text>
      </view>
      
      <view class="works-list">
        <view 
          v-for="work in works" 
          :key="work.id" 
          class="work-item"
          :class="{ selected: selectedWorks.includes(work.id) }"
          @tap="openWorkDetail(work)"
          @longpress="toggleWorkSelection(work.id)"
        >
          <view class="work-checkbox" v-if="isSelectionMode">
            <view class="checkbox" :class="{ checked: selectedWorks.includes(work.id) }"></view>
          </view>
          
          <view class="work-icon">
            <image src="/static/icons/file.svg" mode="aspectFit"></image>
          </view>
          
          <view class="work-info">
            <text class="work-title">{{ work.title }}</text>
            <text class="work-meta">{{ work.modifiedTime }} · {{ work.chapterCount }} 章节 · {{ work.wordCount }} 字</text>
          </view>
          
          <view class="work-actions">
            <view class="action-btn" @tap.stop="editWork(work)">
              <image src="/static/icons/edit.svg" mode="aspectFit"></image>
            </view>
            <view class="action-btn" @tap.stop="deleteWork(work)">
              <image src="/static/icons/trash.svg" mode="aspectFit"></image>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 批量操作栏 -->
    <view class="batch-toolbar" v-if="isSelectionMode && selectedWorks.length > 0">
      <text class="selected-count">已选择 {{ selectedWorks.length }} 个作品</text>
      <view class="batch-actions">
        <view class="batch-btn" @tap="deleteSelected">
          <image src="/static/icons/trash.svg" mode="aspectFit"></image>
          <text>删除</text>
        </view>
        <view class="batch-btn" @tap="exportSelected">
          <image src="/static/icons/file.svg" mode="aspectFit"></image>
          <text>导出</text>
        </view>
      </view>
    </view>
    </view>

    <!-- 底部导航栏 -->
    <BottomNav 
      :active-nav="'manage'"
      :is-dark-mode="isDarkMode"
      @switch-nav="handleNavSwitch"
      @toggle-theme="toggleTheme"
    />

    <!-- 创建作品弹窗 -->
    <CreateWorkModal 
      v-if="currentUser && currentUser.id"
      :visible="showCreateWorkModal" 
      @update:visible="showCreateWorkModal = $event"
      @created="handleWorkCreated"
      :userId="currentUser.id"
    />

    <!-- 文件管理弹窗 -->
    <FileManagerModal 
      v-if="currentUser && currentUser.id"
      :visible="showFileManagerModal" 
      @update:visible="showFileManagerModal = $event"
      :userId="currentUser.id"
    />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import CreateWorkModal from '@/components/CreateWorkModal.vue'
import FileManagerModal from '@/components/FileManagerModal.vue'
import BottomNav from '@/components/BottomNav.vue'
import FileSystemStorage from '@/utils/fileSystemStorage.js'
import { OfflineAuthService } from '@/utils/offlineAuth.js'
import themeManager, { isDarkMode as getIsDarkMode } from '@/utils/themeManager.js'

const fileStorage = FileSystemStorage

// 响应式数据
const currentTime = ref('')
const isDarkMode = ref(getIsDarkMode())
const currentUser = ref(null)
const showCreateWorkModal = ref(false)
const showFileManagerModal = ref(false)
const works = ref([])
const selectedWorks = ref([])
const isSelectionMode = ref(false)

// 页面初始化
onMounted(async () => {
  // 初始化主题
  isDarkMode.value = themeManager.isDarkMode()
  
  updateTime()
  setInterval(updateTime, 1000)
  
  // 监听主题变更事件
  uni.$on('theme-changed', (themeData) => {
    isDarkMode.value = themeData.isDark
  })
  
  // 获取当前用户
  try {
    currentUser.value = await OfflineAuthService.getCurrentUser()
    
    if (currentUser.value && currentUser.value.id) {
      await loadWorks()
    } else {
      console.warn('未找到有效用户信息，创建默认用户')
      // 创建默认用户
      currentUser.value = {
        id: 'default_user',
        username: '离线用户',
        email: ''
      }
      // 初始化默认用户存储
      await fileStorage.initUserStorage(currentUser.value.id)
      await loadWorks()
    }
  } catch (error) {
    console.error('Failed to load user data:', error)
    // 失败时创建默认用户
    currentUser.value = {
      id: 'default_user',
      username: '离线用户', 
      email: ''
    }
    try {
      await fileStorage.initUserStorage(currentUser.value.id)
      await loadWorks()
    } catch (initError) {
      console.error('初始化默认用户存储失败:', initError)
    }
  }
})

// 更新时间
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// 加载作品列表
const loadWorks = async () => {
  try {
    if (!currentUser.value || !currentUser.value.id) {
      console.warn('用户信息无效，跳过作品加载')
      works.value = []
      return
    }

    // 从文件系统获取作品列表
    const userWorks = await fileStorage.getUserWorks(currentUser.value.id)
    
    console.log('📚 管理页面加载到的作品数据:', userWorks)
    
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
        modifiedTime: new Date(work.updated_at || work.created_at).toLocaleDateString(),
        chapterCount: work.chapter_count || 0,
        wordCount: wordCount,
        structure_type: work.structure_type,
        file_structure: work.file_structure,
        local_file_path: work.local_file_path,
        folderName: work.folderName
      }
    })
    
    // 等待所有作品数据处理完成
    works.value = await Promise.all(worksPromises)
    
    console.log('✅ 管理页面作品列表加载完成，共', works.value.length, '个作品')
    
  } catch (error) {
    console.error('❌ 管理页面加载作品列表失败:', error)
    console.error('错误详情:', error.stack)
    works.value = []
  }
}

// 导航功能
const handleNavSwitch = (target) => {
  // 管理页面不处理，由 BottomNav 组件内部处理
   
}

const toggleTheme = () => {
  const newTheme = themeManager.toggleTheme()
  isDarkMode.value = themeManager.isDarkMode()
}

// 工具栏操作
const showImport = () => {
  uni.showToast({
    title: '导入功能开发中',
    icon: 'none'
  })
}

const showExport = () => {
  uni.showToast({
    title: '导出功能开发中',
    icon: 'none'
  })
}

const loadLocalWorks = async () => {
  try {
    if (!currentUser.value || !currentUser.value.id) {
      uni.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    // 获取用户的所有作品
    const userWorks = await fileStorage.getUserWorks(currentUser.value.id)
    if (userWorks && userWorks.length > 0) {
      // 更新作品列表
      works.value = userWorks.map(work => ({
        id: work.id,
        title: work.title,
        modifiedTime: new Date(work.updated_at).toLocaleDateString(),
        chapterCount: work.chapter_count || 0,
        wordCount: work.word_count || 0
      }))
      
      uni.showToast({
        title: `加载了 ${userWorks.length} 个作品`,
        icon: 'success'
      })
    } else {
      uni.showToast({
        title: '未找到作品',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('Failed to load user works:', error)
    uni.showToast({
      title: '加载作品失败',
      icon: 'error'
    })
  }
}

// 作品操作
const openWorkDetail = (work) => {
  if (isSelectionMode.value) {
    toggleWorkSelection(work.id)
  } else {
    uni.navigateTo({
      url: `/pages/manage/work-detail?id=${work.id}`
    })
  }
}

const editWork = (work) => {
  openWorkDetail(work)
}

const deleteWork = async (work) => {
  try {
    uni.showModal({
      title: '确认删除',
      content: `确定要删除作品"${work.title}"吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          await fileStorage.deleteWork(work.id)
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })
          await loadWorks()
        }
      }
    })
  } catch (error) {
    console.error('Failed to delete work:', error)
    uni.showToast({
      title: '删除失败',
      icon: 'error'
    })
  }
}

const toggleWorkSelection = (workId) => {
  const index = selectedWorks.value.indexOf(workId)
  if (index > -1) {
    selectedWorks.value.splice(index, 1)
  } else {
    selectedWorks.value.push(workId)
  }
  
  if (selectedWorks.value.length === 0) {
    isSelectionMode.value = false
  }
}

const deleteSelected = async () => {
  if (selectedWorks.value.length === 0) return
  
  try {
    uni.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedWorks.value.length} 个作品吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          for (const workId of selectedWorks.value) {
            await fileStorage.deleteWork(workId)
          }
          
          uni.showToast({
            title: `删除成功`,
            icon: 'success'
          })
          
          selectedWorks.value = []
          isSelectionMode.value = false
          await loadWorks()
        }
      }
    })
  } catch (error) {
    console.error('Failed to delete selected works:', error)
    uni.showToast({
      title: '删除失败',
      icon: 'error'
    })
  }
}

const exportSelected = () => {
  uni.showToast({
    title: '导出功能开发中',
    icon: 'none'
  })
}

const handleWorkCreated = (work) => {
  uni.showToast({
    title: '作品创建成功',
    icon: 'success'
  })
  loadWorks()
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  color: #ffffff;
  padding-bottom: 120rpx;
}

.page-container.light-theme {
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  color: #333333;
}

/* 管理内容 */
.manage-content {
  padding: 0 30rpx;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30rpx;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  backdrop-filter: blur(10rpx);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .toolbar {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.toolbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 25rpx 20rpx;
  border-radius: 15rpx;
  transition: all 0.3s ease;
  min-width: 120rpx;
  min-height: 80rpx;
}

.toolbar-item:not(.disabled):active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.1);
}

.toolbar-item.disabled {
  opacity: 0.5;
}

.toolbar-text {
  font-size: 24rpx;
  text-align: center;
  padding: 15rpx 20rpx;
  display: block;
}

/* 作品列表 */
.works-section {
  margin-bottom: 40rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
}

.work-count {
  font-size: 26rpx;
  opacity: 0.7;
}

.works-list {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  overflow: hidden;
  backdrop-filter: blur(10rpx);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .works-list {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.work-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s ease;
}

.light-theme .work-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.work-item:last-child {
  border-bottom: none;
}

.work-item.selected {
  background: rgba(0, 122, 255, 0.1);
}

.work-checkbox {
  width: 40rpx;
  height: 40rpx;
  margin-right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8rpx;
  transition: all 0.2s ease;
}

.checkbox.checked {
  background: #007AFF;
  border-color: #007AFF;
  position: relative;
}

.checkbox.checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 24rpx;
  font-weight: bold;
}

.work-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: 20rpx;
}

.work-icon image {
  width: 100%;
  height: 100%;
}

.work-info {
  flex: 1;
}

.work-title {
  font-size: 30rpx;
  display: block;
  margin-bottom: 5rpx;
}

.work-meta {
  font-size: 24rpx;
  opacity: 0.6;
  display: block;
}

.work-actions {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  width: 36rpx;
  height: 36rpx;
  padding: 8rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.1);
}

.action-btn image {
  width: 100%;
  height: 100%;
}

/* 批量操作栏 */
.batch-toolbar {
  position: fixed;
  bottom: 120rpx;
  left: 0;
  right: 0;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(20rpx);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
}

.light-theme .batch-toolbar {
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.selected-count {
  font-size: 28rpx;
}

.batch-actions {
  display: flex;
  gap: 20rpx;
}

.batch-btn {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 15rpx 20rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
}

.batch-btn image {
  width: 24rpx;
  height: 24rpx;
}

.batch-btn text {
  font-size: 26rpx;
}

/* 状态栏 */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  height: 60rpx;
}

.status-time {
  font-size: 28rpx;
  font-weight: 600;
}

.status-icons {
  display: flex;
  gap: 15rpx;
}

.status-icon {
  width: 32rpx;
  height: 32rpx;
}

/* 页面标题 */
.page-header {
  padding: 40rpx 30rpx 30rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 10rpx;
}

.page-subtitle {
  font-size: 28rpx;
  opacity: 0.7;
}

/* 管理内容 */
.manage-content {
  padding: 0 30rpx;
}

/* 统计卡片 */
.stats-section {
  margin-bottom: 40rpx;
}

.stats-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 30rpx;
  display: flex;
  justify-content: space-around;
  backdrop-filter: blur(10rpx);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .stats-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stats-item {
  text-align: center;
  flex: 1;
}

.stats-number {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.stats-label {
  font-size: 24rpx;
  opacity: 0.7;
}

/* 快速操作 */
.quick-actions {
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
  display: block;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.action-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15rpx;
  padding: 30rpx 20rpx;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.light-theme .action-item {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.action-item:active {
  transform: scale(0.95);
}

.action-icon {
  width: 48rpx;
  height: 48rpx;
  margin: 0 auto 15rpx;
}

.action-icon image {
  width: 100%;
  height: 100%;
}

.action-text {
  font-size: 24rpx;
  display: block;
}

/* 文件列表 */
.file-section {
  margin-bottom: 40rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.view-all {
  font-size: 28rpx;
  color: #007AFF;
  opacity: 0.8;
}

.file-list {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  overflow: hidden;
  backdrop-filter: blur(10rpx);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .file-list {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.file-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.light-theme .file-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.file-item:last-child {
  border-bottom: none;
}

.file-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: 20rpx;
}

.file-icon image {
  width: 100%;
  height: 100%;
}

.file-info {
  flex: 1;
}

.file-name {
  font-size: 30rpx;
  display: block;
  margin-bottom: 5rpx;
}

.file-meta {
  font-size: 24rpx;
  opacity: 0.6;
  display: block;
}

.file-actions {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  width: 36rpx;
  height: 36rpx;
  padding: 8rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.1);
}

.action-btn image {
  width: 100%;
  height: 100%;
}


</style>
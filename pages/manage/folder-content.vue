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

    <!-- 页面头部 -->
    <view class="page-header">
      <view class="header-left" @tap="goBack">
        <image class="back-icon" src="/static/icons/times.svg" mode="aspectFit"></image>
      </view>
      <view class="header-center">
        <text class="page-title">{{ folderName }}</text>
      </view>
      <view class="header-right">
        <view class="action-btn" @tap="createNewFile">
          <text class="action-text">新建</text>
        </view>
      </view>
    </view>

    <!-- 文件列表 -->
    <view class="file-section">
      <view class="section-header">
        <view class="breadcrumb">
          <text class="breadcrumb-item">{{ workInfo.title }}</text>
          <text class="breadcrumb-separator">/</text>
          <text class="breadcrumb-item current">{{ folderName }}</text>
        </view>
        <text class="file-count">共 {{ files.length }} 个文件</text>
      </view>
      
      <view class="file-list">
        <view 
          v-for="file in files" 
          :key="file.id" 
          class="file-item"
          :class="{ selected: selectedFiles.includes(file.id) }"
          @tap="openFile(file)"
          @longpress="toggleFileSelection(file.id)"
        >
          <view class="file-checkbox" v-if="isSelectionMode">
            <view class="checkbox" :class="{ checked: selectedFiles.includes(file.id) }"></view>
          </view>
          
          <view class="file-icon">
            <image :src="getFileIcon(file.type)" mode="aspectFit"></image>
          </view>
          
          <view class="file-info">
            <text class="file-name">{{ file.name }}</text>
            <text class="file-meta">{{ file.modifiedTime }} · {{ file.size }} · {{ file.wordCount }} 字</text>
          </view>
          
          <view class="file-actions">
            <view class="action-btn" @tap.stop="editFile(file)">
              <image src="/static/icons/edit.svg" mode="aspectFit"></image>
            </view>
            <view class="action-btn" @tap.stop="deleteFile(file)">
              <image src="/static/icons/trash.svg" mode="aspectFit"></image>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 批量操作栏 -->
    <view class="batch-toolbar" v-if="isSelectionMode && selectedFiles.length > 0">
      <text class="selected-count">已选择 {{ selectedFiles.length }} 个文件</text>
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

    <!-- 底部导航栏 -->
    <BottomNav 
      :active-nav="'manage'"
      :is-dark-mode="isDarkMode"
      @switch-nav="handleNavSwitch"
      @toggle-theme="toggleTheme"
    />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import BottomNav from '@/components/BottomNav.vue'
import enhancedFileSystem from '@/utils/enhancedFileSystem.js'
import themeManager, { isDarkMode as getIsDarkMode } from '@/utils/themeManager.js'

// 响应式数据
const currentTime = ref('')
const isDarkMode = ref(getIsDarkMode())
const isSelectionMode = ref(false)
const selectedFiles = ref([])
const workId = ref('')
const folderId = ref('')
const folderName = ref('')
const workInfo = ref({})
const files = ref([])

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
  
  // 获取页面参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  workId.value = currentPage.options.workId || ''
  folderId.value = currentPage.options.folderId || ''
  folderName.value = decodeURIComponent(currentPage.options.folderName || '')
  
  if (workId.value && folderId.value) {
    await loadWorkInfo()
    await loadFiles()
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

// 加载作品信息
const loadWorkInfo = async () => {
  try {
    // 获取作品基本信息
    workInfo.value = {
      id: workId.value,
      title: '我的小说' // 应该从存储中获取真实标题
    }
  } catch (error) {
    console.error('Failed to load work info:', error)
  }
}

// 加载文件列表
const loadFiles = async () => {
  try {
    // 这里应该从存储中获取文件夹内容
    // 暂时使用模拟数据
    files.value = [
      {
        id: '1',
        name: '第一章：序章',
        type: 'chapter',
        modifiedTime: '2024-01-18',
        size: '3.2KB',
        wordCount: 1500
      },
      {
        id: '2',
        name: '第二章：开端',
        type: 'chapter',
        modifiedTime: '2024-01-17',
        size: '4.5KB',
        wordCount: 2100
      },
      {
        id: '3',
        name: '第三章：发展',
        type: 'chapter',
        modifiedTime: '2024-01-16',
        size: '5.1KB',
        wordCount: 2400
      }
    ]
  } catch (error) {
    console.error('Failed to load files:', error)
  }
}

// 获取文件图标
const getFileIcon = (type) => {
  const iconMap = {
    chapter: '/static/icons/file.svg',
    character: '/static/icons/user.svg',
    setting: '/static/icons/cog.svg',
    foreshadowing: '/static/icons/lightbulb.svg',
    map: '/static/icons/map.svg',
    note: '/static/icons/file.svg'
  }
  return iconMap[type] || '/static/icons/file.svg'
}

// 导航功能
const handleNavSwitch = (target) => {
   
}

const toggleTheme = () => {
  const newTheme = themeManager.toggleTheme()
  isDarkMode.value = themeManager.isDarkMode()
}

const goBack = () => {
  uni.navigateBack()
}

// 文件操作
const openFile = (file) => {
  if (isSelectionMode.value) {
    toggleFileSelection(file.id)
  } else {
    // 跳转到编辑页面
    const url = `/pages/edit/file?workId=${workId.value}&fileId=${file.id}`
    uni.navigateTo({ url })
  }
}

const editFile = (file) => {
  openFile(file)
}

const deleteFile = async (file) => {
  try {
    uni.showModal({
      title: '确认删除',
      content: `确定要删除"${file.name}"吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          await fileStorage.deleteFile(file.id)
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })
          await loadFiles()
        }
      }
    })
  } catch (error) {
    console.error('Failed to delete file:', error)
    uni.showToast({
      title: '删除失败',
      icon: 'error'
    })
  }
}

const createNewFile = () => {
  // 跳转到创建文件页面
  const url = `/pages/create/file?workId=${workId.value}&folderId=${folderId.value}&folderName=${encodeURIComponent(folderName.value)}`
  uni.navigateTo({ url })
}

// 选择模式操作
const toggleFileSelection = (fileId) => {
  const index = selectedFiles.value.indexOf(fileId)
  if (index > -1) {
    selectedFiles.value.splice(index, 1)
  } else {
    selectedFiles.value.push(fileId)
  }
  
  if (selectedFiles.value.length === 0) {
    isSelectionMode.value = false
  }
}

const deleteSelected = async () => {
  if (selectedFiles.value.length === 0) return
  
  try {
    uni.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedFiles.value.length} 个文件吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          for (const fileId of selectedFiles.value) {
            await fileStorage.deleteFile(fileId)
          }
          
          uni.showToast({
            title: `删除成功`,
            icon: 'success'
          })
          
          selectedFiles.value = []
          isSelectionMode.value = false
          await loadFiles()
        }
      }
    })
  } catch (error) {
    console.error('Failed to delete selected files:', error)
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

/* 页面头部 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10rpx);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .page-header {
  background: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.header-left, .header-right {
  width: 80rpx;
  display: flex;
  justify-content: center;
}

.header-center {
  flex: 1;
  text-align: center;
}

.back-icon {
  width: 40rpx;
  height: 40rpx;
}

.page-title {
  font-size: 32rpx;
  font-weight: 600;
}

.action-btn {
  padding: 10rpx 20rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
}

.action-text {
  font-size: 26rpx;
}

/* 文件列表 */
.file-section {
  margin: 30rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.breadcrumb-item {
  font-size: 26rpx;
  opacity: 0.8;
}

.breadcrumb-item.current {
  font-weight: 600;
  opacity: 1;
}

.breadcrumb-separator {
  font-size: 24rpx;
  opacity: 0.5;
}

.file-count {
  font-size: 26rpx;
  opacity: 0.7;
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
  transition: background-color 0.2s ease;
}

.light-theme .file-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.file-item:last-child {
  border-bottom: none;
}

.file-item.selected {
  background: rgba(0, 122, 255, 0.1);
}

.file-checkbox {
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


</style>
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
        <text class="page-title">{{ workInfo.title }}</text>
      </view>
      <view class="header-right">
        <view class="action-btn" @tap="toggleEditMode">
          <text class="action-text">{{ isEditMode ? '完成' : '编辑' }}</text>
        </view>
      </view>
    </view>

    <!-- 作品信息 -->
    <view class="work-info-card">
      <view class="info-row">
        <text class="info-label">创建时间</text>
        <text class="info-value">{{ workInfo.createdTime }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">修改时间</text>
        <text class="info-value">{{ workInfo.modifiedTime }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">总字数</text>
        <text class="info-value">{{ workInfo.wordCount }} 字</text>
      </view>
    </view>

    <!-- 文件夹列表 -->
    <view class="folders-section">
      <view class="section-header">
        <text class="section-title">内容管理</text>
        <text class="folder-count">共 {{ folders.length }} 个文件夹</text>
      </view>
      
      <view class="folders-grid">
        <view 
          v-for="folder in folders" 
          :key="folder.id" 
          class="folder-item"
          @tap="openFolder(folder)"
        >
          <view class="folder-icon">
            <image :src="getFolderIcon(folder.type)" mode="aspectFit"></image>
          </view>
          <text class="folder-name">{{ folder.name }}</text>
          <text class="folder-count">{{ folder.count }} 项</text>
          
          <!-- 编辑模式下的操作按钮 -->
          <view class="folder-actions" v-if="isEditMode">
            <view class="folder-action-btn" @tap.stop="editFolder(folder)">
              <image src="/static/icons/edit.svg" mode="aspectFit"></image>
            </view>
            <view class="folder-action-btn" @tap.stop="deleteFolder(folder)">
              <image src="/static/icons/trash.svg" mode="aspectFit"></image>
            </view>
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
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import BottomNav from '@/components/BottomNav.vue'
import enhancedFileSystem from '@/utils/enhancedFileSystem.js'
import themeManager, { isDarkMode as getIsDarkMode } from '@/utils/themeManager.js'

// 响应式数据
const currentTime = ref('')
const isDarkMode = ref(getIsDarkMode())
const isEditMode = ref(false)
const workInfo = ref({})
const folders = ref([])
const workId = ref('')

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
  
  // 获取作品ID
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  workId.value = currentPage.options.id || ''
  
  if (workId.value) {
    await loadWorkInfo()
    await loadFolders()
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
    // 这里应该从存储中获取作品信息
    // 暂时使用模拟数据
    workInfo.value = {
      id: workId.value,
      title: '我的小说',
      createdTime: '2024-01-15',
      modifiedTime: '2024-01-18',
      wordCount: 15000
    }
  } catch (error) {
    console.error('Failed to load work info:', error)
  }
}

// 加载文件夹列表
const loadFolders = async () => {
  try {
    // 这里应该从存储中获取文件夹信息
    // 暂时使用模拟数据
    folders.value = [
      {
        id: 'chapters',
        name: '章节',
        type: 'chapter',
        count: 5,
        description: '小说章节内容'
      },
      {
        id: 'characters',
        name: '人物',
        type: 'character',
        count: 12,
        description: '角色设定'
      },
      {
        id: 'settings',
        name: '设定',
        type: 'setting',
        count: 8,
        description: '世界观设定'
      },
      {
        id: 'foreshadowings',
        name: '伏笔',
        type: 'foreshadowing',
        count: 3,
        description: '伏笔记录'
      },
      {
        id: 'maps',
        name: '地图',
        type: 'map',
        count: 2,
        description: '地理设定'
      },
      {
        id: 'notes',
        name: '笔记',
        type: 'note',
        count: 15,
        description: '创作笔记'
      }
    ]
  } catch (error) {
    console.error('Failed to load folders:', error)
  }
}

// 获取文件夹图标
const getFolderIcon = (type) => {
  const iconMap = {
    chapter: '/static/icons/file.svg',
    character: '/static/icons/user.svg',
    setting: '/static/icons/cog.svg',
    foreshadowing: '/static/icons/lightbulb.svg',
    map: '/static/icons/map.svg',
    note: '/static/icons/file.svg'
  }
  return iconMap[type] || '/static/icons/folder.svg'
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

// 文件夹操作
const openFolder = (folder) => {
  const url = `/pages/manage/folder-content?workId=${workId.value}&folderId=${folder.id}&folderName=${encodeURIComponent(folder.name)}`
  uni.navigateTo({ url })
}

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
}

const editFolder = (folder) => {
  uni.showToast({
    title: '编辑文件夹功能开发中',
    icon: 'none'
  })
}

const deleteFolder = async (folder) => {
  try {
    uni.showModal({
      title: '确认删除',
      content: `确定要删除文件夹"${folder.name}"吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          // 执行删除操作
          await fileStorage.deleteFolder(workId.value, folder.id)
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })
          // 重新加载数据
          await loadFolders()
        }
      }
    })
  } catch (error) {
    console.error('Failed to delete folder:', error)
    uni.showToast({
      title: '删除失败',
      icon: 'error'
    })
  }
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

/* 作品信息卡片 */
.work-info-card {
  margin: 30rpx;
  padding: 30rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  backdrop-filter: blur(10rpx);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .work-info-card {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 28rpx;
  opacity: 0.7;
}

.info-value {
  font-size: 28rpx;
  font-weight: 500;
}

/* 文件夹列表 */
.folders-section {
  margin: 30rpx;
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

.folder-count {
  font-size: 26rpx;
  opacity: 0.7;
}

.folders-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.folder-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  padding: 30rpx;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.light-theme .folder-item {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.folder-item:active {
  transform: scale(0.95);
}

.folder-icon {
  width: 48rpx;
  height: 48rpx;
  margin-bottom: 15rpx;
}

.folder-icon image {
  width: 100%;
  height: 100%;
}

.folder-name {
  font-size: 30rpx;
  font-weight: 600;
  display: block;
  margin-bottom: 10rpx;
}

.folder-count {
  font-size: 24rpx;
  opacity: 0.7;
  display: block;
}

.folder-actions {
  position: absolute;
  top: 30rpx;
  right: 30rpx;
  display: flex;
  gap: 10rpx;
}

.folder-action-btn {
  width: 36rpx;
  height: 36rpx;
  padding: 8rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.1);
}

.folder-action-btn image {
  width: 100%;
  height: 100%;
}


</style>
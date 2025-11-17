<template>
  <!-- 页面主容器 -->
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

    <!-- 用户信息区域 -->
    <view class="user-section">
      <view class="user-info" @tap="goToProfile">
        <view class="avatar-container">
          <view class="user-avatar">
            <image class="avatar-icon" src="/static/icons/user.svg" mode="aspectFit"></image>
          </view>
        </view>
        <view class="user-details">
          <text class="user-name">夜行者</text>
          <text class="user-status">继续你的创作之旅</text>
        </view>
      </view>
      <button class="notification-btn" @tap="showNotifications">
        <image class="notification-icon" src="/static/icons/bell.svg" mode="aspectFit"></image>
      </button>
    </view>

    <!-- 数据统计卡片 -->
    <view class="stats-card">
      <view class="stats-item">
        <text class="stats-number stats-primary">12</text>
        <text class="stats-label">总作品</text>
      </view>
      <view class="stats-item">
        <text class="stats-number stats-secondary">48</text>
        <text class="stats-label">人物</text>
      </view>
      <view class="stats-item">
        <text class="stats-number stats-tertiary">7</text>
        <text class="stats-label">地图</text>
      </view>
    </view>

    <!-- 标签导航 -->
    <view class="tabs-container">
      <scroll-view class="tabs-scroll" scroll-x="true" show-scrollbar="false">
        <view class="tabs">
          <view 
            v-for="tab in tabs" 
            :key="tab.id" 
            class="tab-item" 
            :class="{ active: activeTab === tab.id }"
            @tap="switchTab(tab.id)"
          >
            <text class="tab-text">{{ tab.name }}</text>
            <view class="tab-indicator" :class="{ active: activeTab === tab.id }"></view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 作品列表 -->
    <scroll-view class="works-list" scroll-y="true">
      <view class="work-items">
        <view 
          v-for="work in filteredWorks" 
          :key="work.id" 
          class="work-item"
          @tap="openWork(work.id)"
        >
          <view class="work-content">
            <view class="work-main">
              <text class="work-title">{{ work.title }}</text>
              <text class="work-time">{{ work.modifiedTime }}</text>
            </view>
            <view class="work-info">
              <text class="work-chapter">{{ work.chapter }}</text>
              <view class="work-meta">
                <image class="work-icon" src="/static/icons/file.svg" mode="aspectFit"></image>
                <text class="work-words">{{ work.wordCount }}字</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 悬浮创建按钮 -->
    <view class="fab-container">
      <view class="fab-menu" :class="{ show: isMenuOpen }">
        <button 
          v-for="menuItem in menuItems" 
          :key="menuItem.id" 
          class="fab-menu-item"
          @tap="handleMenuAction(menuItem.action)"
        >
          <image class="fab-icon" :src="getIconPath(menuItem.icon)" mode="aspectFit"></image>
        </button>
      </view>
      
      <button class="fab-main" @tap="toggleMenu">
        <image class="fab-main-icon" :src="isMenuOpen ? '/static/icons/times.svg' : '/static/icons/plus.svg'" mode="aspectFit"></image>
      </button>
    </view>

    <!-- 底部导航栏 -->
    <view class="bottom-nav">
      <view class="nav-item active" @tap="switchNav('home')">
        <view class="nav-icon">
          <image class="nav-icon-img" src="/static/icons/home.svg" mode="aspectFit"></image>
        </view>
        <text class="nav-text">首页</text>
      </view>
      <view class="nav-item" @tap="toggleTheme">
        <view class="nav-icon">
          <image class="nav-icon-img" :src="isDarkMode ? '/static/icons/moon.svg' : '/static/icons/sun.svg'" mode="aspectFit"></image>
        </view>
        <text class="nav-text">主题</text>
      </view>
      <view class="nav-item" @tap="switchNav('service')">
        <view class="nav-icon">
          <image class="nav-icon-img" src="/static/icons/th-large.svg" mode="aspectFit"></image>
        </view>
        <text class="nav-text">服务</text>
      </view>
      <view class="nav-item" @tap="switchNav('profile')">
        <view class="nav-icon">
          <image class="nav-icon-img" src="/static/icons/user.svg" mode="aspectFit"></image>
        </view>
        <text class="nav-text">我的</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

// 响应式数据
const currentTime = ref('')
const activeTab = ref('recent')
const isMenuOpen = ref(false)
const isDarkMode = ref(true)
const activeNav = ref('home')

// 标签数据
const tabs = ref([
  { id: 'recent', name: '最近' },
  { id: 'favorite', name: '收藏' },
  { id: 'local', name: '本机' },
  { id: 'map', name: '地图' }
])

// 菜单项数据
const menuItems = ref([
  { id: 'work', icon: 'icon-file-alt', action: 'createNewWork' },
  { id: 'character', icon: 'icon-user-plus', action: 'createNewCharacter' },
  { id: 'setting', icon: 'icon-cog', action: 'createNewSetting' },
  { id: 'foreshadowing', icon: 'icon-lightbulb', action: 'createNewForeshadowing' },
  { id: 'map', icon: 'icon-map-marked-alt', action: 'createNewMap' }
])

// 作品数据
const works = ref([
  {
    id: 'work_001',
    title: '《1》',
    modifiedTime: '2小时前修改',
    chapter: '第12章',
    wordCount: '1,247',
    type: 'recent'
  },
  {
    id: 'work_002',
    title: '《2》',
    modifiedTime: '昨天修改',
    chapter: '第8章',
    wordCount: '856',
    type: 'recent'
  },
  {
    id: 'work_003',
    title: '《3》',
    modifiedTime: '3天前修改',
    chapter: '第3章',
    wordCount: '2,103',
    type: 'recent'
  },
  {
    id: 'work_004',
    title: '《4》',
    modifiedTime: '1周前修改',
    chapter: '第15章',
    wordCount: '3,456',
    type: 'recent'
  }
])

// 计算属性：根据当前标签筛选作品
const filteredWorks = computed(() => {
  return works.value.filter(work => work.type === activeTab.value)
})

// 生命周期
onMounted(() => {
  updateTime()
  setInterval(updateTime, 60000) // 每分钟更新一次时间
})

// 方法
const updateTime = () => {
  const now = new Date()
  currentTime.value = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`
}

const switchTab = (tabId) => {
  activeTab.value = tabId
}

const switchNav = (navType) => {
  activeNav.value = navType
  
  if (navType === 'service') {
    goToService()
  } else if (navType === 'profile') {
    goToProfile()
  }
}

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  activeNav.value = 'theme'
  
  // 切换主题逻辑 - 使用UniApp的样式系统
  if (isDarkMode.value) {
    // 切换到暗色主题
    uni.setStorageSync('theme', 'dark')
  } else {
    // 切换到亮色主题
    uni.setStorageSync('theme', 'light')
  }
}

const handleMenuAction = (action) => {
  // 根据不同的菜单项执行不同的操作
  switch (action) {
    case 'createNewWork':
      console.log('创建新作品')
      break
    case 'createNewCharacter':
      console.log('创建新人物')
      break
    case 'createNewSetting':
      console.log('创建新设定')
      break
    case 'createNewForeshadowing':
      console.log('创建新伏笔')
      break
    case 'createNewMap':
      console.log('创建新地图')
      break
  }
  isMenuOpen.value = false
}

const openWork = (workId) => {
  console.log('打开作品:', workId)
  // 这里可以跳转到作品编辑页面
}

const goToProfile = () => {
  console.log('跳转到个人资料')
}

const goToService = () => {
  console.log('跳转到服务页面')
}

const showNotifications = () => {
  console.log('显示通知')
}

// 图标路径映射函数
const getIconPath = (iconClass) => {
  const iconMap = {
    'icon-file-alt': '/static/icons/file.svg',
    'icon-user-plus': '/static/icons/user.svg',
    'icon-cog': '/static/icons/cog.svg',
    'icon-lightbulb': '/static/icons/lightbulb.svg',
    'icon-map-marked-alt': '/static/icons/map.svg'
  }
  return iconMap[iconClass] || '/static/icons/file.svg'
}

</script>

<style scoped>
/* 页面主容器 */
.page-container {
  background-color: #1A1A1A;
  color: #FFFFFF;
  min-height: 100vh;
  position: relative;
  padding-bottom: 80px;
  box-sizing: border-box;
  overflow-x: hidden;
  transition: all 0.5s ease;
}

/* 亮色主题样式 */
.page-container.light-theme {
  background-color: #F5F5F5;
  color: #333333;
}

.page-container.light-theme .user-section {
  background: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid #E0E0E0;
}

.page-container.light-theme .user-section .user-name {
  color: #333333;
}

.page-container.light-theme .user-section .user-status {
  color: #666666;
}

.page-container.light-theme .work-item {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

/* 作品标题亮色主题样式 */
.page-container.light-theme .work-title {
  color: #333333;
}

.page-container.light-theme .work-time {
  color: #666666;
}

.page-container.light-theme .work-chapter {
  color: #666666;
}

.page-container.light-theme .work-words {
  color: #666666;
}

/* 作品标题亮色主题样式 */
.page-container.light-theme .work-title {
  color: #333333;
}

.page-container.light-theme .work-time {
  color: #666666;
}

.page-container.light-theme .work-chapter {
  color: #666666;
}

.page-container.light-theme .work-words {
  color: #666666;
}

/* 作品标题亮色主题样式 */
.page-container.light-theme .work-title {
  color: #333333;
}

.page-container.light-theme .work-time {
  color: #666666;
}

.page-container.light-theme .work-chapter {
  color: #666666;
}

.page-container.light-theme .work-words {
  color: #666666;
}

/* 作品标题亮色主题样式 */
.page-container.light-theme .work-title {
  color: #333333;
}

.page-container.light-theme .work-time {
  color: #666666;
}

.page-container.light-theme .work-chapter {
  color: #666666;
}

.page-container.light-theme .work-words {
  color: #666666;
}

.page-container.light-theme .bottom-nav {
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

/* 数据统计卡片亮色主题样式 */
.page-container.light-theme .stats-card {
  background: linear-gradient(to right, #F0F0F0, #E8E8E8);
}

.page-container.light-theme .stats-label {
  color: #666666;
}

/* 状态栏样式 */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #1A1A1A;
  font-size: 12px;
  position: relative;
  color: #FFFFFF;
}

/* 状态栏亮色主题样式 */
.page-container.light-theme .status-bar {
  background-color: #F8F8F8;
  color: #333333;
}

.status-icons {
  display: flex;
  gap: 8px;
}

.status-icon {
  width: 16px;
  height: 16px;
}

/* 用户信息区域 */
.user-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--card-bg, rgba(45, 45, 45, 0.7));
  border-bottom: 1px solid var(--border-color, #404040);
  transition: all 0.5s ease;
}

/* 通知按钮在用户信息区域右侧 */
.notification-btn {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: rgba(64, 64, 64, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  flex-shrink: 0;
  margin-right: 8px;
}

.notification-icon {
  width: 24px;
  height: 24px;
}

/* 通知按钮亮色主题样式 */
.page-container.light-theme .notification-btn {
  background: rgba(0, 0, 0, 0.1);
}

.user-section .user-name {
  color: var(--text-color, #FFFFFF);
  transition: color 0.5s ease;
}

.user-section .user-status {
  color: var(--text-secondary, #B3B3B3);
  transition: color 0.5s ease;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  width: 24px;
  height: 24px;
  color: white;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: #FFFFFF;
}

.user-status {
  font-size: 12px;
  color: #B3B3B3;
  margin-top: 2px;
}



/* 数据统计卡片 */
.stats-card {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 16px 0;
  background: linear-gradient(to right, #2D2D2D, #404040);
}

.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-number {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.stats-primary {
  color: #FF6B35;
}

.stats-secondary {
  color: #4ECDC4;
}

.stats-tertiary {
  color: #45B7D1;
}

.stats-label {
  font-size: 12px;
  color: #B3B3B3;
}

/* 标签导航 */
.tabs-container {
  margin: 16px 0;
}

.tabs-scroll {
  white-space: nowrap;
}

.tabs {
  display: flex;
  padding: 0 16px;
  gap: 24px;
}

.tab-item {
  position: relative;
  padding: 8px 0;
  flex-shrink: 0;
}

.tab-text {
  font-size: 14px;
  color: #B3B3B3;
  transition: color 0.3s ease;
}

.tab-item.active .tab-text {
  color: #FF6B35;
  font-weight: 500;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #FF6B35;
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.tab-indicator.active {
  transform: scaleX(1);
}

/* 作品列表 */
.works-list {
  height: calc(100vh - 440px);
  padding: 0 16px;
  box-sizing: border-box;
  margin-bottom: 16px;
}

.work-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.work-item {
  background: rgba(45, 45, 45, 0.7);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
}

.work-item:active {
  background: rgba(64, 64, 64, 0.5);
  transform: translateY(1px);
}

.work-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.work-main {
  flex: 1;
}

.work-title {
  font-size: 14px;
  font-weight: 500;
  color: #FFFFFF;
  display: block;
}

.work-time {
  font-size: 11px;
  color: #B3B3B3;
  margin-top: 2px;
  display: block;
}

.work-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.work-chapter {
  font-size: 12px;
  color: #B3B3B3;
}

.work-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #808080;
}

.work-icon {
  width: 14px;
  height: 14px;
}

/* 悬浮按钮 */
.fab-container {
  position: fixed;
  bottom: 100px;
  right: 24px;
  z-index: 999;
}

.fab-menu {
  position: absolute;
  bottom: 80px;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 0;
  transform: scale(0);
  transform-origin: bottom right;
  transition: all 0.3s ease;
}

.fab-menu.show {
  opacity: 1;
  transform: scale(1);
}

.fab-menu-item {
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: #2D2D2D;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.fab-menu-item .iconfont {
  color: #FFFFFF;
  font-size: 18px;
}

.fab-main {
  width: 64px;
  height: 64px;
  border-radius: 32px;
  background: linear-gradient(135deg, #FF6B35 0%, #FF8A65 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
}

.fab-main .iconfont {
  color: white;
  font-size: 20px;
}

/* 底部导航栏 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--nav-bg, rgba(45, 45, 45, 0.95));
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgba(64, 64, 64, 0.3);
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 72px;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 998;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  color: #B3B3B3;
  flex: 1;
  min-height: 56px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 10px;
  margin: 0 2px;
}

.nav-item:active {
  background: rgba(255, 107, 53, 0.1);
  transform: scale(0.95);
}

.nav-item.active {
  color: #FF6B35;
}

.nav-icon {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1px;
  height: 24px;
}

.nav-icon-img {
  width: 20px;
  height: 20px;
  transition: all 0.3s ease;
}

.nav-item.active .nav-icon-img {
  transform: translateY(-1px);
}

.nav-text {
  font-size: 10px;
  line-height: 1;
  font-weight: 500;
  margin-top: 2px;
  transition: all 0.3s ease;
}

.nav-item.active .nav-text {
  font-weight: 600;
  color: #FF6B35;
}
</style>
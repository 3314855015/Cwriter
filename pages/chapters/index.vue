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
        <view class="action-btn" @tap="addChapter">
          <image class="add-icon" src="/static/icons/plus.svg" mode="aspectFit"></image>
        </view>
      </view>
    </view>

    <!-- 章节列表 -->
    <view class="chapters-container">
      <view class="section-header">
        <text class="section-title">章节列表</text>
        <text class="chapter-count">共 {{ chapters.length }} 章</text>
      </view>
      
      <view class="chapters-list">
        <view 
          v-for="(chapter, index) in chapters" 
          :key="chapter.id" 
          class="chapter-item"
          @tap="openChapter(chapter)"
        >
          <view class="chapter-content">
            <view class="chapter-main">
              <text class="chapter-title">第{{ index + 1 }}章 {{ chapter.title }}</text>
              <text class="chapter-time">{{ formatTime(chapter.updated_at) }}</text>
            </view>
            <view class="chapter-info">
              <text class="chapter-words">{{ chapter.word_count || 0 }}字</text>
              <view class="chapter-status" :class="{ completed: chapter.is_completed }">
                <text class="status-text">{{ chapter.is_completed ? '已完成' : '写作中' }}</text>
              </view>
            </view>
          </view>
          
          <!-- 删除按钮 -->
          <view class="chapter-actions" v-if="isEditMode">
            <view class="chapter-action-btn" @tap.stop="deleteChapter(chapter)">
              <image src="/static/icons/trash.svg" mode="aspectFit"></image>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="chapters.length === 0">
        <image class="empty-icon" src="/static/icons/file.svg" mode="aspectFit"></image>
        <text class="empty-text">还没有章节</text>
        <view class="empty-btn" @tap="addChapter">
          <text class="btn-text">创建第一章</text>
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
import { ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import BottomNav from '@/components/BottomNav.vue'
import FileSystemStorage from '@/utils/fileSystemStorage.js'

const fileStorage = FileSystemStorage

// 响应式数据
const currentTime = ref('')
const isDarkMode = ref(true)
const isEditMode = ref(false)
const workInfo = ref({ title: '加载中...' })
const chapters = ref([])
const workId = ref('')
const userId = ref('')

let clockTimer = null

const updateTime = () => {
  const now = new Date()
  currentTime.value = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`
}

const startClock = () => {
  if (clockTimer) {
    clearInterval(clockTimer)
  }
  clockTimer = setInterval(updateTime, 60000)
}

const stopClock = () => {
  if (clockTimer) {
    clearInterval(clockTimer)
    clockTimer = null
  }
}

onLoad((options) => {
  if (!options || !options.workId) {
    console.error('❌ 章节页面缺少必要参数 workId')
    uni.showToast({
      title: '参数错误',
      icon: 'error'
    })
    setTimeout(() => uni.navigateBack(), 10)
    return
  }

  workId.value = options.workId
  userId.value = options.userId || 'default_user'

  loadWorkChapters()
  updateTime()
  startClock()
})

onUnload(() => {
  stopClock()
})

const loadWorkChapters = async () => {
  try {
     
    
    // 读取作品配置
    const workPath = fileStorage.getWorkPath(userId.value, workId.value)
    const workConfigPath = `${workPath}/work.config.json`
    const workConfig = await fileStorage.readFile(workConfigPath)
    
    if (workConfig) {
      workInfo.value = workConfig
       
    }
    
    // 读取章节列表
    const chaptersPath = `${workPath}/chapters/chapters.json`
    const chaptersData = await fileStorage.readFile(chaptersPath) || []
    
     
    
    // 确保是数组
    if (!Array.isArray(chaptersData)) {
      console.warn('⚠️ 章节数据不是数组，重置为空数组')
      chapters.value = []
    } else {
      // 按创建时间排序
      chapters.value = chaptersData.sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      )
    }
    
     
    
  } catch (error) {
    console.error('❌ 加载章节失败:', error)
    uni.showToast({
      title: '加载章节失败',
      icon: 'error'
    })
  }
}

const addChapter = () => {
  uni.showModal({
    title: '新建章节',
    editable: true,
    placeholderText: '请输入章节标题',
    success: (res) => {
      if (res.confirm && res.content.trim()) {
        createChapter(res.content.trim())
      }
    }
  })
}

const createChapter = async (title) => {
  try {
    const chapterId = Date.now().toString()
    const newChapter = {
      id: chapterId,
      title: title,
      content: '',
      word_count: 0,
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    chapters.value.push(newChapter)
    
    // 保存章节列表
    await saveChaptersList()
    
    // 创建章节文件
    const workPath = fileStorage.getWorkPath(userId.value, workId.value)
    const chapterPath = `${workPath}/chapters/${chapterId}.json`
    
    fileStorage.writeFile(chapterPath, newChapter)
    
     
    
    // 跳转到章节编辑页面（暂时未实现）
    uni.showToast({
      title: '章节创建成功',
      icon: 'success'
    })
    
  } catch (error) {
    console.error('❌ 创建章节失败:', error)
    uni.showToast({
      title: '创建章节失败',
      icon: 'error'
    })
  }
}

const deleteChapter = (chapter) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除"${chapter.title}"吗？此操作不可撤销。`,
    success: (res) => {
      if (res.confirm) {
        removeChapter(chapter)
      }
    }
  })
}

const removeChapter = async (chapter) => {
  try {
    // 从列表中移除
    const index = chapters.value.findIndex(c => c.id === chapter.id)
    if (index > -1) {
      chapters.value.splice(index, 1)
    }
    
    // 删除章节文件
    const workPath = fileStorage.getWorkPath(userId.value, workId.value)
    const chapterPath = `${workPath}/chapters/${chapter.id}.json`
    
    fileStorage.deleteFile(chapterPath)
    
    // 保存章节列表
    await saveChaptersList()
    
     
    
    uni.showToast({
      title: '删除成功',
      icon: 'success'
    })
    
  } catch (error) {
    console.error('❌ 删除章节失败:', error)
    uni.showToast({
      title: '删除失败',
      icon: 'error'
    })
  }
}

const saveChaptersList = async () => {
  try {
    const workPath = fileStorage.getWorkPath(userId.value, workId.value)
    const chaptersPath = `${workPath}/chapters/chapters.json`
    
    fileStorage.writeFile(chaptersPath, chapters.value)
    
    // 更新作品信息（章节数量和最后修改时间）
    try {
      await fileStorage.updateWork(userId.value, workId.value, {
        chapter_count: chapters.value.length,
        updated_at: new Date().toISOString()
      })
    } catch (updateError) {
      console.warn('⚠️ 更新作品信息失败，但章节列表已保存:', updateError)
    }
    
     
    
  } catch (error) {
    console.error('❌ 保存章节列表失败:', error)
  }
}

const openChapter = (chapter) => {
  // 跳转到章节编辑页面
  uni.navigateTo({
    url: `/pages/editor/chapter?workId=${workId.value}&chapterId=${chapter.id}&userId=${userId.value}`
  })
}

const formatTime = (timestamp) => {
  if (!timestamp) return '未知时间'
  
  try {
    const now = new Date()
    const time = new Date(timestamp)
    
    if (isNaN(time.getTime())) {
      return '未知时间'
    }
    
    const diff = now.getTime() - time.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    
    return time.toLocaleDateString()
  } catch (error) {
    return '未知时间'
  }
}

const goBack = () => {
  uni.navigateBack()
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
}

const handleNavSwitch = (navType) => {
  if (navType === 'home') {
    uni.switchTab({
      url: '/pages/index/index'
    })
  }
}
</script>

<style scoped>
.page-container {
  background-color: #1A1A1A;
  color: #FFFFFF;
  min-height: 100vh;
  padding-bottom: 80px;
  box-sizing: border-box;
}

.light-theme {
  background-color: #F5F5F5;
  color: #333333;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #1A1A1A;
  font-size: 12px;
}

.light-theme .status-bar {
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

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(45, 45, 45, 0.9);
  border-bottom: 1px solid #404040;
}

.light-theme .page-header {
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid #E0E0E0;
}

.header-left, .header-right {
  width: 60px;
}

.back-icon {
  width: 24px;
  height: 24px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  text-align: center;
  flex: 1;
}

.light-theme .page-title {
  color: #333333;
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: #FF6B35;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-icon {
  width: 20px;
  height: 20px;
}

.chapters-container {
  flex: 1;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #FFFFFF;
}

.light-theme .section-title {
  color: #333333;
}

.chapter-count {
  font-size: 14px;
  color: #B3B3B3;
}

.light-theme .chapter-count {
  color: #666666;
}

.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chapter-item {
  background: rgba(45, 45, 45, 0.7);
  border-radius: 8px;
  padding: 12px;
  position: relative;
}

.light-theme .chapter-item {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.chapter-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chapter-main {
  flex: 1;
}

.chapter-title {
  font-size: 14px;
  font-weight: 500;
  color: #FFFFFF;
  display: block;
}

.light-theme .chapter-title {
  color: #333333;
}

.chapter-time {
  font-size: 11px;
  color: #B3B3B3;
  margin-top: 2px;
  display: block;
}

.light-theme .chapter-time {
  color: #666666;
}

.chapter-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chapter-words {
  font-size: 12px;
  color: #B3B3B3;
}

.light-theme .chapter-words {
  color: #666666;
}

.chapter-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  background: #FF6B35;
  color: white;
}

.chapter-status.completed {
  background: #4ECDC4;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #B3B3B3;
  margin-bottom: 20px;
}

.light-theme .empty-text {
  color: #666666;
}

.empty-btn {
  padding: 12px 24px;
  border-radius: 8px;
  background: #FF6B35;
  color: white;
}

.btn-text {
  font-size: 14px;
  font-weight: 500;
}

.chapter-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.chapter-item:hover .chapter-actions {
  opacity: 1;
}

.chapter-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chapter-action-btn image {
  width: 16px;
  height: 16px;
}
</style>
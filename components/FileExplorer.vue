<template>
  <view class="file-explorer">
    <!-- 面包屑导航 -->
    <view class="breadcrumb">
      <text 
        v-for="(item, index) in breadcrumb" 
        :key="index"
        class="breadcrumb-item"
        :class="{ active: index === breadcrumb.length - 1 }"
        @tap="navigateTo(item.path)"
      >
        {{ item.name }}
        <text v-if="index < breadcrumb.length - 1" class="breadcrumb-separator">/</text>
      </text>
    </view>

    <!-- 文件列表 -->
    <scroll-view class="file-list" scroll-y>
      <!-- 目录项 -->
      <view 
        v-for="item in currentItems" 
        :key="item.path"
        class="file-item"
        :class="{ directory: item.type === 'directory', file: item.type === 'file' }"
        @tap="handleItemClick(item)"
      >
        <view class="item-icon">
          <text v-if="item.type === 'directory'" class="icon-folder">📁</text>
          <text v-else class="icon-file">📄</text>
        </view>
        
        <view class="item-info">
          <text class="item-name">{{ item.name }}</text>
          <text v-if="item.type === 'file'" class="item-size">{{ formatSize(item.size) }}</text>
          <text class="item-date">{{ formatDate(item.updated_at) }}</text>
        </view>
        
        <view v-if="item.type === 'directory'" class="item-arrow">
          <text>›</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="currentItems.length === 0" class="empty-state">
        <text class="empty-icon">📁</text>
        <text class="empty-text">此文件夹为空</text>
      </view>
    </scroll-view>

    <!-- 文件详情弹窗 -->
    <view class="modal-mask" v-if="selectedFile" @tap="selectedFile = null">
      <view class="modal-container" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">{{ selectedFile.name }}</text>
          <button class="close-btn" @tap="selectedFile = null">
            <text class="close-text">×</text>
          </button>
        </view>
        
        <view class="modal-content">
          <view class="file-details">
            <view class="detail-item">
              <text class="detail-label">路径：</text>
              <text class="detail-value">{{ selectedFile.path }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">大小：</text>
              <text class="detail-value">{{ formatSize(selectedFile.size) }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">创建时间：</text>
              <text class="detail-value">{{ formatDate(selectedFile.created_at) }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">修改时间：</text>
              <text class="detail-value">{{ formatDate(selectedFile.updated_at) }}</text>
            </view>
          </view>
          
          <!-- 文件内容预览 -->
          <view v-if="selectedFile.content" class="file-preview">
            <text class="preview-title">内容预览：</text>
            <text class="preview-content">{{ JSON.stringify(selectedFile.content, null, 2) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import FileSystemStorage from '@/utils/fileSystemStorage.js'

// 定义props
const props = defineProps({
  userId: {
    type: String,
    required: true
  },
  initialPath: {
    type: String,
    default: '/'
  }
})

// 响应式数据
const currentPath = ref(props.initialPath)
const currentItems = ref([])
const breadcrumb = ref([])
const selectedFile = ref(null)

// 初始化面包屑
const initBreadcrumb = (path) => {
  const parts = path.split('/').filter(p => p)
  breadcrumb.value = [
    { name: '根目录', path: '/' }
  ]
  
  let current = ''
  parts.forEach(part => {
    current += '/' + part
    breadcrumb.value.push({
      name: part,
      path: current
    })
  })
}

// 加载当前路径的内容
const loadCurrentPath = async () => {
  try {
    const items = FileSystemStorage.listDirectory(currentPath.value)
    currentItems.value = items
    
    // 如果是用户根目录，自动创建用户文件夹
    if (currentPath.value === '/data/cloud_users' && items.length === 0) {
      FileSystemStorage.createUserDirectory(props.userId, {
        name: `用户_${props.userId}`
      })
      // 重新加载
      currentItems.value = FileSystemStorage.listDirectory(currentPath.value)
    }
    
    // 更新面包屑
    initBreadcrumb(currentPath.value)
    
  } catch (error) {
    console.error('加载路径失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'error'
    })
  }
}

// 导航到指定路径
const navigateTo = (path) => {
  currentPath.value = path
}

// 处理项目点击
const handleItemClick = (item) => {
  if (item.type === 'directory') {
    navigateTo(item.path)
  } else {
    selectedFile.value = item
  }
}

// 格式化文件大小
const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// 监听路径变化
watch(currentPath, (newPath) => {
  loadCurrentPath()
})

// 组件挂载时加载数据
onMounted(() => {
  loadCurrentPath()
})

// 提供方法给父组件调用
const refresh = () => {
  loadCurrentPath()
}

const navigateToUserWorks = () => {
  currentPath.value = `/data/cloud_users/${props.userId}/works`
}

// 暴露方法给父组件
defineExpose({
  refresh,
  navigateToUserWorks
})
</script>

<style scoped>
.file-explorer {
  height: 100%;
  background-color: #f8f9fa;
}

/* 面包屑导航 */
.breadcrumb {
  padding: 20rpx 30rpx;
  background-color: white;
  border-bottom: 1rpx solid #e0e0e0;
  flex-direction: row;
  flex-wrap: wrap;
}

.breadcrumb-item {
  font-size: 28rpx;
  color: #666;
  margin-right: 10rpx;
}

.breadcrumb-item.active {
  color: #007aff;
  font-weight: bold;
}

.breadcrumb-separator {
  margin-left: 10rpx;
  color: #999;
}

/* 文件列表 */
.file-list {
  height: calc(100% - 80rpx);
  padding: 20rpx;
}

.file-item {
  background-color: white;
  border-radius: 12rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  flex-direction: row;
  align-items: center;
  border: 1rpx solid #e0e0e0;
}

.file-item:active {
  background-color: #f0f0f0;
}

.item-icon {
  margin-right: 20rpx;
  font-size: 40rpx;
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.item-size, .item-date {
  font-size: 24rpx;
  color: #999;
  margin-right: 20rpx;
}

.item-arrow {
  font-size: 36rpx;
  color: #999;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
}

/* 模态框样式 */
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
  z-index: 1000;
}

.modal-container {
  background-color: white;
  border-radius: 20rpx;
  width: 80%;
  max-height: 80%;
  overflow: hidden;
}

.modal-header {
  padding: 30rpx;
  border-bottom: 1rpx solid #e0e0e0;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  font-size: 40rpx;
  color: #999;
}

.modal-content {
  padding: 30rpx;
  max-height: 500rpx;
  overflow-y: auto;
}

.file-details {
  margin-bottom: 30rpx;
}

.detail-item {
  flex-direction: row;
  margin-bottom: 15rpx;
}

.detail-label {
  font-weight: bold;
  color: #666;
  min-width: 120rpx;
}

.detail-value {
  color: #333;
  flex: 1;
}

.file-preview {
  border-top: 1rpx solid #e0e0e0;
  padding-top: 20rpx;
}

.preview-title {
  font-weight: bold;
  margin-bottom: 15rpx;
  color: #666;
}

.preview-content {
  background-color: #f8f9fa;
  padding: 20rpx;
  border-radius: 8rpx;
  font-family: monospace;
  font-size: 24rpx;
  white-space: pre-wrap;
  max-height: 300rpx;
  overflow-y: auto;
}
</style>
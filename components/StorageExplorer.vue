<template>
  <view class="storage-explorer">
    <!-- 头部信息 -->
    <view class="explorer-header">
      <text class="header-title">📁 文件系统存储浏览器</text>
      <view class="storage-info">
        <text class="info-text">存储类型: 文件系统</text>
        <text class="info-text">基础路径: {{ basePath }}</text>
        <text class="info-text">使用: {{ storageInfo.currentSizeMB }}MB / {{ storageInfo.limitSizeMB }}MB ({{ storageInfo.usagePercent }}%)</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <button class="action-btn" @tap="refreshData">🔄 刷新</button>
      <button class="action-btn" @tap="showUserWorks">📚 查看作品</button>
      <button class="action-btn" @tap="validateIntegrity">✅ 验证完整性</button>
      <button class="action-btn" @tap="exportData">📤 导出数据</button>
    </view>

    <!-- 当前用户作品列表 -->
    <view v-if="currentUserWorks.length > 0" class="works-section">
      <view class="section-title">📖 当前用户作品</view>
      <view class="works-list">
        <view 
          v-for="work in currentUserWorks" 
          :key="work.id" 
          class="work-item"
          @tap="selectWork(work)"
          :class="{ active: selectedWork?.id === work.id }"
        >
          <view class="work-info">
            <text class="work-title">{{ work.title }}</text>
            <text class="work-date">{{ formatDate(work.updated_at) }}</text>
          </view>
          <text class="work-path">{{ work.workDir }}</text>
        </view>
      </view>
    </view>

    <!-- 选中作品的详细信息 -->
    <view v-if="selectedWork" class="work-detail">
      <view class="section-title">📋 作品详情: {{ selectedWork.title }}</view>
      
      <!-- 文件列表 -->
      <view class="files-section">
        <view class="files-title">📁 文件结构</view>
        <view class="files-list">
          <view 
            v-for="file in workFiles" 
            :key="file.name" 
            class="file-item"
            @tap="previewFile(file)"
          >
            <view class="file-icon">
              <text v-if="file.name === 'config'">⚙️</text>
              <text v-else-if="file.name === 'manuscript'">📝</text>
              <text v-else-if="file.name === 'chapters'">📚</text>
              <text v-else-if="file.name === 'glossary'">📖</text>
              <text v-else-if="file.name === 'mapData'">🗺️</text>
              <text v-else>📄</text>
            </view>
            <view class="file-info">
              <text class="file-name">{{ getFileDisplayName(file.name) }}</text>
              <text class="file-size">{{ formatFileSize(file.size) }}</text>
              <text class="file-path">{{ file.path }}</text>
            </view>
          </view>
        </view>
        
        <!-- 总大小 -->
        <view class="total-size">
          <text>📊 总大小: {{ formatFileSize(totalWorkSize) }}</text>
        </view>
      </view>
    </view>

    <!-- 文件预览模态框 -->
    <view v-if="showPreview" class="preview-modal" @tap="closePreview">
      <view class="preview-container" @tap.stop>
        <view class="preview-header">
          <text class="preview-title">📄 {{ previewFile.name }}</text>
          <button class="close-btn" @tap="closePreview">✕</button>
        </view>
        <view class="preview-content">
          <text v-if="previewContent" class="preview-text">{{ previewContent }}</text>
          <text v-else-if="previewError" class="preview-error">{{ previewError }}</text>
          <view v-else class="preview-loading">加载中...</view>
        </view>
      </view>
    </view>

    <!-- 操作结果提示 -->
    <view v-if="operationResult" class="operation-result">
      <view class="result-content">
        <text class="result-title">{{ operationResult.title }}</text>
        <text class="result-message">{{ operationResult.message }}</text>
        <button class="result-btn" @tap="operationResult = null">确定</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getFileSystemStorageInfo, getUserFileSystemWorks, getWorkFileSystemDetail, exportUserFileSystemData, validateFileSystemIntegrity } from '@/utils/storageDebug.js'
import { OfflineAuthService } from '@/utils/offlineAuth.js'

// 响应式数据
const currentUser = ref(null)
const basePath = ref('')
const storageInfo = ref({})
const currentUserWorks = ref([])
const selectedWork = ref(null)
const workFiles = ref([])
const totalWorkSize = ref(0)
const showPreview = ref(false)
const previewContent = ref('')
const previewError = ref('')
const operationResult = ref(null)

// 初始化数据
const initExplorer = async () => {
  try {
    // 获取当前用户
    currentUser.value = OfflineAuthService.getCurrentUser()
    
    if (!currentUser.value) {
      showOperationResult('未登录', '请先登录后使用文件浏览器')
      return
    }
    
    // 获取文件系统信息
    const fsInfo = getFileSystemStorageInfo()
    basePath.value = fsInfo.basePath
    storageInfo.value = getFileSystemStorageInfo().usage || {}
    
    // 加载用户作品
    await loadUserWorks()
    
  } catch (error) {
    console.error('初始化文件浏览器失败:', error)
    showOperationResult('初始化失败', error.message)
  }
}

// 加载用户作品
const loadUserWorks = async () => {
  if (!currentUser.value) return
  
  try {
    const works = getUserFileSystemWorks(currentUser.value.id)
    currentUserWorks.value = works
  } catch (error) {
    console.error('加载用户作品失败:', error)
    showOperationResult('加载失败', error.message)
  }
}

// 选择作品
const selectWork = async (work) => {
  try {
    selectedWork.value = work
    
    // 获取作品文件详情
    const detail = getWorkFileSystemDetail(currentUser.value.id, work.id)
    if (detail.error) {
      showOperationResult('获取失败', detail.error)
      return
    }
    
    workFiles.value = detail.files
    totalWorkSize.value = detail.totalSize
    
  } catch (error) {
    console.error('获取作品详情失败:', error)
    showOperationResult('获取失败', error.message)
  }
}

// 预览文件
const previewFile = async (file) => {
  try {
    previewFile.value = file
    showPreview.value = true
    previewContent.value = ''
    previewError.value = ''
    
    // 读取文件内容
    const fs = uni.getFileSystemManager()
    try {
      const content = fs.readFileSync(file.path, 'utf8')
      if (file.name === 'config') {
        previewContent.value = JSON.stringify(JSON.parse(content), null, 2)
      } else {
        const jsonData = JSON.parse(content)
        previewContent.value = JSON.stringify(jsonData, null, 2)
      }
    } catch (fileError) {
      previewError.value = `无法读取文件: ${fileError.message}`
    }
    
  } catch (error) {
    previewError.value = `预览失败: ${error.message}`
  }
}

// 关闭预览
const closePreview = () => {
  showPreview.value = false
  previewFile.value = {}
  previewContent.value = ''
  previewError.value = ''
}

// 刷新数据
const refreshData = async () => {
  await initExplorer()
  selectedWork.value = null
  showOperationResult('刷新完成', '数据已更新')
}

// 验证完整性
const validateIntegrity = async () => {
  if (!currentUser.value) {
    showOperationResult('未登录', '请先登录')
    return
  }
  
  try {
    const result = validateFileSystemIntegrity(currentUser.value.id)
    if (result.success) {
      const { validation } = result
      const issuesCount = validation.issues.length
      
      showOperationResult(
        '验证完成', 
        `用户配置: ${validation.userConfig ? '✅' : '❌'} | 作品数: ${validation.works.length} | 问题: ${issuesCount}个`
      )
    } else {
      showOperationResult('验证失败', result.error)
    }
  } catch (error) {
    showOperationResult('验证失败', error.message)
  }
}

// 导出数据
const exportData = async () => {
  if (!currentUser.value) {
    showOperationResult('未登录', '请先登录')
    return
  }
  
  try {
    const result = exportUserFileSystemData(currentUser.value.id)
    if (result.success) {
      showOperationResult(
        '导出成功', 
        `共导出 ${result.data.exportInfo.totalWorks} 个作品，大小: ${formatFileSize(result.size)}`
      )
      
      // 这里可以添加复制到剪贴板或下载功能
      uni.setClipboardData({
        data: JSON.stringify(result.data, null, 2),
        success: () => {
          uni.showToast({ title: '数据已复制到剪贴板' })
        }
      })
      
    } else {
      showOperationResult('导出失败', result.error)
    }
  } catch (error) {
    showOperationResult('导出失败', error.message)
  }
}

// 显示操作结果
const showOperationResult = (title, message) => {
  operationResult.value = { title, message }
  setTimeout(() => {
    operationResult.value = null
  }, 3000)
}

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取文件显示名称
const getFileDisplayName = (name) => {
  const names = {
    config: '作品配置',
    manuscript: '稿件内容',
    chapters: '章节列表',
    glossary: '专有名词',
    mapData: '地图数据'
  }
  return names[name] || name
}

// 生命周期
onMounted(() => {
  initExplorer()
})
</script>

<style scoped>
.storage-explorer {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.explorer-header {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.header-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 15px;
  display: block;
}

.storage-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-text {
  font-size: 14px;
  color: #666;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.action-btn {
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 14px;
  min-width: 100px;
}

.works-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
  display: block;
}

.works-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.work-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  transition: all 0.3s;
}

.work-item.active {
  border-color: #4CAF50;
  background: #f9fff9;
}

.work-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.work-title {
  font-weight: bold;
  font-size: 16px;
}

.work-date {
  font-size: 12px;
  color: #999;
}

.work-path {
  font-size: 12px;
  color: #666;
  font-family: monospace;
}

.work-detail {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.files-section {
  margin-top: 20px;
}

.files-title {
  font-weight: bold;
  margin-bottom: 15px;
  display: block;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

.file-item:hover {
  background: #f5f5f5;
}

.file-icon {
  font-size: 24px;
  margin-right: 15px;
  width: 30px;
  text-align: center;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: bold;
  display: block;
  margin-bottom: 4px;
}

.file-size {
  font-size: 12px;
  color: #666;
  display: block;
  margin-bottom: 4px;
}

.file-path {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

.total-size {
  margin-top: 15px;
  padding: 10px;
  background: #f0f8ff;
  border-radius: 6px;
  font-weight: bold;
  text-align: center;
}

.preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-container {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.preview-title {
  font-weight: bold;
  font-size: 16px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.preview-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.preview-text {
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.4;
}

.preview-error {
  color: #f44336;
  text-align: center;
}

.preview-loading {
  text-align: center;
  color: #666;
}

.operation-result {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  z-index: 2000;
  text-align: center;
  min-width: 300px;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.result-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.result-message {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.result-btn {
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 30px;
  font-size: 14px;
  cursor: pointer;
  margin-top: 10px;
}
</style>
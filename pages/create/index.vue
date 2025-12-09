<template>
  <view class="create-page" :class="{ 'light-theme': !isDarkMode }">
    <!-- 头部占位栏 - 防止内容与手机状态栏重叠 -->
    <HeaderPlaceholder />
    
    <view class="header">
      <view class="header-titles">
        <text class="title">辅助创建</text>
        <text class="subtitle">统一新增人物 / 设定 / 伏笔 / 场景</text>
      </view>
      <button class="back-link" @tap="goBack"><</button>
    </view>

    <view class="form-card">
      <view class="section">
        <view class="section-label">
          <text class="label">关联作品</text>
          <text class="badge required">必选</text>
        </view>
        <picker
          mode="selector"
          :range="workOptions"
          range-key="title"
          :value="workIndex"
          @change="handleWorkPick"
          :disabled="worksLoading"
        >
          <view class="picker-field">
            <text v-if="selectedWorkLabel">{{ selectedWorkLabel }}</text>
            <text v-else class="placeholder">请选择作品</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
        <text v-if="workError" class="hint error">{{ workError }}</text>
      </view>

      <view class="section">
        <view class="section-label">
          <text class="label">创作类型</text>
          <text class="badge required">必选</text>
        </view>

        <view v-if="isTypeLocked" class="locked-type">
          <text class="locked-text">{{ typeLabel }}</text>
          <text class="locked-tip">本次入口已锁定类型</text>
        </view>

        <view v-else class="type-options">
          <view
            v-for="type in typeOptions"
            :key="type.value"
            class="type-chip"
            :class="{ active: selectedType === type.value }"
            @tap="selectedType = type.value"
          >
            <text>{{ type.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 场景类型选择和编辑 -->
    <view v-if="selectedType === 'map'" class="map-section">
      <!-- 场景选择界面 -->
      <view v-if="!isEditingExistingMap" class="map-selection">
        <view class="section-header">
          <text class="section-title">场景管理</text>
          <text class="section-subtitle">选择现有场景或创建新场景</text>
        </view>
        
        <!-- 创建新场景按钮 -->
        <view class="action-card create-new" @tap="createNewMap">
          <view class="action-icon">+</view>
          <view class="action-content">
            <text class="action-title">创建新场景</text>
            <text class="action-desc">开始创建一个全新的场景</text>
          </view>
        </view>
        
        <!-- 现有场景列表 -->
        <view v-if="mapList.length > 0" class="existing-maps">
          <text class="list-title">现有场景</text>
          <view 
            v-for="map in mapList" 
            :key="map.id"
            class="map-item"
            @tap="editExistingMap(map)"
          >
            <view class="map-info">
              <text class="map-name">{{ map.name }}</text>
              <text class="map-desc">{{ map.description || '暂无描述' }}</text>
              <text class="map-meta">{{ formatTime(map.updated_at) }} · {{ map.nodes?.length || 0 }}个节点</text>
            </view>
            <view class="map-actions">
              <text class="action-link">编辑</text>
            </view>
          </view>
        </view>
        
        <view v-else-if="!worksLoading && selectedWorkId" class="empty-state">
          <text class="empty-text">该作品暂无场景</text>
          <text class="empty-hint">点击上方按钮创建第一个场景</text>
        </view>
      </view>
      
      <!-- 地图编辑界面 -->
      <view v-else class="map-editor">
        <view class="editor-header">
          <view class="editor-info">
            <text class="editor-title">{{ isEditingExistingMap ? '编辑地图' : '创建地图' }}</text>
            <text v-if="isEditingExistingMap" class="editor-subtitle">{{ mapData?.name || '未命名场景' }}</text>
          </view>
          <view class="editor-actions">
            <button class="action-btn secondary" @tap="exitMapEditor">返回</button>
          </view>
        </view>

        <!-- <view v-if="mapData" class="map-meta-form">
          <view class="meta-field">
            <text class="meta-label">地图名称</text>
            <textarea
              class="meta-textarea name-textarea"
              v-model="mapNameModel"
              placeholder="请输入地图名称"
              maxlength="50"
            ></textarea>
          </view>
          <view class="meta-field">
            <text class="meta-label">地图描述</text>
            <textarea
              class="meta-textarea"
              v-model="mapDescriptionModel"
              placeholder="补充地图背景、关键用途等信息"
              :auto-height="true"
              maxlength="200"
            ></textarea>
          </view>
        </view> -->
        
        <MapVisualizer
          :is-dark-mode="isDarkMode"
          :initial-data="mapData"
          @update:data="handleMapDataUpdate"
        />
      </view>
    </view>

    <!-- 其他类型的表单 -->
    <view v-else class="content-card">
      <view class="content-header">
        <text class="content-title">{{ typeLabel }}内容</text>
        <text class="content-hint">仅展示结构，后续可接入真实输入控件</text>
      </view>

      <view v-if="contentTemplate.length > 0" class="fields-grid">
        <view
          v-for="field in contentTemplate"
          :key="field.label"
          class="field-item"
        >
          <text class="field-label">{{ field.label }}</text>
          <view class="field-placeholder">
            <text>{{ field.placeholder }}</text>
          </view>
        </view>
      </view>

      <view v-else class="empty-template">
        <text>该类型暂未定义具体字段，可在此处拓展自定义组件。</text>
      </view>
    </view>

    <view v-if="selectedType === 'map' && isEditingExistingMap" class="actions">
      <button class="primary-btn" @tap="handleSubmit" :disabled="!selectedWorkId">
        <text>保存场景</text>
      </button>
      <text class="actions-hint">编辑完成后点击保存场景到作品</text>
    </view>
    
    <view v-else-if="selectedType !== 'map'" class="actions">
      <button class="primary-btn" @tap="handleSubmit" :disabled="!selectedWorkId">
        <text>保存到作品</text>
      </button>
      <text class="actions-hint">当前仅提供样式占位，功能接入后即可提交。</text>
    </view>

    <!-- 保存确认模态框 -->
    <view v-if="showSaveModal" class="modal-overlay" @tap="closeSaveModal">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">保存场景</text>
        </view>
        
        <view v-if="showNameWarning" class="warning-section">
          <text class="warning-text">⚠️ 场景名称已存在，是否覆盖保存？</text>
        </view>
        
        <view class="modal-body">
          <view class="modal-field">
            <text class="modal-label">场景名称</text>
            <textarea
              class="modal-textarea name-textarea"
              v-model="modalMapName"
              placeholder="请输入场景名称"
              maxlength="20"
            ></textarea>
          </view>
          <view class="modal-field">
            <text class="modal-label">场景描述</text>
            <textarea
              class="modal-textarea"
              v-model="modalMapDescription"
              placeholder="补充场景背景、关键用途等信息"
              :auto-height="true"
              maxlength="50"
              style="min-height: 80px;"
            ></textarea>
          </view>
        </view>
        
        <view class="modal-actions">
          <button class="modal-btn cancel" @tap="closeSaveModal">取消</button>
          <button class="modal-btn confirm" @tap="confirmSave" :disabled="!modalMapName.trim()">
            {{ showNameWarning ? '覆盖保存' : '确认保存' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import HeaderPlaceholder from '@/components/HeaderPlaceholder.vue'
import FileSystemStorage from '@/utils/fileSystemStorage.js'
import themeManager from '@/utils/themeManager.js'
import MapVisualizer from '@/components/MapVisualizer.vue'

const fileStorage = FileSystemStorage

const isDarkMode = ref(themeManager.isDarkMode())
const worksLoading = ref(true)
const workError = ref('')
const works = ref([])
const workIndex = ref(0)
const selectedWorkId = ref('')
const userId = ref('default_user')

const selectedType = ref('character')
const isTypeLocked = ref(false)
const mapData = ref(null) // 地图数据
const selectedMapId = ref(null) // 当前选中的地图ID
const isEditingExistingMap = ref(false) // 是否在编辑现有地图
const mapList = ref([]) // 地图列表

// 模态框相关状态
const showSaveModal = ref(false)
const showNameWarning = ref(false)
const modalMapName = ref('')
const modalMapDescription = ref('')
const typeOptions = [
  { value: 'character', label: '人物' },
  { value: 'setting', label: '设定' },
  { value: 'foreshadowing', label: '伏笔' },
  { value: 'map', label: '地图' }
]

const typeLabel = computed(() => {
  return typeOptions.find((item) => item.value === selectedType.value)?.label || '内容'
})

const workOptions = computed(() =>
  works.value.map((work) => ({
    id: work.id,
    title: work.title || '未命名作品'
  }))
)

const selectedWorkLabel = computed(() => {
  const current = workOptions.value.find((work) => work.id === selectedWorkId.value)
  return current ? current.title : ''
})

const contentTemplateMap = {
  character: [
    { label: '姓名', placeholder: '示例：白起' },
    { label: '性别', placeholder: '示例：未知 / 男 / 女' },
    { label: '身份背景', placeholder: '示例：秦国武将' },
    { label: '性格特征', placeholder: '示例：果决、谨慎' },
    { label: '当前剧情', placeholder: '示例：潜伏于敌营' }
  ],
  setting: [
    { label: '设定标题', placeholder: '示例：灵能体系' },
    { label: '设定类别', placeholder: '示例：世界观 / 科技 / 魔法' },
    { label: '核心规则', placeholder: '可写入约束或使用条件' },
    { label: '拓展描述', placeholder: '补充更多细节与例外情况' }
  ],
  foreshadowing: [
    { label: '伏笔名称', placeholder: '示例：遗失的铜镜' },
    { label: '埋设章节', placeholder: '示例：第三章' },
    { label: '提示内容', placeholder: '记录当下给读者看到的线索' },
    { label: '揭示方式', placeholder: '示例：在第十章揭晓' }
  ],
  map: [
    { label: '地图名称', placeholder: '示例：北境防线' },
    { label: '区域类型', placeholder: '示例：城市 / 地下 / 海域' },
    { label: '关键节点', placeholder: '列出若干地标或路线' },
    { label: '战略价值', placeholder: '描述其在剧情中的作用' }
  ]
}

const contentTemplate = computed(() => {
  return contentTemplateMap[selectedType.value] || []
})

const ensureMapContainer = () => {
  if (mapData.value) return
  mapData.value = {
    id: `map_${Date.now()}`,
    name: '',
    description: '',
    nodes: [],
    edges: []
  }
}

const mapNameModel = computed({
  get: () => mapData.value?.name || '',
  set: (value) => {
    ensureMapContainer()
    mapData.value = {
      ...mapData.value,
      name: value
    }
  }
})

const mapDescriptionModel = computed({
  get: () => mapData.value?.description || '',
  set: (value) => {
    ensureMapContainer()
    mapData.value = {
      ...mapData.value,
      description: value
    }
  }
})

const goBack = () => {
  uni.navigateBack({ delta: 1 })
}

const handleWorkPick = (event) => {
  const index = Number(event.detail.value)
  workIndex.value = index
  selectedWorkId.value = workOptions.value[index]?.id || ''
}

// 加载地图列表
const loadMapList = async () => {
  if (!selectedWorkId.value) return
  
  try {
    const mapListData = await fileStorage.getMapList(userId.value, selectedWorkId.value)
    
    // 确保mapListData是有效对象
    if (mapListData && typeof mapListData === 'object' && Array.isArray(mapListData.maps)) {
      mapList.value = mapListData.maps
    } else {
      console.warn('地图列表数据格式不正确，使用空数组')
      mapList.value = []
    }
    
    console.log('已加载地图列表:', mapList.value, '总数:', mapList.value.length)
  } catch (error) {
    console.error('加载地图列表失败:', error)
    mapList.value = []
  }
}

const loadWorks = async () => {
  worksLoading.value = true
  workError.value = ''
  try {
    await fileStorage.initUserStorage(userId.value)
    const list = await fileStorage.getUserWorks(userId.value)
    works.value = list || []
    if (!selectedWorkId.value && list.length > 0) {
      selectedWorkId.value = list[0].id
      workIndex.value = 0
    } else if (selectedWorkId.value) {
      const idx = list.findIndex((item) => item.id === selectedWorkId.value)
      workIndex.value = idx >= 0 ? idx : 0
    }

    // 如果是地图类型且有选中的作品，加载地图列表
    if (selectedType.value === 'map' && selectedWorkId.value) {
      await loadMapList()
    }
  } catch (error) {
    console.error('加载作品失败:', error)
    workError.value = '无法获取作品列表，请稍后重试'
  } finally {
    worksLoading.value = false
  }
}

const handleMapDataUpdate = (data) => {
  try {
    if (!data) return
    ensureMapContainer()
    mapData.value = {
      ...mapData.value,
      ...data,
      id: mapData.value.id || data.id || `map_${Date.now()}`
    }
    console.log('地图数据已更新:', mapData.value)
  } catch (error) {
    console.error('地图数据更新处理失败:', error)
  }
}

// 检查地图名称是否重复
const checkMapNameDuplicate = (mapName) => {
  if (!mapName || !mapName.trim()) return false
  
  return mapList.value.some(map => 
    map.name === mapName.trim() && map.id !== selectedMapId.value
  )
}

// 打开保存模态框
const openSaveModal = () => {
  if (!mapData.value) return
  
  modalMapName.value = mapData.value.name || ''
  modalMapDescription.value = mapData.value.description || ''
  
  // 检查名称是否重复（排除当前编辑的地图）
  showNameWarning.value = checkMapNameDuplicate(modalMapName.value)
  showSaveModal.value = true
}

// 关闭保存模态框
const closeSaveModal = () => {
  showSaveModal.value = false
  showNameWarning.value = false
  modalMapName.value = ''
  modalMapDescription.value = ''
}

// 确认保存
const confirmSave = async () => {
  if (!modalMapName.value || !modalMapName.value.trim()) {
    uni.showToast({
      title: '请输入地图名称',
      icon: 'none'
    })
    return
  }
  
  try {
    // 更新地图数据
    mapData.value = {
      ...mapData.value,
      name: modalMapName.value.trim(),
      description: modalMapDescription.value.trim()
    }
    
    // 使用专门的地图保存方法
    await fileStorage.saveMapData(userId.value, selectedWorkId.value, mapData.value)
    
    uni.showToast({
      title: '地图已保存',
      icon: 'success'
    })
    
    closeSaveModal()
    
    // 保存后延迟返回
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error) {
    console.error('保存地图失败:', error)
    uni.showToast({
      title: '保存失败',
      icon: 'error'
    })
  }
}

const handleSubmit = async () => {
  if (!selectedWorkId.value) {
    uni.showToast({
      title: '请选择作品',
      icon: 'none'
    })
    return
  }
  
  if (selectedType.value === 'map' && mapData.value) {
    openSaveModal()
    return
  }
  
  uni.showToast({
    title: '样式预览已完成',
    icon: 'none'
  })
}

// 地图管理方法
const createNewMap = () => {
  try {
    isEditingExistingMap.value = true
    selectedMapId.value = null
    mapData.value = {
      id: `map_${Date.now()}`,
      name: '',
      description: '',
      nodes: [],
      edges: []
    }
    console.log('创建新地图')
  } catch (error) {
    console.error('创建新地图失败:', error)
  }
}

const editExistingMap = async (map) => {
  try {
    if (!map || !map.id) {
      throw new Error('地图数据无效')
    }
    
    selectedMapId.value = map.id
    isEditingExistingMap.value = true
    
    // 加载完整的地图数据
    if (fileStorage && fileStorage.getMapData) {
      const fullMapData = await fileStorage.getMapData(userId.value, selectedWorkId.value, map.id)
      if (fullMapData) {
        mapData.value = fullMapData
      } else {
        // 如果获取不到完整数据，使用列表中的数据
        mapData.value = map
      }
    } else {
      // 如果存储服务不可用，直接使用列表中的数据
      mapData.value = map
    }
    
    console.log('编辑现有地图:', mapData.value)
  } catch (error) {
    console.error('加载地图数据失败:', error)
    uni.showToast({
      title: '加载地图失败',
      icon: 'error'
    })
  }
}

const exitMapEditor = () => {
  try {
    isEditingExistingMap.value = false
    selectedMapId.value = null
    mapData.value = null
    // 重新加载地图列表以获取最新数据
    loadMapList()
  } catch (error) {
    console.error('退出地图编辑器失败:', error)
  }
}

const formatTime = (timestamp) => {
  if (!timestamp) return '未知时间'
  
  try {
    const now = new Date()
    const time = new Date(timestamp)
    
    if (isNaN(time.getTime())) {
      return '未知时间'
    }
    
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000)
    
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    if (diff < 604800) return `${Math.floor(diff / 86400)}天前`
    
    return time.toLocaleDateString()
  } catch (error) {
    return '未知时间'
  }
}

onLoad((options) => {
  try {
    if (options?.type) {
      selectedType.value = options.type
      isTypeLocked.value = true
    }
    if (options?.userId) {
      userId.value = options.userId
    }
    if (options?.workId) {
      selectedWorkId.value = options.workId
    }
  } catch (error) {
    console.error('页面加载失败:', error)
  }
})

onMounted(() => {
  try {
    loadWorks()
  } catch (error) {
    console.error('页面初始化失败:', error)
  }
})

// 监听作品选择变化，自动加载地图列表
watch(selectedWorkId, async (newWorkId) => {
  try {
    if (selectedType.value === 'map' && newWorkId) {
      await loadMapList()
      // 重置地图编辑状态
      selectedMapId.value = null
      isEditingExistingMap.value = false
      mapData.value = null
    }
  } catch (error) {
    console.error('监听作品变化失败:', error)
  }
})

// 监听类型变化
watch(selectedType, async (newType) => {
  try {
    if (newType === 'map' && selectedWorkId.value) {
      await loadMapList()
      // 重置地图编辑状态
      selectedMapId.value = null
      isEditingExistingMap.value = false
      mapData.value = null
    }
  } catch (error) {
    console.error('监听类型变化失败:', error)
  }
})

// 监听模态框中地图名称变化，实时检查重复
watch(modalMapName, (newName) => {
  if (showSaveModal.value) {
    showNameWarning.value = checkMapNameDuplicate(newName)
  }
})
</script>

<style scoped>
.create-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  padding: 16px;
  box-sizing: border-box;
  color: #e0e0e0;
}

.create-page.light-theme {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  color: #333;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  position: relative;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  max-width: calc(100% - 60px);
}

.title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1.2;
  color: inherit;
}

.subtitle {
  font-size: 14px;
  opacity: 0.6;
  line-height: 1.5;
  font-weight: 400;
  letter-spacing: 0.2px;
  color: inherit;
}

.back-link {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: inherit;
  font-size: 16px;
  padding: 8px 16px;
  border-radius: 16px;
  min-width: 44px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.create-page.light-theme .back-link {
  border: 1px solid rgba(0, 0, 0, 0.2);
  color: inherit;
}

.back-link:active {
  transform: scale(0.95);
}

.create-page.light-theme .back-link:active {
  transform: scale(0.95);
}



.form-card,
.content-card {
  background: rgba(26, 26, 26, 0.7);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
}

.create-page.light-theme .form-card,
.create-page.light-theme .content-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(20px);
}

.section + .section {
  margin-top: 20px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.label {
  font-size: 14px;
  font-weight: 500;
  color: inherit;
}

.badge {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
  background: rgba(255, 107, 53, 0.2);
  font-weight: 500;
}

.badge.required {
  color: #ff6b35;
}

.picker-field {
  height: 48px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 14px;
}

.create-page.light-theme .picker-field {
  border-color: rgba(0, 0, 0, 0.08);
}

.placeholder {
  opacity: 0.6;
}

.picker-arrow {
  font-size: 20px;
  opacity: 0.4;
}

.hint.error {
  margin-top: 6px;
  font-size: 12px;
  color: #ff6b6b;
}

.locked-type {
  background: rgba(255, 255, 255, 0.08);
  padding: 12px;
  border-radius: 12px;
}

.create-page.light-theme .locked-type {
  background: rgba(0, 0, 0, 0.04);
}

.locked-text {
  font-size: 15px;
  font-weight: 500;
}

.locked-tip {
  font-size: 12px;
  opacity: 0.6;
  margin-top: 4px;
  display: block;
}

.type-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.type-chip {
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 13px;
}

.type-chip.active {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  border-color: transparent;
  color: #fff;
}

.create-page.light-theme .type-chip {
  border-color: rgba(0, 0, 0, 0.08);
  color: #333;
}

.create-page.light-theme .type-chip.active {
  color: #fff;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.content-title {
  font-size: 16px;
  font-weight: 600;
  color: inherit;
}

.content-hint {
  font-size: 12px;
  opacity: 0.6;
  color: inherit;
}

.fields-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  opacity: 0.8;
}

.field-placeholder {
  height: 46px;
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
  opacity: 0.7;
}

.create-page.light-theme .field-placeholder {
  border-color: rgba(0, 0, 0, 0.08);
}

.empty-template {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  opacity: 0.7;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 12px;
}

/* 地图管理样式 */
.map-section {
  margin-bottom: 16px;
}

.map-meta-form {
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.create-page.light-theme .map-meta-form {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.05);
}

.meta-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-label {
  font-size: 13px;
  opacity: 0.8;
}

.meta-input,
.meta-textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  padding: 10px 12px;
  font-size: 14px;
  box-sizing: border-box;
}

.meta-textarea {
  min-height: 80px;
}

.meta-textarea.name-textarea {
  min-height: 50px;
}

.create-page.light-theme .meta-input,
.create-page.light-theme .meta-textarea {
  border-color: rgba(0, 0, 0, 0.1);
  background: #fff;
  color: #222;
}

.section-header {
  margin-bottom: 20px;
  text-align: center;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.section-subtitle {
  font-size: 14px;
  opacity: 0.7;
  display: block;
}

.action-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
}

.create-page.light-theme .action-card {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.05);
}

.action-card.create-new {
  background: linear-gradient(135deg, rgba(255, 138, 76, 0.1), rgba(255, 95, 109, 0.1));
  border-color: rgba(255, 138, 76, 0.3);
}

.action-card:active {
  transform: scale(0.98);
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff8a4c, #ff5f6d);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
}

.action-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-title {
  font-size: 16px;
  font-weight: 600;
}

.action-desc {
  font-size: 14px;
  opacity: 0.7;
}

.existing-maps {
  margin-top: 24px;
}

.list-title {
  font-size: 16px;
  font-weight: 500;
  display: block;
  margin-bottom: 12px;
  opacity: 0.9;
}

.map-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
}

.create-page.light-theme .map-item {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.05);
}

.map-item:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.08);
}

.create-page.light-theme .map-item:active {
  background: rgba(0, 0, 0, 0.02);
}

.map-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: calc(100% - 60px);
}

.map-name {
  font-size: 15px;
  font-weight: 600;
}

.map-desc {
  font-size: 13px;
  opacity: 0.7;
  display: -webkit-box;
  display: box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  box-orient: vertical;
  overflow: hidden;
}

.map-meta {
  font-size: 12px;
  opacity: 0.5;
}

.map-actions {
  display: flex;
  align-items: center;
}

.action-link {
  font-size: 14px;
  color: #ff8a4c;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-text {
  font-size: 16px;
  opacity: 0.8;
  display: block;
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 14px;
  opacity: 0.5;
  display: block;
}

.editor-header {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.create-page.light-theme .editor-header {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.05);
}

.editor-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.editor-title {
  font-size: 16px;
  font-weight: 600;
}

.editor-subtitle {
  font-size: 14px;
  opacity: 0.7;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  border: none;
  transition: all 0.3s ease;
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
}

.create-page.light-theme .action-btn.secondary {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

.action-btn:active {
  transform: scale(0.95);
}

.map-container {
  height: 600px;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.create-page.light-theme .map-container {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.05);
}

.actions {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.primary-btn {
  height: 48px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  border: none;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
  transition: all 0.3s ease;
}

.primary-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
}

.primary-btn:disabled {
  opacity: 0.5;
  transform: none;
  box-shadow: none;
}

.create-page.light-theme .primary-btn {
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.actions-hint {
  font-size: 12px;
  text-align: center;
  opacity: 0.6;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  box-sizing: border-box;
}

.modal-content {
  background: #1a1a1a;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.create-page.light-theme .modal-content {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.create-page.light-theme .modal-header {
  border-color: rgba(0, 0, 0, 0.1);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
}

.warning-section {
  padding: 12px 20px;
  background: rgba(255, 149, 0, 0.1);
  border-bottom: 1px solid rgba(255, 149, 0, 0.2);
}

.warning-text {
  font-size: 14px;
  color: #ff9500;
  text-align: center;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-label {
  font-size: 14px;
  opacity: 0.8;
}

/* 通用模态框输入框样式 */
.modal-input,
.modal-textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  padding: 10px 12px;
  font-size: 14px;
  box-sizing: border-box;
  min-height: 80px; /* 默认高度 */
}

/* 地图名称输入框 - 更小高度 */
.modal-textarea.name-textarea {
  min-height: 40px !important;
  height: 40px !important;
  max-height: 40px !important;
}

/* 地图描述输入框 - 保持默认高度 */
.modal-textarea:not(.name-textarea) {
  min-height: 80px !important;
  height: auto !important;
  max-height: none !important;
}

.create-page.light-theme .modal-input,
.create-page.light-theme .modal-textarea {
  border-color: rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.02);
  color: #222;
}

.modal-actions {
  padding: 16px 20px 20px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  border: none;
  transition: all 0.3s ease;
}

.modal-btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
}

.create-page.light-theme .modal-btn.cancel {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

.modal-btn.confirm {
  background: linear-gradient(135deg, #ff8a4c, #ff5f6d);
  color: #fff;
}

.modal-btn:disabled {
  opacity: 0.5;
}

.modal-btn:active {
  transform: scale(0.95);
}
</style>


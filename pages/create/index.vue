<template>
  <view class="create-page" :class="{ 'light-theme': !isDarkMode }">
    <view class="header">
      <view class="header-titles">
        <text class="title">辅助创建</text>
        <text class="subtitle">统一新增人物 / 设定 / 伏笔 / 地图</text>
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

    <!-- 地图可视化组件 -->
    <view v-if="selectedType === 'map'" class="map-container">
      <MapVisualizer
        :is-dark-mode="isDarkMode"
        :initial-data="mapData"
        @update:data="handleMapDataUpdate"
      />
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

    <view class="actions">
      <button class="primary-btn" @tap="handleSubmit" :disabled="!selectedWorkId">
        <text>保存到作品</text>
      </button>
      <text class="actions-hint">当前仅提供样式占位，功能接入后即可提交。</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
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

const goBack = () => {
  uni.navigateBack({ delta: 1 })
}

const handleWorkPick = (event) => {
  const index = Number(event.detail.value)
  workIndex.value = index
  selectedWorkId.value = workOptions.value[index]?.id || ''
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
  } catch (error) {
    console.error('加载作品失败:', error)
    workError.value = '无法获取作品列表，请稍后重试'
  } finally {
    worksLoading.value = false
  }
}

const handleMapDataUpdate = (data) => {
  mapData.value = data
  // 可以在这里保存到本地存储或文件系统
  console.log('地图数据已更新:', data)
}

const handleSubmit = () => {
  if (selectedType.value === 'map' && mapData.value) {
    // 保存地图数据
    uni.showToast({
      title: '地图已保存',
      icon: 'success'
    })
    return
  }
  
  uni.showToast({
    title: '样式预览已完成',
    icon: 'none'
  })
}

onLoad((options) => {
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
})

onMounted(() => {
  loadWorks()
})
</script>

<style scoped>
.create-page {
  min-height: 100vh;
  background: #111;
  padding: 16px;
  box-sizing: border-box;
  color: #f4f4f4;
}

.create-page.light-theme {
  background: #f7f7f7;
  color: #222;
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
}

.subtitle {
  font-size: 14px;
  opacity: 0.8;
  line-height: 1.5;
  font-weight: 400;
  letter-spacing: 0.2px;
}

.back-link {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 18px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  transition: all 0.3s ease;
}

.create-page.light-theme .back-link {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.8);
}

.back-link:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(0.95);
}

.create-page.light-theme .back-link:active {
  background: rgba(0, 0, 0, 0.1);
}

.create-page.light-theme .back-link {
  color: rgba(0, 0, 0, 0.7);
}

.form-card,
.content-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.create-page.light-theme .form-card,
.create-page.light-theme .content-card {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.05);
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
}

.badge {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
}

.badge.required {
  color: #ff9b4a;
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
  background: linear-gradient(135deg, #ff8a4c, #ff5f6d);
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
}

.content-hint {
  font-size: 12px;
  opacity: 0.6;
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
  border-radius: 14px;
  background: linear-gradient(135deg, #ff8a4c, #ff5f6d);
  color: #fff;
  font-size: 15px;
  border: none;
}

.primary-btn:disabled {
  opacity: 0.5;
}

.actions-hint {
  font-size: 12px;
  text-align: center;
  opacity: 0.6;
}
</style>


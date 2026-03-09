<template>
  <!-- 词库面板滑出框 -->
  <view
    v-if="isVisible || isAnimating"
    class="glossary-panel"
    :class="{ show: isVisible }"
    :style="panelStyle"
  >
    <view class="panel-content">
      <!-- 类型切换栏 -->
      <view class="type-switcher">
        <view
          v-for="type in glossaryTypes"
          :key="type.key"
          class="type-item"
          :class="{ active: currentType === type.key }"
          @tap="switchType(type.key)"
        >
          <text class="type-text" :class="{ active: currentType === type.key }">
            {{ type.label }}
          </text>
        </view>
      </view>
      
      <!-- 分隔线 -->
      <view class="divider"></view>
      
      <!-- 双栏区域 -->
      <view class="columns-container">
        <!-- 父栏（左侧，占1/3） -->
        <view class="parent-column">
          <!-- 新增栏 -->
          <view class="add-header" @tap="handleAddClick(true)">
            <text class="add-icon">+</text>
            <text class="add-text">新增</text>
          </view>
          
          <!-- 分隔线 -->
          <view class="divider"></view>
          
          <!-- 滚动栏 -->
          <scroll-view class="scroll-list" scroll-y>
            <!-- 通用项（恒有） -->
            <view
              class="list-item"
              :class="{ active: selectedItem === null }"
              @tap="selectItem(null)"
            >
              <text class="item-text" :class="{ active: selectedItem === null }">通用</text>
            </view>
            
            <!-- 普通项 -->
            <view
              v-for="item in parentItems"
              :key="item.id"
              class="list-item"
              :class="{ active: item.id === selectedItem?.id }"
              @tap="selectItem(item)"
            >
              <text class="item-text" :class="{ active: item.id === selectedItem?.id }">
                {{ truncateText(item.name) }}
              </text>
            </view>
            
            <!-- 空状态 -->
            <view v-if="parentItems.length === 0" class="empty-state">
              <text class="empty-text">点击上方新增</text>
            </view>
          </scroll-view>
        </view>
        
        <!-- 列分隔线 -->
        <view class="column-divider"></view>
        
        <!-- 子栏（右侧，占2/3） -->
        <view class="child-column">
          <!-- 新增栏 -->
          <view class="add-header" @tap="handleAddClick(false)">
            <text class="add-icon">+</text>
            <text class="add-text">新增子项</text>
          </view>
          
          <!-- 分隔线 -->
          <view class="divider"></view>
          
          <!-- 滚动栏 -->
          <scroll-view class="scroll-list" scroll-y>
            <view
              v-for="item in childItems"
              :key="item.id"
              class="list-item child-item"
              @tap="handleChildItemClick(item)"
              @longpress="handleChildItemLongPress(item)"
            >
              <text class="item-text">{{ truncateText(item.name) }}</text>
            </view>
            
            <!-- 空状态 -->
            <view v-if="childItems.length === 0" class="empty-state">
              <text class="empty-text">暂无子项，点击上方新增</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>
    
    <!-- 新增项目模态框 -->
    <view v-if="showAddDialog" class="modal-overlay" @tap="closeAddDialog">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">{{ addDialogTitle }}</text>
        
        <!-- 重复提示 -->
        <view v-if="duplicateMessage" class="duplicate-warning">
          <text class="duplicate-text">{{ duplicateMessage }}</text>
        </view>
        
        <input
          v-model="newItemName"
          class="modal-input"
          placeholder="请输入名称"
          placeholder-class="input-placeholder"
          focus
        />
        <view class="modal-actions">
          <text class="modal-btn cancel" @tap="closeAddDialog">取消</text>
          <text class="modal-btn confirm" @tap="confirmAddItem">确定</text>
        </view>
      </view>
    </view>
    
    <!-- 详情对话框（长按显示完整名称） -->
    <view v-if="showDetailDialog" class="modal-overlay" @tap="closeDetailDialog">
      <view class="modal-content detail-content" @tap.stop>
        <text class="detail-title">{{ detailItem?.name }}</text>
        <view class="modal-actions">
          <text class="modal-btn confirm" @tap="closeDetailDialog">关闭</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// ============ Props & Emits ============
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  workId: {
    type: String,
    default: ''
  },
  chapterId: {
    type: String,
    default: ''
  },
  statusBarHeight: {
    type: Number,
    default: 20
  }
});

const emit = defineEmits(['close', 'insertText']);

// ============ 常量 ============
// 获取存储键名（带作品ID）
const getStorageKey = () => `glossary_data_${props.workId || 'default'}`;

const glossaryTypes = [
  { key: 'CHARACTER', label: '人物' },
  { key: 'LOCATION', label: '地点' },
  { key: 'ABILITY', label: '能力' },
  { key: 'OTHER', label: '其他' }
];

// ============ 响应式数据 ============
const isAnimating = ref(false);
const currentType = ref('CHARACTER');
const selectedItem = ref(null);
const parentItems = ref([]);
const childItems = ref([]);

// 词库数据（按类型分类）
const glossaryData = ref({
  CHARACTER: [],
  LOCATION: [],
  ABILITY: [],
  OTHER: [],
  // 通用项的子项（每个类型独立）
  CHARACTER_GENERAL: [],
  LOCATION_GENERAL: [],
  ABILITY_GENERAL: [],
  OTHER_GENERAL: []
});

// 新增模态框
const showAddDialog = ref(false);
const isAddingToParent = ref(true);
const newItemName = ref('');
const duplicateMessage = ref('');

// 详情对话框
const showDetailDialog = ref(false);
const detailItem = ref(null);

// ============ 计算属性 ============
const addDialogTitle = computed(() => 
  isAddingToParent.value ? '新增' : '新增子项'
);

const panelStyle = computed(() => {
  const navBarHeight = 56;
  const topOffset = props.statusBarHeight + navBarHeight;
  return {
    top: `${topOffset}px`
  };
});

// ============ 方法 ============

// 截断文本
const truncateText = (text, maxLength = 10) => {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
};

// 生成唯一ID
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

// 获取当前类型的父列表
const getCurrentTypeList = () => glossaryData.value[currentType.value];

// 获取当前类型的通用子项列表
const getCurrentGeneralChildren = () => {
  const key = `${currentType.value}_GENERAL`;
  return glossaryData.value[key] || [];
};

// 加载数据
const loadData = () => {
  try {
    const data = uni.getStorageSync(getStorageKey());
    if (data) {
      glossaryData.value = {
        ...glossaryData.value,
        ...data
      };
    }
    updateParentItems();
    updateChildItems();
  } catch (e) {
    console.error('加载词库数据失败:', e);
  }
};

// 保存数据
const saveData = () => {
  try {
    uni.setStorageSync(getStorageKey(), glossaryData.value);
  } catch (e) {
    console.error('保存词库数据失败:', e);
  }
};

// 更新父栏列表
const updateParentItems = () => {
  parentItems.value = [...getCurrentTypeList()];
};

// 更新子栏列表
const updateChildItems = () => {
  if (selectedItem.value === null) {
    // 选中通用，显示通用子项
    childItems.value = [...getCurrentGeneralChildren()];
  } else {
    // 选中普通项，显示其子项
    childItems.value = [...(selectedItem.value.children || [])];
  }
};

// 切换类型
const switchType = (type) => {
  currentType.value = type;
  selectedItem.value = null; // 默认选中通用
  updateParentItems();
  updateChildItems();
};

// 选择项
const selectItem = (item) => {
  selectedItem.value = item;
  updateChildItems();
};

// 检查父栏是否重复
const isParentDuplicate = (name) => {
  return getCurrentTypeList().some(item => item.name === name);
};

// 检查子栏是否重复
const isChildDuplicate = (name) => {
  if (selectedItem.value === null) {
    // 检查通用子项
    return getCurrentGeneralChildren().some(item => item.name === name);
  } else {
    // 检查选中项的子项
    return (selectedItem.value.children || []).some(item => item.name === name);
  }
};

// 处理新增点击
const handleAddClick = (toParent) => {
  isAddingToParent.value = toParent;
  newItemName.value = '';
  duplicateMessage.value = '';
  showAddDialog.value = true;
};

// 关闭新增对话框
const closeAddDialog = () => {
  showAddDialog.value = false;
  newItemName.value = '';
  duplicateMessage.value = '';
};

// 确认新增
const confirmAddItem = () => {
  const name = newItemName.value.trim();
  if (!name) {
    closeAddDialog();
    return;
  }
  
  // 防重复检测
  if (isAddingToParent.value) {
    if (isParentDuplicate(name)) {
      duplicateMessage.value = `「${name}」已存在于当前列表中`;
      return;
    }
    
    // 添加到父栏
    const newItem = {
      id: generateId(),
      name,
      children: []
    };
    getCurrentTypeList().push(newItem);
    updateParentItems();
  } else {
    if (isChildDuplicate(name)) {
      duplicateMessage.value = `「${name}」已存在于当前子列表中`;
      return;
    }
    
    // 添加到子栏
    const newItem = {
      id: generateId(),
      name,
      children: []
    };
    
    if (selectedItem.value === null) {
      // 添加到通用子项
      const key = `${currentType.value}_GENERAL`;
      glossaryData.value[key].push(newItem);
    } else {
      // 添加到选中项的子项
      if (!selectedItem.value.children) {
        selectedItem.value.children = [];
      }
      selectedItem.value.children.push(newItem);
    }
    updateChildItems();
  }
  
  saveData();
  closeAddDialog();
};

// 处理子项点击（插入文本）
const handleChildItemClick = (item) => {
  emit('insertText', item.name);
};

// 处理子项长按（显示详情）
const handleChildItemLongPress = (item) => {
  detailItem.value = item;
  showDetailDialog.value = true;
};

// 关闭详情对话框
const closeDetailDialog = () => {
  showDetailDialog.value = false;
  detailItem.value = null;
};

// 清空所有数据（用于重置）
const clearAll = () => {
  glossaryData.value = {
    CHARACTER: [],
    LOCATION: [],
    ABILITY: [],
    OTHER: [],
    CHARACTER_GENERAL: [],
    LOCATION_GENERAL: [],
    ABILITY_GENERAL: [],
    OTHER_GENERAL: []
  };
  selectedItem.value = null;
  currentType.value = 'CHARACTER';
  updateParentItems();
  updateChildItems();
  saveData();
};

// ============ 监听 ============
watch(() => props.isVisible, (newVal) => {
  isAnimating.value = true;
  if (newVal) {
    loadData();
  }
  setTimeout(() => {
    isAnimating.value = false;
  }, 300);
});

// 暴露方法给父组件
defineExpose({
  clearAll,
  loadData,
  saveData
});
</script>

<style scoped>
/* ============ 面板容器 ============ */
.glossary-panel {
  position: fixed;
  right: 0;
  width: 66.67vw;
  height: 66.67vh;
  background: #1e1e1e;
  border-bottom-left-radius: 16rpx;
  z-index: 200;
  transform: translateX(100%);
  opacity: 0;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  /* 防止触摸事件穿透 */
  touch-action: none;
}

.glossary-panel.show {
  transform: translateX(0);
  opacity: 1;
}

.panel-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

/* ============ 类型切换栏 ============ */
.type-switcher {
  display: flex;
  height: 96rpx;
  min-height: 96rpx;
  flex-shrink: 0;
  background: #252525;
}

.type-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-text {
  font-size: 28rpx;
  color: #e0e0e0;
  font-weight: normal;
}

.type-text.active {
  color: #007aff;
  font-weight: bold;
}

/* ============ 双栏区域 ============ */
.columns-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  /* 防止触摸事件穿透 */
  touch-action: none;
}

/* ============ 父栏（左侧） ============ */
.parent-column {
  width: 33.33%;
  height: 100%;
  display: flex;
  flex-direction: column;
  /* 防止触摸事件穿透 */
  touch-action: pan-y;
}

/* ============ 子栏（右侧） ============ */
.child-column {
  width: 66.67%;
  height: 100%;
  display: flex;
  flex-direction: column;
  /* 防止触摸事件穿透 */
  touch-action: pan-y;
}

/* ============ 列分隔线 ============ */
.column-divider {
  width: 1px;
  height: 100%;
  background: #333;
}

/* ============ 新增栏 ============ */
.add-header {
  display: flex;
  align-items: center;
  height: 96rpx;
  min-height: 96rpx;
  flex-shrink: 0;
  padding: 0 24rpx;
  background: #252525;
}

.add-icon {
  font-size: 40rpx;
  color: #007aff;
  margin-right: 16rpx;
}

.add-text {
  font-size: 28rpx;
  color: #007aff;
}

/* ============ 分隔线 ============ */
.divider {
  height: 1px;
  background: #333;
}

/* ============ 滚动列表 ============ */
.scroll-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ============ 列表项 ============ */
.list-item {
  padding: 28rpx 24rpx;
  display: flex;
  align-items: center;
}

.list-item.active {
  background: rgba(0, 122, 255, 0.2);
}

.item-text {
  font-size: 28rpx;
  color: #e0e0e0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.item-text.active {
  color: #007aff;
}

.child-item {
  padding-right: 16rpx;
}

/* ============ 空状态 ============ */
.empty-state {
  padding: 48rpx;
  text-align: center;
}

.empty-text {
  font-size: 24rpx;
  color: #666;
}

/* ============ 模态框 ============ */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: #252525;
  border-radius: 16rpx;
  padding: 40rpx;
  width: 80%;
  max-width: 600rpx;
}

.detail-content {
  max-width: 560rpx;
}

.modal-title {
  font-size: 36rpx;
  color: #e0e0e0;
  margin-bottom: 32rpx;
  display: block;
}

.detail-title {
  font-size: 40rpx;
  color: #e0e0e0;
  margin-bottom: 32rpx;
  display: block;
  font-weight: 500;
  line-height: 1.6;
}

/* ============ 重复提示 ============ */
.duplicate-warning {
  background: rgba(139, 0, 0, 0.8);
  border-radius: 8rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
}

.duplicate-text {
  font-size: 28rpx;
  color: #fff;
}

.modal-input {
  width: 100%;
  height: 80rpx;
  background: transparent;
  border: 1px solid #333;
  border-radius: 8rpx;
  padding: 0 24rpx;
  font-size: 32rpx;
  color: #e0e0e0;
  margin-bottom: 40rpx;
  box-sizing: border-box;
}

.input-placeholder {
  color: #666;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 32rpx;
}

.modal-btn {
  font-size: 32rpx;
  padding: 16rpx 24rpx;
}

.modal-btn.cancel {
  color: #888;
}

.modal-btn.confirm {
  color: #007aff;
}
</style>

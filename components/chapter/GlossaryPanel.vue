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
              :class="{ 
                active: selectedItem === null,
                'dragging': isDragging && dragItem?.id === 'general',
                'drag-over': dragOverItem?.id === 'general'
              }"
              @tap="handleParentItemClick(null)"
              @touchstart="handleParentTouchStart(null, $event)"
              @touchend="handleParentTouchEnd(null, $event)"
              @touchmove="handleParentTouchMove(null, $event)"
            >
              <text class="item-text" :class="{ active: selectedItem === null }">通用</text>
              <text v-if="isEditMode" class="edit-icon">⋮⋮</text>
            </view>
            
            <!-- 普通项 -->
            <view
              v-for="(item, index) in parentItems"
              :key="item.id"
              class="list-item"
              :class="{ 
                active: item.id === selectedItem?.id,
                'dragging': isDragging && dragItem?.id === item.id,
                'drag-over': dragOverItem?.id === item.id
              }"
              :style="getDragItemStyle(item)"
              @tap="handleParentItemClick(item)"
              @touchstart="handleParentTouchStart(item, $event)"
              @touchend="handleParentTouchEnd(item, $event)"
              @touchmove="handleParentTouchMove(item, $event)"
            >
              <text class="item-text" :class="{ active: item.id === selectedItem?.id }">
                {{ truncateText(item.name) }}
              </text>
              <text v-if="isEditMode" class="edit-icon">⋮⋮</text>
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
              v-for="(item, index) in childItems"
              :key="item.id"
              class="list-item child-item"
              :class="{ 
                'dragging': isDragging && dragItem?.id === item.id,
                'drag-over': dragOverItem?.id === item.id
              }"
              :style="getDragItemStyle(item)"
              @tap="handleChildItemClick(item)"
              @touchstart="handleChildTouchStart(item, $event)"
              @touchend="handleChildTouchEnd(item, $event)"
              @touchmove="handleChildTouchMove(item, $event)"
            >
              <text class="item-text">{{ truncateText(item.name) }}</text>
              <text v-if="isEditMode" class="edit-icon">⋮⋮</text>
            </view>
            
            <!-- 空状态 -->
            <view v-if="childItems.length === 0" class="empty-state">
              <text class="empty-text">暂无子项，点击上方新增</text>
            </view>
          </scroll-view>
          
          <!-- 模式切换FAB按钮 -->
          <view class="fab-button" @tap="toggleEditMode">
            <image 
              class="fab-icon" 
              :src="isEditMode ? '/static/icons/viewa.png' : '/static/icons/edit.png'" 
              mode="aspectFit" 
            />
          </view>
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
    
    <!-- 删除确认对话框 -->
    <view v-if="showDeleteDialog" class="modal-overlay" @tap="closeDeleteDialog">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">{{ deleteDialogTitle }}</text>
        <text class="modal-message">{{ deleteDialogMessage }}</text>
        <view class="modal-actions">
          <text class="modal-btn cancel" @tap="closeDeleteDialog">取消</text>
          <text class="modal-btn confirm delete" @tap="confirmDelete">删除</text>
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

const emit = defineEmits(['close', 'insertText', 'beforeInsert']);

// ============ 常量 ============
// 获取存储键名（带作品ID）
const getStorageKey = () => `glossary_data_${props.workId || 'default'}`;

const glossaryTypes = [
  { key: 'CHARACTER', label: '人物' },
  { key: 'LOCATION', label: '地点' },
  { key: 'ABILITY', label: '能力' },
  { key: 'OTHER', label: '其他' }
];

const LONG_PRESS_DURATION = 400; // 长按时间阈值 1秒

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

// 删除对话框
const showDeleteDialog = ref(false);
const deleteDialogTitle = ref('');
const deleteDialogMessage = ref('');
const itemToDelete = ref(null);
const isDeletingParent = ref(false);

// 编辑/查看模式
const isEditMode = ref(false);

// 触摸状态
const touchTimer = ref(null);
const touchStartTime = ref(0);
const isLongPressTriggered = ref(false);
const isDragging = ref(false);
const dragItem = ref(null);
const dragOverItem = ref(null);
const dragStartY = ref(0);
const dragCurrentY = ref(0);
const dragItemType = ref(''); // 'parent' 或 'child'

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

// 切换编辑/查看模式
const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
};

// 选择项（查看模式）
const selectItem = (item) => {
  selectedItem.value = item;
  updateChildItems();
};

// 父项点击处理
const handleParentItemClick = (item) => {
  if (isEditMode.value) {
    // 编辑模式：弹出删除确认
    showDeleteParentConfirm(item);
  } else {
    // 查看模式：切换选择
    selectItem(item);
  }
};

// 子项点击处理
const handleChildItemClick = (item) => {
  if (isEditMode.value) {
    // 编辑模式：弹出删除确认
    showDeleteChildConfirm(item);
  } else {
    // 查看模式：插入文本
    // 先通知父组件准备插入（让父组件记录光标位置）
    emit('beforeInsert');
    // 延迟一点执行插入，确保父组件已记录光标位置
    setTimeout(() => {
      emit('insertText', item.name);
    }, 50);
  }
};

// 父项触摸开始
const handleParentTouchStart = (item, event) => {
  if (!isEditMode.value) return;
  
  touchStartTime.value = Date.now();
  isLongPressTriggered.value = false;
  
  // 启动1秒延时检测
  touchTimer.value = setTimeout(() => {
    // 1秒后触发长按 - 开始拖拽
    isLongPressTriggered.value = true;
    startDrag(item, 'parent', event);
  }, LONG_PRESS_DURATION);
};

// 父项触摸结束
const handleParentTouchEnd = (item, event) => {
  if (!isEditMode.value) return;
  
  const touchDuration = Date.now() - touchStartTime.value;
  
  clearTimeout(touchTimer.value);
  
  if (isDragging.value) {
    // 正在拖拽，结束拖拽
    endDrag();
    return;
  }
  
  if (!isLongPressTriggered.value && touchDuration < LONG_PRESS_DURATION) {
    // 短按且未触发长按 - 执行点击（删除确认）
    handleParentItemClick(item);
  }
};

// 父项触摸移动
const handleParentTouchMove = (item, event) => {
  if (!isEditMode.value) return;
  
  if (isDragging.value) {
    event.preventDefault();
    updateDragPosition(event, 'parent');
  } else {
    // 如果移动距离过大，取消定时器
    clearTimeout(touchTimer.value);
  }
};

// 子项触摸开始
const handleChildTouchStart = (item, event) => {
  if (!isEditMode.value) return;
  
  touchStartTime.value = Date.now();
  isLongPressTriggered.value = false;
  
  // 启动1秒延时检测
  touchTimer.value = setTimeout(() => {
    // 1秒后触发长按 - 开始拖拽
    isLongPressTriggered.value = true;
    startDrag(item, 'child', event);
  }, LONG_PRESS_DURATION);
};

// 子项触摸结束
const handleChildTouchEnd = (item, event) => {
  if (!isEditMode.value) return;
  
  const touchDuration = Date.now() - touchStartTime.value;
  
  clearTimeout(touchTimer.value);
  
  if (isDragging.value) {
    // 正在拖拽，结束拖拽
    endDrag();
    return;
  }
  
  if (!isLongPressTriggered.value && touchDuration < LONG_PRESS_DURATION) {
    // 短按且未触发长按 - 执行点击（删除确认）
    handleChildItemClick(item);
  }
};

// 子项触摸移动
const handleChildTouchMove = (item, event) => {
  if (!isEditMode.value) return;
  
  if (isDragging.value) {
    event.preventDefault();
    updateDragPosition(event, 'child');
  } else {
    // 如果移动距离过大，取消定时器
    clearTimeout(touchTimer.value);
  }
};

// 开始拖拽
const startDrag = (item, type, event) => {
  isDragging.value = true;
  dragItem.value = item;
  dragItemType.value = type;
  
  const touch = event.touches[0];
  dragStartY.value = touch.clientY;
  dragCurrentY.value = touch.clientY;
};

// 更新拖拽位置
const updateDragPosition = (event, type) => {
  if (!isDragging.value || dragItemType.value !== type) return;
  
  const touch = event.touches[0];
  dragCurrentY.value = touch.clientY;
  
  // 检测拖拽目标位置
  detectDragOverItem(type);
};

// 检测拖拽目标
const detectDragOverItem = (type) => {
  const items = type === 'parent' ? parentItems.value : childItems.value;
  const list = type === 'parent' ? parentItems.value : childItems.value;
  
  // 简单的位置检测（实际项目中可能需要更精确的算法）
  // 这里使用索引作为简化实现
  const itemHeight = 44; // 每个item的大致高度（rpx）
  const dragOffset = dragCurrentY.value - dragStartY.value;
  
  // 找到拖拽目标
  let targetIndex = -1;
  if (type === 'parent') {
    const currentIndex = parentItems.value.findIndex(i => i.id === dragItem.value?.id);
    if (currentIndex === -1 && dragItem.value === null) {
      // 拖拽通用项
      targetIndex = 0;
    } else {
      const offsetItems = Math.round(dragOffset / itemHeight);
      targetIndex = Math.max(0, Math.min(items.length - 1, currentIndex + offsetItems));
    }
  } else {
    const currentIndex = childItems.value.findIndex(i => i.id === dragItem.value?.id);
    const offsetItems = Math.round(dragOffset / itemHeight);
    targetIndex = Math.max(0, Math.min(items.length - 1, currentIndex + offsetItems));
  }
  
  if (targetIndex >= 0 && targetIndex < list.length) {
    dragOverItem.value = list[targetIndex];
  } else if (targetIndex === -1 || targetIndex >= list.length) {
    dragOverItem.value = null; // 表示放在末尾或开头
  }
};

// 获取拖拽项样式
const getDragItemStyle = (item) => {
  if (!isDragging.value || dragItem.value?.id !== item.id) {
    return {};
  }
  
  const dragOffset = dragCurrentY.value - dragStartY.value;
  return {
    transform: `translateY(${dragOffset}px)`,
    zIndex: 100,
    opacity: 0.8
  };
};

// 结束拖拽
const endDrag = () => {
  if (!isDragging.value) return;
  
  // 执行排序
  if (dragOverItem.value && dragOverItem.value.id !== dragItem.value?.id) {
    reorderItems();
  }
  
  // 重置拖拽状态
  isDragging.value = false;
  dragItem.value = null;
  dragOverItem.value = null;
  dragItemType.value = '';
  dragStartY.value = 0;
  dragCurrentY.value = 0;
};

// 重新排序
const reorderItems = () => {
  if (!dragItem.value || !dragOverItem.value) return;
  
  if (dragItemType.value === 'parent') {
    const list = getCurrentTypeList();
    const fromIndex = list.findIndex(i => i.id === dragItem.value.id);
    const toIndex = list.findIndex(i => i.id === dragOverItem.value.id);
    
    if (fromIndex !== -1 && toIndex !== -1) {
      const [movedItem] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, movedItem);
      saveData();
      updateParentItems();
    }
  } else {
    let list;
    if (selectedItem.value === null) {
      const key = `${currentType.value}_GENERAL`;
      list = glossaryData.value[key];
    } else {
      list = selectedItem.value.children || [];
    }
    
    const fromIndex = list.findIndex(i => i.id === dragItem.value.id);
    const toIndex = list.findIndex(i => i.id === dragOverItem.value.id);
    
    if (fromIndex !== -1 && toIndex !== -1) {
      const [movedItem] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, movedItem);
      saveData();
      updateChildItems();
    }
  }
};

// 显示删除父项确认
const showDeleteParentConfirm = (item) => {
  isDeletingParent.value = true;
  itemToDelete.value = item;
  
  if (item === null) {
    // 删除通用项的子项
    deleteDialogTitle.value = '删除通用项子项';
    deleteDialogMessage.value = '确定要删除所有通用项子项吗？此操作不可恢复。';
  } else {
    deleteDialogTitle.value = '删除父项';
    deleteDialogMessage.value = `确定要删除「${item.name}」及其全部子项吗？此操作不可恢复。`;
  }
  
  showDeleteDialog.value = true;
};

// 显示删除子项确认
const showDeleteChildConfirm = (item) => {
  isDeletingParent.value = false;
  itemToDelete.value = item;
  deleteDialogTitle.value = '删除子项';
  deleteDialogMessage.value = `确定要删除「${item.name}」吗？此操作不可恢复。`;
  showDeleteDialog.value = true;
};

// 关闭删除对话框
const closeDeleteDialog = () => {
  showDeleteDialog.value = false;
  itemToDelete.value = null;
  isDeletingParent.value = false;
};

// 确认删除
const confirmDelete = () => {
  if (!itemToDelete.value) {
    closeDeleteDialog();
    return;
  }
  
  if (isDeletingParent.value) {
    if (itemToDelete.value === null) {
      // 删除通用项的子项
      const key = `${currentType.value}_GENERAL`;
      glossaryData.value[key] = [];
    } else {
      // 删除父项及其子项
      const list = getCurrentTypeList();
      const index = list.findIndex(i => i.id === itemToDelete.value.id);
      if (index !== -1) {
        list.splice(index, 1);
        // 如果删除的是当前选中的项，重置选择
        if (selectedItem.value?.id === itemToDelete.value.id) {
          selectedItem.value = null;
        }
      }
    }
    updateParentItems();
    updateChildItems();
  } else {
    // 删除子项
    if (selectedItem.value === null) {
      // 删除通用子项
      const key = `${currentType.value}_GENERAL`;
      const list = glossaryData.value[key];
      const index = list.findIndex(i => i.id === itemToDelete.value.id);
      if (index !== -1) {
        list.splice(index, 1);
      }
    } else {
      // 删除选中父项的子项
      const children = selectedItem.value.children || [];
      const index = children.findIndex(i => i.id === itemToDelete.value.id);
      if (index !== -1) {
        children.splice(index, 1);
      }
    }
    updateChildItems();
  }
  
  saveData();
  closeDeleteDialog();
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

// 处理子项长按（显示详情）- 仅在查看模式下有效
const handleChildItemLongPress = (item) => {
  if (isEditMode.value) return;
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
  isEditMode.value = false;
  updateParentItems();
  updateChildItems();
  saveData();
};

// ============ 监听 ============
watch(() => props.isVisible, (newVal) => {
  isAnimating.value = true;
  if (newVal) {
    loadData();
    // 每次打开都重置为查看模式
    isEditMode.value = false;
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
  position: relative;
  /* 防止触摸事件穿透 */
  touch-action: pan-y;
}

/* ============ FAB按钮 ============ */
.fab-button {
  position: absolute;
  right: 24rpx;
  bottom: 24rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #007aff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 122, 255, 0.4);
  z-index: 10;
  transition: transform 0.2s, background 0.2s;
}

.fab-button:active {
  transform: scale(0.95);
  background: #0056cc;
}

.fab-icon {
  width: 48rpx;
  height: 48rpx;
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
  position: relative;
  transition: background 0.2s, transform 0.1s;
}

.list-item:active {
  background: rgba(255, 255, 255, 0.05);
}

.list-item.active {
  background: rgba(0, 122, 255, 0.2);
}

.list-item.dragging {
  background: rgba(0, 122, 255, 0.3);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.3);
}

.list-item.drag-over {
  border-top: 4rpx solid #007aff;
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

.edit-icon {
  font-size: 24rpx;
  color: #666;
  margin-left: 16rpx;
  user-select: none;
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

.modal-message {
  font-size: 28rpx;
  color: #888;
  margin-bottom: 40rpx;
  display: block;
  line-height: 1.5;
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

.modal-btn.confirm.delete {
  color: #ff3b30;
}
</style>

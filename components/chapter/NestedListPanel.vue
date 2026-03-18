<template>
  <!-- 多级列表面板滑出框 -->
  <view
    v-if="isVisible || isAnimating"
    class="nested-list-panel"
    :class="{ show: isVisible }"
    :style="panelStyle"
  >
    <view class="panel-content">
      <!-- 父栏（左侧，占1/3） -->
      <view class="parent-column">
        <!-- 固定栏：返回 + 新增 -->
        <view class="fixed-header">
          <!-- 返回按钮 -->
          <view
            class="header-btn"
            :class="{ disabled: isAtTopLevel }"
            @tap="handleBackClick"
          >
            <text class="header-icon">←</text>
            <text class="header-text">返回</text>
          </view>
          
          <!-- 新增按钮 -->
          <view class="header-btn add-btn" @tap="handleAddClick(true)">
            <text class="header-icon add-icon">+</text>
            <text class="header-text add-text">新增</text>
          </view>
        </view>
        
        <!-- 分隔线 -->
        <view class="divider"></view>
        
        <!-- 滚动栏 -->
        <scroll-view class="scroll-list" scroll-y>
          <view
            v-for="(item, index) in currentLevelItems"
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
              {{ truncateText(item.content) }}
            </text>
            <text v-if="isEditMode" class="edit-icon">⋮⋮</text>
          </view>
        </scroll-view>
      </view>
      
      <!-- 分隔线 -->
      <view class="column-divider"></view>
      
      <!-- 子栏（右侧，占2/3） -->
      <view class="child-column">
        <!-- 固定栏：当前选中项 + 新增子项 -->
        <view class="fixed-header">
          <!-- 当前选中项标题 -->
          <view class="header-title">
            <text class="title-text">{{ selectedItem?.content || '请选择父项' }}</text>
          </view>
          
          <!-- 新增子项按钮 -->
          <view
            class="header-btn add-btn"
            :class="{ disabled: !selectedItem }"
            @tap="handleAddClick(false)"
          >
            <text class="header-icon add-icon">+</text>
            <text class="header-text add-text">新增子项</text>
          </view>
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
            @longpress="!isEditMode ? handleChildItemLongPress(item) : null"
          >
            <text class="item-text">{{ truncateText(item.content) }}</text>
            <!-- 子项数量标记 -->
            <view v-if="item.children?.length > 0" class="child-count">
              <text class="count-text">{{ item.children.length }}</text>
            </view>
            <text v-if="isEditMode" class="edit-icon">⋮⋮</text>
          </view>
          
          <!-- 空状态 -->
          <view v-if="childItems.length === 0 && selectedItem" class="empty-state">
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
    
    <!-- 新增项目模态框 -->
    <view v-if="showAddDialog" class="modal-overlay" @tap="closeAddDialog">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">{{ addDialogTitle }}</text>
        
        <!-- 重复提示 -->
        <view v-if="duplicateMessage" class="duplicate-warning">
          <text class="duplicate-text">{{ duplicateMessage }}</text>
        </view>
        
        <input
          v-model="newItemText"
          class="modal-input"
          placeholder="请输入内容"
          placeholder-class="input-placeholder"
          focus
        />
        <view class="modal-actions">
          <text class="modal-btn cancel" @tap="closeAddDialog">取消</text>
          <text class="modal-btn confirm" @tap="confirmAddItem">确定</text>
        </view>
      </view>
    </view>
    
    <!-- 确认进入子层级对话框（查看模式下点击子项） -->
    <view v-if="showConfirmDialog && !isEditMode" class="modal-overlay" @tap="closeConfirmDialog">
      <view class="modal-content confirm-content" @tap.stop>
        <text class="modal-title">进入子层级</text>
        <text class="confirm-message">确定要将「{{ confirmItem?.content }}」作为新的父级显示吗？</text>
        <view class="modal-actions">
          <text class="modal-btn cancel" @tap="closeConfirmDialog">取消</text>
          <text class="modal-btn confirm" @tap="confirmEnterChildLevel">确定</text>
        </view>
      </view>
    </view>
    
    <!-- 删除确认对话框 -->
    <view v-if="showDeleteDialog" class="modal-overlay" @tap="closeDeleteDialog">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">{{ deleteDialogTitle }}</text>
        <text class="confirm-message">{{ deleteDialogMessage }}</text>
        <view class="modal-actions">
          <text class="modal-btn cancel" @tap="closeDeleteDialog">取消</text>
          <text class="modal-btn confirm delete" @tap="confirmDelete">删除</text>
        </view>
      </view>
    </view>
    
    <!-- 详情对话框（长按显示完整内容） -->
    <view v-if="showDetailDialog" class="modal-overlay" @tap="closeDetailDialog">
      <view class="modal-content detail-content" @tap.stop>
        <text class="detail-title">{{ detailItem?.content }}</text>
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

const emit = defineEmits(['close']);

// ============ 常量 ============
const LONG_PRESS_DURATION = 500; // 长按时间阈值 1秒

// ============ 响应式数据 ============
const isAnimating = ref(false);
const rootItems = ref([]); // 根级数据
const currentLevelItems = ref([]); // 当前层级的所有项（显示在父栏）
const childItems = ref([]); // 当前选中项的子项（显示在子栏）
const selectedItem = ref(null); // 当前选中的项
const pathStack = ref([]); // 路径栈，存储每一层的父项列表和选中的索引

// 新增模态框
const showAddDialog = ref(false);
const isAddingToParentColumn = ref(true); // true=父栏新增(当前层级兄弟), false=子栏新增
const newItemText = ref('');
const duplicateMessage = ref('');

// 确认对话框
const showConfirmDialog = ref(false);
const confirmItem = ref(null);

// 删除对话框
const showDeleteDialog = ref(false);
const deleteDialogTitle = ref('');
const deleteDialogMessage = ref('');
const itemToDelete = ref(null);
const isDeletingParent = ref(false);

// 详情对话框
const showDetailDialog = ref(false);
const detailItem = ref(null);

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

// 存储键名
const getStorageKey = () => `nested_list_${props.workId}`;

// ============ 计算属性 ============
const isAtTopLevel = computed(() => pathStack.value.length === 0);

const addDialogTitle = computed(() => 
  isAddingToParentColumn.value ? '新增' : '新增子项'
);

const panelStyle = computed(() => {
  const navBarHeight = 56; // 导航栏高度
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

// 加载数据
const loadData = () => {
  try {
    const key = getStorageKey();
    const data = uni.getStorageSync(key);
    if (data && data.rootItems) {
      rootItems.value = data.rootItems.map(item => deepCloneItem(item));
    } else {
      rootItems.value = [];
    }
    // 恢复到顶层状态
    currentLevelItems.value = rootItems.value;
    selectedItem.value = null;
    childItems.value = [];
    pathStack.value = [];
  } catch (e) {
    console.error('加载数据失败:', e);
    rootItems.value = [];
    currentLevelItems.value = [];
  }
};

// 保存数据
const saveData = () => {
  try {
    const key = getStorageKey();
    uni.setStorageSync(key, { rootItems: rootItems.value });
  } catch (e) {
    console.error('保存数据失败:', e);
  }
};

// 深拷贝NestedItem
const deepCloneItem = (item) => {
  if (!item) return null;
  return {
    id: item.id,
    content: item.content,
    children: (item.children || []).map(child => deepCloneItem(child))
  };
};

// 切换编辑/查看模式
const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
};

// 处理返回点击
const handleBackClick = () => {
  if (isAtTopLevel.value) return;

  // 弹出路径栈
  pathStack.value = pathStack.value.slice(0, -1);
  
  if (pathStack.value.length === 0) {
    // 回到顶层
    currentLevelItems.value = rootItems.value;
    selectedItem.value = null;
    childItems.value = [];
  } else {
    // 回到上一层
    const parentLevel = pathStack.value[pathStack.value.length - 1];
    currentLevelItems.value = parentLevel.items;
    selectedItem.value = parentLevel.selectedItem;
    childItems.value = parentLevel.selectedItem?.children || [];
  }
};

// 父项点击处理
const handleParentItemClick = (item) => {
  if (isEditMode.value) {
    // 编辑模式：弹出删除确认
    showDeleteParentConfirm(item);
  } else {
    // 查看模式：切换选择
    selectedItem.value = item;
    childItems.value = item.children || [];
  }
};

// 子项点击处理
const handleChildItemClick = (item) => {
  if (isEditMode.value) {
    // 编辑模式：弹出删除确认
    showDeleteChildConfirm(item);
  } else {
    // 查看模式：弹出进入子层级确认
    confirmItem.value = item;
    showConfirmDialog.value = true;
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
  const items = type === 'parent' ? currentLevelItems.value : childItems.value;
  
  // 简单的位置检测
  const itemHeight = 44; // 每个item的大致高度（rpx）
  const dragOffset = dragCurrentY.value - dragStartY.value;
  
  // 找到拖拽目标
  let targetIndex = -1;
  if (type === 'parent') {
    const currentIndex = currentLevelItems.value.findIndex(i => i.id === dragItem.value?.id);
    const offsetItems = Math.round(dragOffset / itemHeight);
    targetIndex = Math.max(0, Math.min(items.length - 1, currentIndex + offsetItems));
  } else {
    const currentIndex = childItems.value.findIndex(i => i.id === dragItem.value?.id);
    const offsetItems = Math.round(dragOffset / itemHeight);
    targetIndex = Math.max(0, Math.min(items.length - 1, currentIndex + offsetItems));
  }
  
  if (targetIndex >= 0 && targetIndex < items.length) {
    dragOverItem.value = items[targetIndex];
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
    const list = currentLevelItems.value;
    const fromIndex = list.findIndex(i => i.id === dragItem.value.id);
    const toIndex = list.findIndex(i => i.id === dragOverItem.value.id);
    
    if (fromIndex !== -1 && toIndex !== -1) {
      const [movedItem] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, movedItem);
      
      // 如果是顶层，同时更新rootItems
      if (isAtTopLevel.value) {
        rootItems.value = [...list];
      }
      
      saveData();
    }
  } else {
    const list = selectedItem.value?.children || [];
    const fromIndex = list.findIndex(i => i.id === dragItem.value.id);
    const toIndex = list.findIndex(i => i.id === dragOverItem.value.id);
    
    if (fromIndex !== -1 && toIndex !== -1) {
      const [movedItem] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, movedItem);
      saveData();
      childItems.value = [...list];
    }
  }
};

// 显示删除父项确认
const showDeleteParentConfirm = (item) => {
  isDeletingParent.value = true;
  itemToDelete.value = item;
  
  deleteDialogTitle.value = '删除父项';
  deleteDialogMessage.value = `确定要删除「${item.content}」及其全部子项吗？此操作不可恢复。`;
  
  showDeleteDialog.value = true;
};

// 显示删除子项确认
const showDeleteChildConfirm = (item) => {
  isDeletingParent.value = false;
  itemToDelete.value = item;
  deleteDialogTitle.value = '删除子项';
  deleteDialogMessage.value = `确定要删除「${item.content}」吗？此操作不可恢复。`;
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
    // 删除父项
    const list = currentLevelItems.value;
    const index = list.findIndex(i => i.id === itemToDelete.value.id);
    if (index !== -1) {
      list.splice(index, 1);
      // 如果删除的是当前选中的项，重置选择
      if (selectedItem.value?.id === itemToDelete.value.id) {
        selectedItem.value = null;
        childItems.value = [];
      }
    }
    
    // 如果是顶层，同时更新rootItems
    if (isAtTopLevel.value) {
      rootItems.value = [...list];
    }
  } else {
    // 删除子项
    const children = selectedItem.value?.children || [];
    const index = children.findIndex(i => i.id === itemToDelete.value.id);
    if (index !== -1) {
      children.splice(index, 1);
    }
    childItems.value = [...children];
  }
  
  saveData();
  closeDeleteDialog();
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

// 检查父栏是否重复
const isParentDuplicate = (content) => {
  return currentLevelItems.value.some(item => item.content === content);
};

// 检查子栏是否重复
const isChildDuplicate = (content) => {
  return childItems.value.some(item => item.content === content);
};

// 处理新增点击
const handleAddClick = (toParent) => {
  // 父栏新增：始终是添加当前层级的兄弟项
  // 子栏新增：添加选中项的子项
  if (!toParent && !selectedItem.value) return;
  isAddingToParentColumn.value = toParent;
  newItemText.value = '';
  duplicateMessage.value = '';
  showAddDialog.value = true;
};

// 关闭新增对话框
const closeAddDialog = () => {
  showAddDialog.value = false;
  newItemText.value = '';
  duplicateMessage.value = '';
};

// 确认新增
const confirmAddItem = () => {
  const content = newItemText.value.trim();
  if (!content) {
    closeAddDialog();
    return;
  }
  
  const newItem = {
    id: generateId(),
    content,
    children: []
  };
  
  // 防重复检测
  if (isAddingToParentColumn.value) {
    if (isParentDuplicate(content)) {
      duplicateMessage.value = `「${content}」已存在于当前列表中`;
      return;
    }
    
    // 父栏新增：添加到当前层级列表
    currentLevelItems.value.push(newItem);
    
    // 如果是顶层，同时更新rootItems
    if (isAtTopLevel.value) {
      rootItems.value = currentLevelItems.value;
    }
  } else {
    if (isChildDuplicate(content)) {
      duplicateMessage.value = `「${content}」已存在于当前子列表中`;
      return;
    }
    
    // 子栏新增：添加选中项的子项
    if (!selectedItem.value.children) {
      selectedItem.value.children = [];
    }
    selectedItem.value.children.push(newItem);
    childItems.value = [...selectedItem.value.children];
  }
  
  saveData();
  closeAddDialog();
};

// 关闭确认对话框
const closeConfirmDialog = () => {
  showConfirmDialog.value = false;
  confirmItem.value = null;
};

// 确认进入子层级
const confirmEnterChildLevel = () => {
  if (!confirmItem.value || !selectedItem.value) {
    closeConfirmDialog();
    return;
  }

  // 保存当前层级到路径栈
  pathStack.value = [...pathStack.value, {
    items: currentLevelItems.value,
    selectedItem: selectedItem.value
  }];

  // 进入子层级：将当前子项列表作为新的父项列表
  currentLevelItems.value = selectedItem.value.children || [];
  selectedItem.value = confirmItem.value;
  childItems.value = confirmItem.value.children || [];

  closeConfirmDialog();
};

// 清空所有数据（用于重置）
const clearAll = () => {
  rootItems.value = [];
  currentLevelItems.value = [];
  childItems.value = [];
  selectedItem.value = null;
  pathStack.value = [];
  isEditMode.value = false;
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
.nested-list-panel {
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

.nested-list-panel.show {
  transform: translateX(0);
  opacity: 1;
}

.panel-content {
  display: flex;
  width: 100%;
  height: 100%;
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

/* ============ 固定栏 ============ */
.fixed-header {
  background: #252525;
  padding: 0 12rpx;
  flex-shrink: 0;
}

.header-btn {
  display: flex;
  align-items: center;
  height: 96rpx;
  min-height: 96rpx;
  padding: 0 12rpx;
}

.header-btn.disabled {
  opacity: 0.5;
}

.header-icon {
  font-size: 32rpx;
  color: #e0e0e0;
  margin-right: 16rpx;
}

.header-text {
  font-size: 28rpx;
  color: #e0e0e0;
}

.add-icon {
  color: #007aff;
}

.add-text {
  color: #007aff;
}

.header-title {
  height: 96rpx;
  min-height: 96rpx;
  display: flex;
  align-items: center;
  padding: 0 12rpx;
}

.title-text {
  font-size: 28rpx;
  color: #e0e0e0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  justify-content: space-between;
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

.child-count {
  background: rgba(0, 122, 255, 0.2);
  border-radius: 24rpx;
  padding: 8rpx 16rpx;
  margin-left: 16rpx;
}

.count-text {
  font-size: 24rpx;
  color: #007aff;
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

.confirm-content {
  max-width: 560rpx;
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

.confirm-message {
  font-size: 28rpx;
  color: #b3b3b3;
  margin-bottom: 32rpx;
  display: block;
  line-height: 1.6;
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

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
            v-for="item in currentLevelItems"
            :key="item.id"
            class="list-item"
            :class="{ active: item.id === selectedItem?.id }"
            @tap="handleParentItemClick(item)"
          >
            <text class="item-text" :class="{ active: item.id === selectedItem?.id }">
              {{ truncateText(item.content) }}
            </text>
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
            v-for="item in childItems"
            :key="item.id"
            class="list-item child-item"
            @tap="handleChildItemClick(item)"
          >
            <text class="item-text">{{ truncateText(item.content) }}</text>
            <!-- 子项数量标记 -->
            <view v-if="item.children?.length > 0" class="child-count">
              <text class="count-text">{{ item.children.length }}</text>
            </view>
          </view>
          
          <!-- 空状态 -->
          <view v-if="childItems.length === 0 && selectedItem" class="empty-state">
            <text class="empty-text">暂无子项，点击上方新增</text>
          </view>
        </scroll-view>
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
    
    <!-- 确认对话框 -->
    <view v-if="showConfirmDialog" class="modal-overlay" @tap="closeConfirmDialog">
      <view class="modal-content confirm-content" @tap.stop>
        <text class="modal-title">进入子层级</text>
        <text class="confirm-message">确定要将「{{ confirmItem?.content }}」作为新的父级显示吗？</text>
        <view class="modal-actions">
          <text class="modal-btn cancel" @tap="closeConfirmDialog">取消</text>
          <text class="modal-btn confirm" @tap="confirmEnterChildLevel">确定</text>
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

// 处理父栏项点击
const handleParentItemClick = (item) => {
  selectedItem.value = item;
  childItems.value = item.children || [];
};

// 处理子栏项点击
const handleChildItemClick = (item) => {
  confirmItem.value = item;
  showConfirmDialog.value = true;
};

// 关闭确认对话框
const closeConfirmDialog = () => {
  showConfirmDialog.value = false;
  confirmItem.value = null;
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

// 获取当前层级数据引用（用于保存）
const getCurrentLevelRoot = () => {
  if (pathStack.value.length === 0) {
    return rootItems;
  }
  // 从路径栈找到根
  return rootItems;
};
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
  /* 防止触摸事件穿透 */
  touch-action: pan-y;
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

.modal-title {
  font-size: 36rpx;
  color: #e0e0e0;
  margin-bottom: 32rpx;
  display: block;
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

.confirm-message {
  font-size: 28rpx;
  color: #b3b3b3;
  margin-bottom: 32rpx;
  display: block;
  line-height: 1.6;
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

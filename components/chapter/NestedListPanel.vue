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
            v-for="item in parentItems"
            :key="item.id"
            class="list-item"
            :class="{ active: item.id === selectedParentItem?.id }"
            @tap="handleParentItemClick(item)"
          >
            <text class="item-text" :class="{ active: item.id === selectedParentItem?.id }">
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
            <text class="title-text">{{ selectedParentItem?.content || '请选择父项' }}</text>
          </view>
          
          <!-- 新增子项按钮 -->
          <view
            class="header-btn add-btn"
            :class="{ disabled: !selectedParentItem }"
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
          <view v-if="childItems.length === 0 && selectedParentItem" class="empty-state">
            <text class="empty-text">暂无子项，点击上方新增</text>
          </view>
        </scroll-view>
      </view>
    </view>
    
    <!-- 新增项目模态框 -->
    <view v-if="showAddDialog" class="modal-overlay" @tap="closeAddDialog">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">{{ addDialogTitle }}</text>
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
const parentItems = ref([]);
const childItems = ref([]);
const selectedParentItem = ref(null);
const pathHistory = ref([]); // 路径历史，用于回退

// 新增模态框
const showAddDialog = ref(false);
const isAddingToParent = ref(true);
const newItemText = ref('');

// 确认对话框
const showConfirmDialog = ref(false);
const confirmItem = ref(null);

// 存储键名
const getStorageKey = () => `nested_list_${props.workId}`;

// ============ 计算属性 ============
const isAtTopLevel = computed(() => pathHistory.value.length === 0);

const addDialogTitle = computed(() => 
  isAddingToParent.value ? '新增父项' : '新增子项'
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
    if (data) {
      parentItems.value = data.parentItems || [];
      childItems.value = data.childItems || [];
      selectedParentItem.value = data.selectedParentItem || null;
      pathHistory.value = data.pathHistory || [];
    }
  } catch (e) {
    console.error('加载数据失败:', e);
  }
};

// 保存数据
const saveData = () => {
  try {
    const key = getStorageKey();
    const data = {
      parentItems: parentItems.value,
      childItems: childItems.value,
      selectedParentItem: selectedParentItem.value,
      pathHistory: pathHistory.value
    };
    uni.setStorageSync(key, data);
  } catch (e) {
    console.error('保存数据失败:', e);
  }
};

// 处理返回点击
const handleBackClick = () => {
  if (isAtTopLevel.value) return;
  
  const previousLevel = pathHistory.value[pathHistory.value.length - 1];
  pathHistory.value = pathHistory.value.slice(0, -1);
  
  // 恢复上一层状态
  parentItems.value = previousLevel.parentItems;
  selectedParentItem.value = previousLevel.selectedParent;
  childItems.value = previousLevel.selectedParent?.children || [];
  
  saveData();
};

// 处理新增点击
const handleAddClick = (toParent) => {
  if (!toParent && !selectedParentItem.value) return;
  isAddingToParent.value = toParent;
  newItemText.value = '';
  showAddDialog.value = true;
};

// 关闭新增对话框
const closeAddDialog = () => {
  showAddDialog.value = false;
  newItemText.value = '';
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
  
  if (isAddingToParent.value) {
    // 添加到父栏
    if (isAtTopLevel.value) {
      parentItems.value.push(newItem);
    } else {
      // 在非顶层时，添加到当前父项
      selectedParentItem.value.children.push(newItem);
      childItems.value = [...selectedParentItem.value.children];
    }
  } else {
    // 添加到子栏
    selectedParentItem.value.children.push(newItem);
    childItems.value = [...selectedParentItem.value.children];
  }
  
  saveData();
  closeAddDialog();
};

// 处理父栏项点击
const handleParentItemClick = (item) => {
  selectedParentItem.value = item;
  childItems.value = item.children || [];
  saveData();
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

// 确认进入子层级
const confirmEnterChildLevel = () => {
  if (!confirmItem.value || !selectedParentItem.value) {
    closeConfirmDialog();
    return;
  }
  
  // 保存当前层级到历史
  const currentLevel = {
    parentItems: [...parentItems.value],
    selectedParent: { ...selectedParentItem.value }
  };
  pathHistory.value = [...pathHistory.value, currentLevel];
  
  // 进入子层级：将当前子项列表作为新的父项列表
  parentItems.value = [...childItems.value];
  selectedParentItem.value = confirmItem.value;
  childItems.value = confirmItem.value.children || [];
  
  saveData();
  closeConfirmDialog();
};

// 清空所有数据（用于重置）
const clearAll = () => {
  parentItems.value = [];
  childItems.value = [];
  selectedParentItem.value = null;
  pathHistory.value = [];
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
.nested-list-panel {
  position: fixed;
  right: 0;
  width: 66.67vw;
  height: 66.67vh;
  background: #1e1e1e;
  border-bottom-left-radius: 16rpx;
  z-index: 90;
  transform: translateX(100%);
  opacity: 0;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.nested-list-panel.show {
  transform: translateX(0);
  opacity: 1;
}

.panel-content {
  display: flex;
  width: 100%;
  height: 100%;
}

/* ============ 父栏（左侧） ============ */
.parent-column {
  width: 33.33%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ============ 子栏（右侧） ============ */
.child-column {
  width: 66.67%;
  height: 100%;
  display: flex;
  flex-direction: column;
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
}

.header-btn {
  display: flex;
  align-items: center;
  height: 96rpx;
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

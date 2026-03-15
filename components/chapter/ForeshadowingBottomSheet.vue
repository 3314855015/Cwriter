<template>
  <!-- 伏笔操作弹窗 - 从顶部弹出，占屏幕2/3 -->
  <view
    v-if="isVisible"
    class="top-sheet-overlay"
    @click="handleClose"
  >
    <view
      class="top-sheet"
      :class="{ show: isVisible, 'light-theme': !isDarkMode }"
      @click.stop
    >
      <!-- 拖拽指示器 -->
      <view class="drag-handle">
        <view class="drag-indicator"></view>
      </view>

      <!-- 标题栏 -->
      <view class="sheet-header">
        <text class="sheet-title">第 {{ paragraphIndex + 1 }} 段</text>
        <text class="sheet-hint">点击外部关闭</text>
      </view>

      <!-- 切换栏 -->
      <view class="tab-switcher">
        <view 
          class="tab-btn" 
          :class="{ active: activeTab === 'create' }"
          @tap="activeTab = 'create'"
        >
          <text class="tab-text">创建伏笔</text>
        </view>
        <view 
          class="tab-btn" 
          :class="{ active: activeTab === 'recycle' }"
          @tap="activeTab = 'recycle'"
        >
          <text class="tab-text">回收伏笔</text>
        </view>
      </view>

      <!-- 创建伏笔标签页 -->
      <view v-if="activeTab === 'create'" class="tab-content">
        <scroll-view class="scroll-area" scroll-y>
          <!-- 已有伏笔列表 -->
          <view v-if="createdForeshadowings.length > 0" class="foreshadowing-list">
            <view
              v-for="f in createdForeshadowings"
              :key="f.id"
              class="foreshadowing-card"
              :class="{ recycled: f.status === 'RECYCLED' }"
            >
              <text class="card-content">{{ f.content }}</text>
              <view class="card-footer">
                <text class="card-time">{{ formatTime(f.createdAt) }}</text>
                <view v-if="f.status === 'RECYCLED'" class="recycled-badge">
                  <text class="recycled-text">已回收</text>
                  <text v-if="getChapterInfo(f.recycledChapterId, f.recycledParagraphIndex)" class="recycled-location">
                    · {{ getChapterInfo(f.recycledChapterId, f.recycledParagraphIndex) }}
                  </text>
                </view>
              </view>
            </view>
          </view>
          <view v-else class="empty-state">
            <text class="empty-text">暂无伏笔</text>
          </view>
        </scroll-view>

        <!-- 创建输入栏 - 固定底部 -->
        <view class="input-bar">
          <input
            v-model="newForeshadowingContent"
            class="input-field"
            placeholder="写下新的伏笔..."
            placeholder-class="input-placeholder"
            :adjust-position="false"
          />
          <view 
            class="submit-btn" 
            :class="{ disabled: !newForeshadowingContent.trim() }"
            @tap="handleCreate"
          >
            <text class="submit-icon">+</text>
          </view>
        </view>
      </view>

      <!-- 回收伏笔标签页 -->
      <view v-if="activeTab === 'recycle'" class="tab-content">
        <scroll-view class="scroll-area" scroll-y>
          <!-- 本段已回收的伏笔 -->
          <view v-if="recycledHereForeshadowings.length > 0" class="section">
            <text class="section-title">本段已回收（长按可取消）</text>
            <view
              v-for="f in recycledHereForeshadowings"
              :key="f.id"
              class="foreshadowing-card recycled"
              @longpress="handleUnrecycle(f)"
            >
              <text class="card-content">{{ f.content }}</text>
              <view class="card-footer">
                <text class="card-meta">创建于 {{ getChapterInfo(f.chapterId, f.createdParagraphIndex) }}</text>
                <view class="recycled-badge">
                  <text class="recycled-text">已回收</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 待回收的伏笔列表（跨章节） -->
          <view class="section">
            <text class="section-title">待回收伏笔（长按选择，可跨章节）</text>
            
            <view v-if="pendingForeshadowings.length > 0" class="foreshadowing-list">
              <view
                v-for="f in pendingForeshadowings"
                :key="f.id"
                class="foreshadowing-card selectable"
                :class="{ selected: selectedIds.includes(f.id) }"
                @longpress="toggleSelection(f.id)"
              >
                <view class="card-main">
                  <view class="card-content-wrapper">
                    <text class="card-content">{{ f.content }}</text>
                    <text class="card-meta">创建于 {{ getChapterInfo(f.chapterId, f.createdParagraphIndex) }}</text>
                  </view>
                  <view v-if="selectedIds.includes(f.id)" class="check-icon">
                    <text class="check-text">✓</text>
                  </view>
                </view>
              </view>
            </view>
            <view v-else class="empty-state">
              <text class="empty-text">暂无待回收的伏笔</text>
            </view>
          </view>
        </scroll-view>

        <!-- 确认回收按钮 - 固定底部 -->
        <view v-if="selectedIds.length > 0" class="confirm-bar">
          <view class="confirm-btn" @click="showConfirmDialog = true">
            <text class="confirm-text">确认回收 ({{ selectedIds.length }})</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 确认回收对话框 -->
    <view v-if="showConfirmDialog" class="dialog-overlay" @click="showConfirmDialog = false">
      <view class="dialog" @click.stop>
        <text class="dialog-title">回收伏笔</text>
        <text class="dialog-message">确定要回收选中的 {{ selectedIds.length }} 个伏笔吗？</text>
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @click="showConfirmDialog = false">
            <text class="dialog-btn-text">取消</text>
          </view>
          <view class="dialog-btn confirm" @click="confirmRecycle">
            <text class="dialog-btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 取消回收对话框 -->
    <view v-if="showUnrecycleDialog" class="dialog-overlay" @click="showUnrecycleDialog = null">
      <view class="dialog" @click.stop>
        <text class="dialog-title">取消回收</text>
        <text class="dialog-message">确定要取消回收这个伏笔吗？</text>
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @click="showUnrecycleDialog = null">
            <text class="dialog-btn-text">取消</text>
          </view>
          <view class="dialog-btn confirm" @click="confirmUnrecycle">
            <text class="dialog-btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue';

// ============ Props & Emits ============
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  paragraphIndex: {
    type: Number,
    default: 0
  },
  foreshadowings: {
    type: Array,
    default: () => []
  },
  chapterId: {
    type: String,
    default: ''
  },
  chapters: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'create', 'recycle', 'unrecycle']);

// 注入主题
const isDarkMode = inject('isDarkMode', true);

// ============ 响应式数据 ============
const activeTab = ref('create');
const newForeshadowingContent = ref('');
const selectedIds = ref([]);
const showConfirmDialog = ref(false);
const showUnrecycleDialog = ref(null);

// ============ 计算属性 ============
// 在当前章节、当前段落创建的伏笔
const createdForeshadowings = computed(() => {
  return props.foreshadowings.filter(f => 
    f.chapterId === props.chapterId && 
    f.createdParagraphIndex === props.paragraphIndex
  );
});

// 在当前章节、当前段落回收的伏笔（排除在当前段落创建的）
const recycledHereForeshadowings = computed(() => {
  return props.foreshadowings.filter(f => 
    f.status === 'RECYCLED' &&
    f.recycledChapterId === props.chapterId &&
    f.recycledParagraphIndex === props.paragraphIndex &&
    // 排除在当前段落创建的（那些会显示在创建列表中）
    !(f.chapterId === props.chapterId && f.createdParagraphIndex === props.paragraphIndex)
  );
});

// 所有待回收的伏笔（跨章节）
const pendingForeshadowings = computed(() => {
  return props.foreshadowings.filter(f => f.status === 'PENDING');
});

// ============ 方法 ============
// 获取章节信息：第X章 章名 第X段
const getChapterInfo = (chapterId, paragraphIndex) => {
  if (!chapterId) return '';
  
  const chapter = props.chapters.find(ch => ch.id === chapterId);
  const chapterName = chapter?.title || '未知章节';
  const chapterIndex = props.chapters.findIndex(ch => ch.id === chapterId);
  
  const result = [];
  if (chapterIndex >= 0) {
    result.push(`第${chapterIndex + 1}章`);
  }
  result.push(chapterName);
  if (paragraphIndex !== undefined && paragraphIndex !== null) {
    result.push(`第${paragraphIndex + 1}段`);
  }
  
  return result.join(' ');
};

const handleClose = () => {
  emit('close');
};

const handleCreate = () => {
  const content = newForeshadowingContent.value.trim();
  if (!content) return;
  
  emit('create', {
    paragraphIndex: props.paragraphIndex,
    content: content
  });
  
  newForeshadowingContent.value = '';
};

const toggleSelection = (id) => {
  const index = selectedIds.value.indexOf(id);
  if (index > -1) {
    selectedIds.value.splice(index, 1);
  } else {
    selectedIds.value.push(id);
  }
};

const confirmRecycle = () => {
  selectedIds.value.forEach(id => {
    emit('recycle', {
      foreshadowingId: id,
      paragraphIndex: props.paragraphIndex
    });
  });
  selectedIds.value = [];
  showConfirmDialog.value = false;
};

const handleUnrecycle = (foreshadowing) => {
  showUnrecycleDialog.value = foreshadowing.id;
};

const confirmUnrecycle = () => {
  if (showUnrecycleDialog.value) {
    emit('unrecycle', {
      foreshadowingId: showUnrecycleDialog.value
    });
  }
  showUnrecycleDialog.value = null;
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
};

// ============ 监听 ============
watch(() => props.isVisible, (newVal) => {
  if (!newVal) {
    newForeshadowingContent.value = '';
    selectedIds.value = [];
    activeTab.value = 'create';
  }
});
</script>

<style scoped>
.top-sheet-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 300;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.top-sheet {
  background: #1e1e1e;
  width: 100%;
  height: 66.67vh;
  display: flex;
  flex-direction: column;
  border-bottom-left-radius: 24rpx;
  border-bottom-right-radius: 24rpx;
  transform: translateY(-100%);
  transition: transform 0.3s ease-out;
}

.top-sheet.light-theme {
  background: #ffffff;
}

.top-sheet.show {
  transform: translateY(0);
}

.drag-handle {
  display: flex;
  justify-content: center;
  padding-top: 20rpx;
  flex-shrink: 0;
}

.drag-indicator {
  width: 80rpx;
  height: 8rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4rpx;
}

.light-theme .drag-indicator {
  background: rgba(0, 0, 0, 0.2);
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx;
  flex-shrink: 0;
}

.sheet-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #e1e1e1;
}

.light-theme .sheet-title {
  color: #1a1a1a;
}

.sheet-hint {
  font-size: 22rpx;
  color: #666;
}

/* 切换栏 */
.tab-switcher {
  display: flex;
  margin: 0 32rpx 16rpx;
  background: #2d2d2d;
  border-radius: 16rpx;
  padding: 8rpx;
  flex-shrink: 0;
  width: calc(100% - 64rpx);
  box-sizing: border-box;
}

.light-theme .tab-switcher {
  background: #f0f0f0;
}

.tab-btn {
  flex: 1;
  padding: 20rpx;
  text-align: center;
  border-radius: 12rpx;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #bb86fc;
}

.tab-text {
  font-size: 28rpx;
  color: #e1e1e1;
  font-weight: 500;
}

.light-theme .tab-text {
  color: #333;
}

.tab-btn.active .tab-text {
  color: #fff;
  font-weight: 600;
}

/* 标签页内容 */
.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
}

.scroll-area {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  padding: 0 32rpx;
  overflow: hidden;
}

.section {
  margin-bottom: 24rpx;
  width: 100%;
  box-sizing: border-box;
}

.section-title {
  font-size: 24rpx;
  color: #888;
  margin-bottom: 12rpx;
  display: block;
}

/* 伏笔卡片 */
.foreshadowing-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  width: 100%;
  box-sizing: border-box;
}

.foreshadowing-card {
  background: #2d2d2d;
  border-radius: 16rpx;
  padding: 20rpx;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.light-theme .foreshadowing-card {
  background: #f5f5f5;
}

.foreshadowing-card.recycled {
  opacity: 0.7;
}

.foreshadowing-card.selectable.selected {
  background: rgba(187, 134, 252, 0.2);
  border: 2px solid #bb86fc;
}

.card-content {
  font-size: 28rpx;
  color: #e1e1e1;
  line-height: 1.5;
  word-wrap: break-word;
  word-break: break-all;
}

.light-theme .card-content {
  color: #1a1a1a;
}

.foreshadowing-card.recycled .card-content {
  text-decoration: line-through;
  opacity: 0.6;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8rpx;
  flex-wrap: wrap;
}

.card-time {
  font-size: 22rpx;
  color: #666;
}

.card-meta {
  font-size: 22rpx;
  color: #666;
  display: block;
  margin-top: 6rpx;
  word-wrap: break-word;
  word-break: break-all;
}

.recycled-badge {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.recycled-text {
  font-size: 20rpx;
  color: #bb86fc;
}

.recycled-location {
  font-size: 20rpx;
  color: #888;
  margin-left: 4rpx;
}

.card-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-content-wrapper {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.check-icon {
  width: 44rpx;
  height: 44rpx;
  background: #bb86fc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.check-text {
  color: #fff;
  font-size: 24rpx;
  font-weight: bold;
}

/* 空状态 */
.empty-state {
  padding: 48rpx;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #666;
}

/* 创建输入栏 */
.input-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 32rpx;
  background: #1e1e1e;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
}

.light-theme .input-bar {
  background: #fff;
}

.input-bar .input-field {
  flex: 1;
  height: 72rpx;
  background: #2d2d2d;
  border-radius: 36rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #e1e1e1;
}

.light-theme .input-bar .input-field {
  background: #f0f0f0;
  color: #1a1a1a;
}

.input-placeholder {
  color: #666;
}

.submit-btn {
  width: 64rpx;
  height: 64rpx;
  background: #bb86fc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.submit-btn.disabled {
  background: rgba(255, 255, 255, 0.2);
}

.light-theme .submit-btn.disabled {
  background: rgba(0, 0, 0, 0.1);
}

.submit-icon {
  color: #fff;
  font-size: 36rpx;
  font-weight: bold;
}

/* 确认按钮 */
.confirm-bar {
  padding: 16rpx 32rpx;
  background: #1e1e1e;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
}

.light-theme .confirm-bar {
  background: #fff;
}

.confirm-btn {
  background: #bb86fc;
  border-radius: 16rpx;
  padding: 24rpx;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
}

.confirm-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}

/* 对话框 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog {
  background: #2d2d2d;
  border-radius: 24rpx;
  padding: 40rpx;
  margin: 48rpx;
  min-width: 500rpx;
}

.light-theme .dialog {
  background: #fff;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #e1e1e1;
  display: block;
  margin-bottom: 20rpx;
}

.light-theme .dialog-title {
  color: #1a1a1a;
}

.dialog-message {
  font-size: 28rpx;
  color: #888;
  display: block;
  margin-bottom: 40rpx;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 24rpx;
}

.dialog-btn {
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
}

.dialog-btn.cancel {
  background: transparent;
}

.dialog-btn.cancel .dialog-btn-text {
  color: #888;
}

.dialog-btn.confirm {
  background: #bb86fc;
}

.dialog-btn.confirm .dialog-btn-text {
  color: #fff;
}

.dialog-btn-text {
  font-size: 28rpx;
  font-weight: 500;
}
</style>

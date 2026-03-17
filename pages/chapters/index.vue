<template>
  <view class="page-container" :class="{ 'light-theme': !isDarkMode }">
    <!-- 头部占位栏 - 防止内容与手机状态栏重叠 -->
    <HeaderPlaceholder />

    <!-- 页面头部 -->
    <view class="page-header">
      <view class="header-left" @tap="toggleCatalog">
        <view class="menu-icon">
          <view class="menu-line"></view>
          <view class="menu-line"></view>
          <view class="menu-line"></view>
        </view>
      </view>
      <view class="header-center">
        <text class="page-title">{{ workInfo.title }}</text>
      </view>
      <view class="header-right" @tap="goBack">
        <text class="close-text">X</text>
      </view>
    </view>

    <!-- 章节列表 -->
    <view class="chapters-container">
      <!-- 展示/功能栏 -->
      <view class="section-header">
        <text class="section-title">章节列表</text>
        <view class="header-right-section">
          <text class="chapter-count">共 {{ totalChapterCount }} 章</text>
          <view class="sort-toggle" @tap="toggleSortOrder">
            <text class="sort-text">{{ sortOrder === 'asc' ? '正序' : '倒序' }}</text>
            <view class="sort-icon" :class="{ reversed: sortOrder === 'desc' }">
              <text class="arrow">↓</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 内容栏 -->
      <view class="content-area">
        <!-- 新增卷单元（固定顶部） -->
        <view class="add-volume-cell" @tap="showCreateVolumeModal">
          <view class="add-volume-icon">
            <text class="plus-icon">+</text>
          </view>
          <text class="add-volume-text">新增卷</text>
        </view>

        <!-- 实体卷列表 -->
        <view class="volumes-list">
          <view 
            v-for="volume in sortedVolumes" 
            :key="volume.id" 
            class="volume-item"
          >
            <!-- 卷头 -->
            <view 
              class="volume-header"
              @tap="toggleVolumeExpand(volume.id)"
              @longpress="showVolumeActions(volume)"
            >
              <view class="volume-expand-icon" :class="{ expanded: expandedVolumeId === volume.id }">
                <text class="expand-arrow">›</text>
              </view>
              <text class="volume-title">{{ volume.name || volume.title || '未命名卷' }}</text>
              <text class="volume-count">{{ getVolumeChapterCount(volume.id) }}章</text>
            </view>

            <!-- 卷内章节（可展开 - 懒加载） -->
            <view 
              class="volume-chapters" 
              v-if="expandedVolumeId === volume.id && loadedVolumeIds.has(volume.id)"
            >
              <view 
                v-for="(chapter, cIndex) in getVolumeChapters(volume.id)" 
                :key="chapter.id"
                class="chapter-item"
                @tap="openChapter(chapter)"
                @longpress="showChapterActions(chapter)"
              >
                <text class="chapter-title">
                  第{{ getChapterNumber(volume.id, cIndex) }}章 {{ chapter.title || '未命名章节' }}
                </text>
                <text class="chapter-time">{{ formatTime(chapter.updated_at) }}</text>
                <view class="chapter-info">
                  <text class="chapter-words">{{ chapter.word_count || 0 }}字</text>
                  <view 
                    class="chapter-status"
                    :class="{ completed: chapter.is_completed }"
                  >
                    <text class="status-text">{{ chapter.is_completed ? '已完成' : '写作中' }}</text>
                  </view>
                </view>
              </view>
            </view>
            
            <!-- 加载中提示 -->
            <view 
              class="volume-loading" 
              v-if="expandedVolumeId === volume.id && !loadedVolumeIds.has(volume.id)"
            >
              <text class="loading-text">加载中...</text>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view class="empty-state" v-if="volumes.length === 0">
          <image
            class="empty-icon"
            src="/static/icons/file.svg"
            mode="aspectFit"
          ></image>
          <text class="empty-text">还没有创建卷</text>
          <view class="empty-btn" @tap="showCreateVolumeModal">
            <text class="btn-text">创建第一个卷</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 创建章节模态框 -->
    <view class="modal-overlay" v-if="showCreateChapterModal" @tap="showCreateChapterModal = false">
      <view class="create-chapter-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">创建新章节</text>
        </view>
        <view class="modal-body">
          <!-- 卷选择器 -->
          <view class="volume-select-area">
            <text class="select-label">目标卷：</text>
            <view class="volume-select-btn" @tap="showVolumeSelectMenu = true">
              <text class="select-value">{{ selectedVolumeName || '请选择卷' }}</text>
              <text class="select-arrow">▼</text>
            </view>
          </view>
          <!-- 章节标题输入 -->
          <view class="chapter-title-input-area">
            <input
              class="chapter-title-input"
              v-model="newChapterTitle"
              placeholder="请输入章节标题"
              :maxlength="50"
              :focus="showCreateChapterModal"
            />
            <text class="input-counter">{{ newChapterTitle.length }}/50</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @tap="showCreateChapterModal = false">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm" :class="{ disabled: !newChapterTitle.trim() || !selectedVolumeId }" @tap="confirmCreateChapter">
            <text class="btn-text">创建</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 卷选择菜单 -->
    <view class="action-menu-overlay volume-select-overlay" v-if="showVolumeSelectMenu" @tap="showVolumeSelectMenu = false">
      <view class="volume-select-menu" @tap.stop>
        <view class="menu-header">
          <text class="menu-header-text">选择目标卷</text>
        </view>
        <scroll-view scroll-y class="menu-scroll">
          <view 
            v-for="(volume, index) in volumes" 
            :key="volume.id"
            class="volume-option"
            :class="{ selected: selectedVolumeId === volume.id }"
            @tap="selectVolume(volume.id, index)"
          >
            <text class="volume-option-text">{{ volume.name || volume.title || '未命名卷' }}</text>
            <view class="volume-option-check" v-if="selectedVolumeId === volume.id">
              <text class="check-icon">✓</text>
            </view>
          </view>
        </scroll-view>
        <view class="menu-footer">
          <view class="add-volume-btn" @tap="goToCreateVolume">
            <text class="add-volume-btn-text">+ 新增卷</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 创建卷模态框 -->
    <CustomModal
      v-model:visible="showCreateVolumeModalFlag"
      title="创建新卷"
      :editable="true"
      placeholder="请输入卷名称"
      :maxlength="30"
      :show-counter="true"
      confirm-text="创建"
      @confirm="handleVolumeModalConfirm"
      @cancel="showCreateVolumeModalFlag = false"
    />

    <!-- 重命名卷模态框 -->
    <CustomModal
      v-model:visible="showRenameVolumeModal"
      title="修改卷名称"
      :editable="true"
      placeholder="请输入新的卷名称"
      :maxlength="30"
      :show-counter="true"
      confirm-text="确认"
      @confirm="handleRenameVolumeConfirm"
      @cancel="showRenameVolumeModal = false"
    />

    <!-- 卷操作菜单 -->
    <view class="action-menu-overlay" v-if="showVolumeMenu" @tap="closeVolumeMenu">
      <view class="action-menu" @tap.stop>
        <view class="menu-item" @tap="renameVolume">
          <text class="menu-item-text">修改卷名</text>
        </view>
        <view class="menu-item danger" @tap="confirmDeleteVolume">
          <text class="menu-item-text">删除卷</text>
        </view>
        <view class="menu-item cancel" @tap="closeVolumeMenu">
          <text class="menu-item-text">取消</text>
        </view>
      </view>
    </view>

    <!-- 章节操作菜单 -->
    <view class="action-menu-overlay" v-if="showChapterMenu" @tap="closeChapterMenu">
      <view class="action-menu" @tap.stop>
        <view class="menu-item danger" @tap="confirmDeleteChapter">
          <text class="menu-item-text">删除章节</text>
        </view>
        <view class="menu-item cancel" @tap="closeChapterMenu">
          <text class="menu-item-text">取消</text>
        </view>
      </view>
    </view>

    <!-- 底部导航栏 -->
    <BottomNav
      :active-nav="'manage'"
      :is-dark-mode="isDarkMode"
      @switch-nav="handleNavSwitch"
      @toggle-theme="toggleTheme"
    />

    <!-- FAB悬浮按钮 -->
    <view class="fab" @tap="addChapter">
      <text class="fab-icon">+</text>
    </view>

    <!-- 目录栏 -->
    <CatalogPanel
      :is-visible="showCatalog"
      :work-id="workId"
      :user-id="userId"
      :work-title="workInfo.title"
      @close="showCatalog = false"
      @open-chapter="openChapterFromCatalog"
    />
  </view>
</template>

<script setup>
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import HeaderPlaceholder from "@/components/HeaderPlaceholder.vue";
import BottomNav from "@/components/BottomNav.vue";
import CustomModal from "@/components/CustomModal.vue";
import CatalogPanel from "@/components/chapterlist/CatalogPanel.vue";
import FileSystemStorage from "@/utils/fileSystemStorage.js";
import themeManager, {
  isDarkMode as getIsDarkMode,
} from "@/utils/themeManager.js";

const fileStorage = FileSystemStorage;

// 响应式数据
const isDarkMode = ref(getIsDarkMode());
const workInfo = ref({ title: "加载中..." });
const volumes = ref([]);
const chaptersByVolume = ref({});
const workId = ref("");
const userId = ref("");
const showCatalog = ref(false);

// 排序相关
const sortOrder = ref('asc'); // 'asc' 正序, 'desc' 倒序

// 卷展开状态（互斥锁：只允许一个卷展开）
const expandedVolumeId = ref(null); // 当前展开的卷ID

// 已加载的卷ID集合（懒加载）
const loadedVolumeIds = ref(new Set());

// 模态框状态
const showCreateChapterModal = ref(false);
const showCreateVolumeModalFlag = ref(false);
const showRenameVolumeModal = ref(false);
const showVolumeMenu = ref(false);
const showVolumeSelectMenu = ref(false);
const showChapterMenu = ref(false);

// 选中的卷
const selectedVolumeId = ref('');
const selectedVolumeIndex = ref(0);
const currentEditingVolume = ref(null);
const currentEditingChapter = ref(null);

// 新章节标题
const newChapterTitle = ref('');

// 计算属性
const totalChapterCount = computed(() => {
  let total = 0;
  Object.values(chaptersByVolume.value).forEach(chapters => {
    total += chapters.length;
  });
  return total;
});

const selectedVolumeName = computed(() => {
  const vol = volumes.value.find(v => v.id === selectedVolumeId.value);
  return vol ? (vol.name || vol.title || '未命名卷') : '';
});

const sortedVolumes = computed(() => {
  if (sortOrder.value === 'desc') {
    return [...volumes.value].reverse();
  }
  return volumes.value;
});

// 获取卷的章节数量
const getVolumeChapterCount = (volumeId) => {
  return chaptersByVolume.value[volumeId]?.length || 0;
};

// 获取卷的章节列表
const getVolumeChapters = (volumeId) => {
  const chapters = chaptersByVolume.value[volumeId] || [];
  if (sortOrder.value === 'desc') {
    return [...chapters].reverse();
  }
  return chapters;
};

// 获取章节编号（全局连续编号）
const getChapterNumber = (volumeId, chapterIndex) => {
  let num = 1;
  const currentVolumes = sortOrder.value === 'desc' ? [...volumes.value].reverse() : volumes.value;
  
  for (const vol of currentVolumes) {
    if (vol.id === volumeId) {
      // 当前卷，加上章节在卷内的索引
      const chapters = chaptersByVolume.value[volumeId] || [];
      const actualIndex = sortOrder.value === 'desc' ? chapters.length - 1 - chapterIndex : chapterIndex;
      return num + actualIndex;
    }
    // 还没到当前卷，累加前面卷的章节数
    num += (chaptersByVolume.value[vol.id]?.length || 0);
  }
  
  return num + chapterIndex;
};

onLoad((options) => {
  // 初始化主题
  isDarkMode.value = themeManager.isDarkMode();

  // 监听主题变更事件
  try {
    if (typeof uni !== "undefined" && uni.$on) {
      uni.$on("theme-changed", (themeData) => {
        try {
          isDarkMode.value = themeData.isDark;
        } catch (error) {
          console.warn("主题变更处理失败:", error);
        }
      });
    }
  } catch (error) {
    console.warn("主题监听器设置失败:", error);
  }

  if (!options || !options.workId) {
    console.error("❌ 章节页面缺少必要参数 workId");
    uni.showToast({
      title: "参数错误",
      icon: "error",
    });
    setTimeout(() => uni.navigateBack(), 10);
    return;
  }

  workId.value = options.workId;
  userId.value = options.userId || "default_user";

  loadData();
});

// 加载数据
const loadData = async () => {
  try {
    // 读取作品配置
    const workPath = fileStorage.getWorkPath(userId.value, workId.value);
    const workConfigPath = `${workPath}/work.config.json`;
    const workConfig = await fileStorage.readFile(workConfigPath);

    if (workConfig) {
      workInfo.value = workConfig;
    }

    // 根据作品类型加载数据
    if (workConfig.structure_type === 'volumized') {
      // 分卷作品 - 加载卷和章节
      await loadVolumesAndChapters();
    } else {
      // 不分卷作品 - 自动创建默认卷
      await convertToVolumeStructure();
    }
  } catch (error) {
    console.error("❌ 加载数据失败:", error);
    uni.showToast({
      title: "加载数据失败",
      icon: "error",
    });
  }
};

// 加载卷和章节
const loadVolumesAndChapters = async () => {
  try {
    const volumeList = await fileStorage.getVolumes(userId.value, workId.value);
    volumes.value = volumeList;

    // 懒加载：初始只加载第一个卷的章节数据
    if (volumeList.length > 0) {
      const firstVolumeId = volumeList[0].id;
      await loadVolumeChapters(firstVolumeId);
      
      // 默认展开第一个卷
      expandedVolumeId.value = firstVolumeId;
      selectedVolumeId.value = firstVolumeId;
    }
  } catch (error) {
    console.error("❌ 加载卷章节失败:", error);
  }
};

// 转换为卷结构（兼容旧数据）
const convertToVolumeStructure = async () => {
  try {
    // 读取旧的章节数据
    const workPath = fileStorage.getWorkPath(userId.value, workId.value);
    const chaptersPath = `${workPath}/chapters/chapters.json`;
    const oldChapters = await fileStorage.readFile(chaptersPath) || [];

    // 创建默认卷
    const defaultVolume = await fileStorage.createVolume(userId.value, workId.value, {
      name: '正文',
      description: '默认卷'
    });

    // 迁移章节到默认卷
    for (const chapter of oldChapters) {
      await fileStorage.createChapter(userId.value, workId.value, defaultVolume.id, {
        title: chapter.title,
        content: chapter.content || '',
        word_count: chapter.word_count || 0,
        is_completed: chapter.is_completed || false
      });
    }

    // 更新作品配置
    await fileStorage.updateWork(userId.value, workId.value, {
      structure_type: 'volumized'
    });

    // 重新加载
    await loadVolumesAndChapters();
  } catch (error) {
    console.error("❌ 转换卷结构失败:", error);
  }
};

// 切换排序
const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
};

// 切换卷展开（互斥锁 + 懒加载）
const toggleVolumeExpand = async (volumeId) => {
  // 如果点击的是当前展开的卷，则收起
  if (expandedVolumeId.value === volumeId) {
    expandedVolumeId.value = null;
    return;
  }
  
  // 否则展开新卷（自动关闭之前的卷）
  expandedVolumeId.value = volumeId;
  
  // 懒加载：如果该卷还未加载章节数据，则加载
  if (!loadedVolumeIds.value.has(volumeId)) {
    await loadVolumeChapters(volumeId);
  }
};

// 加载单个卷的章节数据
const loadVolumeChapters = async (volumeId) => {
  try {
    const chapters = await fileStorage.getChaptersByVolume(userId.value, workId.value, volumeId);
    
    // 为每个章节添加 volume_id
    const chaptersWithVolumeId = (chapters || []).map(chapter => ({
      ...chapter,
      volume_id: volumeId
    }));
    
    // 更新章节数据
    chaptersByVolume.value[volumeId] = chaptersWithVolumeId;
    
    // 标记为已加载
    loadedVolumeIds.value.add(volumeId);
  } catch (error) {
    console.error(`加载卷 ${volumeId} 的章节失败:`, error);
    chaptersByVolume.value[volumeId] = [];
  }
};

// 显示卷操作菜单
const showVolumeActions = (volume) => {
  currentEditingVolume.value = volume;
  showVolumeMenu.value = true;
};

// 关闭卷操作菜单
const closeVolumeMenu = () => {
  showVolumeMenu.value = false;
  currentEditingVolume.value = null;
};

// 重命名卷
const renameVolume = () => {
  showVolumeMenu.value = false;
  showRenameVolumeModal.value = true;
};

// 确认重命名卷
const handleRenameVolumeConfirm = async (res) => {
  if (res.confirm && res.content?.trim()) {
    try {
      await fileStorage.updateVolume(userId.value, workId.value, currentEditingVolume.value.id, {
        name: res.content.trim(),
        title: res.content.trim()
      });
      
      // 更新本地数据
      const index = volumes.value.findIndex(v => v.id === currentEditingVolume.value.id);
      if (index > -1) {
        volumes.value[index].name = res.content.trim();
        volumes.value[index].title = res.content.trim();
      }
      
      uni.showToast({ title: '修改成功', icon: 'success' });
    } catch (error) {
      console.error('❌ 重命名卷失败:', error);
      uni.showToast({ title: '修改失败', icon: 'error' });
    }
  }
  showRenameVolumeModal.value = false;
  currentEditingVolume.value = null;
};

// 确认删除卷
const confirmDeleteVolume = () => {
  showVolumeMenu.value = false;
  const chapterCount = getVolumeChapterCount(currentEditingVolume.value.id);
  const volumeName = currentEditingVolume.value.name || currentEditingVolume.value.title || '未命名卷';
  
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${volumeName}」吗？\n该卷内的 ${chapterCount} 个章节将一并删除，此操作不可撤销！`,
    confirmColor: '#ff4444',
    success: async (res) => {
      if (res.confirm) {
        await deleteVolumeWithChapters();
      }
      currentEditingVolume.value = null;
    }
  });
};

// 删除卷及其章节
const deleteVolumeWithChapters = async () => {
  try {
    const volumeId = currentEditingVolume.value.id;
    
    // 删除卷（文件系统会自动删除卷内章节）
    await fileStorage.deleteVolume(userId.value, workId.value, volumeId);
    
    // 更新本地数据
    volumes.value = volumes.value.filter(v => v.id !== volumeId);
    delete chaptersByVolume.value[volumeId];
    
    // 更新加载状态
    loadedVolumeIds.value.delete(volumeId);
    
    // 如果删除的是当前展开的卷，清空展开状态
    if (expandedVolumeId.value === volumeId) {
      expandedVolumeId.value = null;
    }
    
    // 如果删除的是选中的卷，重置选中状态
    if (selectedVolumeId.value === volumeId) {
      selectedVolumeId.value = volumes.value.length > 0 ? volumes.value[0].id : '';
    }
    
    uni.showToast({ title: '删除成功', icon: 'success' });
  } catch (error) {
    console.error('❌ 删除卷失败:', error);
    uni.showToast({ title: '删除失败', icon: 'error' });
  }
};

// 显示创建卷模态框
const showCreateVolumeModal = () => {
  showCreateVolumeModalFlag.value = true;
};

// 处理创建卷确认
const handleVolumeModalConfirm = async (res) => {
  if (res.confirm && res.content?.trim()) {
    try {
      const newVolume = await fileStorage.createVolume(userId.value, workId.value, {
        name: res.content.trim(),
        description: ''
      });
      
      // 更新本地数据
      volumes.value.push(newVolume);
      chaptersByVolume.value[newVolume.id] = [];
      
      // 标记新卷为已加载（空章节）
      loadedVolumeIds.value.add(newVolume.id);
      
      // 自动展开新卷（关闭其他卷）
      expandedVolumeId.value = newVolume.id;
      
      // 自动选中新卷
      selectedVolumeId.value = newVolume.id;
      selectedVolumeIndex.value = volumes.value.length - 1;
      
      uni.showToast({ title: '创建成功', icon: 'success' });
    } catch (error) {
      console.error('❌ 创建卷失败:', error);
      uni.showToast({ title: '创建失败', icon: 'error' });
    }
  }
  showCreateVolumeModalFlag.value = false;
};

// 添加章节（FAB按钮）
const addChapter = () => {
  // 检查是否有卷
  if (volumes.value.length === 0) {
    uni.showToast({ title: '请先创建卷', icon: 'none' });
    showCreateVolumeModalFlag.value = true;
    return;
  }
  
  // 设置默认选中第一个卷
  if (!selectedVolumeId.value && volumes.value.length > 0) {
    selectedVolumeId.value = volumes.value[0].id;
    selectedVolumeIndex.value = 0;
  }
  
  showCreateChapterModal.value = true;
};

// 选择卷
const selectVolume = (volumeId, index) => {
  selectedVolumeId.value = volumeId;
  selectedVolumeIndex.value = index;
  showVolumeSelectMenu.value = false;
};

// 跳转到创建卷
const goToCreateVolume = () => {
  showVolumeSelectMenu.value = false;
  showCreateChapterModal.value = false;
  showCreateVolumeModalFlag.value = true;
};

// 确认创建章节
const confirmCreateChapter = async () => {
  if (!newChapterTitle.value.trim()) {
    uni.showToast({ title: '请输入章节标题', icon: 'none' });
    return;
  }
  
  if (!selectedVolumeId.value) {
    uni.showToast({ title: '请选择目标卷', icon: 'none' });
    return;
  }
  
  try {
    const newChapter = await fileStorage.createChapter(
      userId.value, 
      workId.value, 
      selectedVolumeId.value, 
      {
        title: newChapterTitle.value.trim(),
        content: '',
        word_count: 0,
        is_completed: false
      }
    );
    
    // 更新本地数据
    if (!chaptersByVolume.value[selectedVolumeId.value]) {
      chaptersByVolume.value[selectedVolumeId.value] = [];
    }
    // 添加 volume_id 到新章节
    chaptersByVolume.value[selectedVolumeId.value].push({
      ...newChapter,
      volume_id: selectedVolumeId.value
    });
    
    // 标记为已加载
    loadedVolumeIds.value.add(selectedVolumeId.value);
    
    // 自动展开目标卷（关闭其他卷）
    expandedVolumeId.value = selectedVolumeId.value;
    
    // 重置输入
    newChapterTitle.value = '';
    showCreateChapterModal.value = false;
    
    uni.showToast({ title: '创建成功', icon: 'success' });
  } catch (error) {
    console.error('❌ 创建章节失败:', error);
    uni.showToast({ title: '创建失败', icon: 'error' });
  }
};

// 显示章节操作菜单
const showChapterActions = (chapter) => {
  currentEditingChapter.value = chapter;
  showChapterMenu.value = true;
};

// 关闭章节操作菜单
const closeChapterMenu = () => {
  showChapterMenu.value = false;
  currentEditingChapter.value = null;
};

// 确认删除章节
const confirmDeleteChapter = () => {
  showChapterMenu.value = false;
  
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${currentEditingChapter.value.title || '未命名章节'}」吗？此操作不可撤销。`,
    confirmColor: '#ff4444',
    success: async (res) => {
      if (res.confirm) {
        await deleteChapter(currentEditingChapter.value);
      }
      currentEditingChapter.value = null;
    }
  });
};

// 删除章节
const deleteChapter = async (chapter) => {
  try {
    const volumeId = chapter.volume_id;
    
    await fileStorage.deleteChapter(userId.value, workId.value, volumeId, chapter.id);
    
    // 更新本地数据
    const chapters = chaptersByVolume.value[volumeId];
    if (chapters) {
      const index = chapters.findIndex(c => c.id === chapter.id);
      if (index > -1) {
        chapters.splice(index, 1);
      }
    }
    
    uni.showToast({ title: '删除成功', icon: 'success' });
  } catch (error) {
    console.error('❌ 删除章节失败:', error);
    uni.showToast({ title: '删除失败', icon: 'error' });
  }
};

// 打开章节
const openChapter = (chapter) => {
  uni.navigateTo({
    url: `/pages/editor/chapter?workId=${workId.value}&chapterId=${chapter.id}&userId=${userId.value}&volumeId=${chapter.volume_id || ''}`,
  });
};

const openChapterFromCatalog = (chapter) => {
  openChapter(chapter);
};

const formatTime = (timestamp) => {
  if (!timestamp) return "未知时间";

  try {
    const now = new Date();
    const time = new Date(timestamp);

    if (isNaN(time.getTime())) {
      return "未知时间";
    }

    const diff = now.getTime() - time.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return time.toLocaleDateString();
  } catch (error) {
    return "未知时间";
  }
};

const goBack = () => {
  uni.navigateBack();
};

const toggleCatalog = () => {
  showCatalog.value = !showCatalog.value;
};

const toggleTheme = () => {
  themeManager.toggleTheme();
  isDarkMode.value = themeManager.isDarkMode();
};

const handleNavSwitch = (navType) => {
  if (navType === "home") {
    uni.switchTab({
      url: "/pages/index/index",
    });
  }
};
</script>

<style scoped>
.page-container {
  background-color: #1a1a1a;
  color: #ffffff;
  min-height: 100vh;
  padding-bottom: 80px;
  box-sizing: border-box;
}

.light-theme {
  background-color: #f5f5f5;
  color: #333333;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(45, 45, 45, 0.9);
  border-bottom: 1px solid #404040;
}

.light-theme .page-header {
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid #e0e0e0;
}

.header-left,
.header-right {
  width: 60px;
  display: flex;
  align-items: center;
}

.header-left {
  justify-content: flex-start;
  padding-left: 16px;
}

.header-right {
  justify-content: flex-end;
  padding-right: 16px;
}

/* 三行扛菜单图标 */
.menu-icon {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
}

.menu-line {
  width: 20px;
  height: 2px;
  background: #b3b3b3;
  border-radius: 1px;
}

.light-theme .menu-line {
  background: #666666;
}

.close-text {
  font-size: 16px;
  font-weight: 500;
  color: #b3b3b3;
}

.light-theme .close-text {
  color: #666666;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  text-align: center;
  flex: 1;
}

.light-theme .page-title {
  color: #333333;
}

/* FAB悬浮按钮 */
.fab {
  position: fixed;
  right: 20px;
  bottom: 100px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
  z-index: 100;
  transition: all 0.3s ease;
}

.fab:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
}

.fab-icon {
  color: #ffffff;
  font-size: 32px;
  font-weight: 300;
  line-height: 1;
}

.chapters-container {
  flex: 1;
  padding: 16px;
}

/* 展示/功能栏 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.light-theme .section-title {
  color: #333333;
}

.header-right-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chapter-count {
  font-size: 14px;
  color: #b3b3b3;
}

.light-theme .chapter-count {
  color: #666666;
}

.sort-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(255, 107, 53, 0.15);
  border-radius: 16px;
  border: 1px solid rgba(255, 107, 53, 0.3);
}

.light-theme .sort-toggle {
  background: rgba(255, 107, 53, 0.1);
  border: 1px solid rgba(255, 107, 53, 0.2);
}

.sort-text {
  font-size: 13px;
  color: #ff6b35;
  font-weight: 500;
}

.sort-icon {
  display: flex;
  align-items: center;
  transition: transform 0.3s ease;
}

.sort-icon.reversed {
  transform: rotate(180deg);
}

.arrow {
  font-size: 12px;
  color: #ff6b35;
}

/* 内容区域 */
.content-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 新增卷单元 */
.add-volume-cell {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: rgba(255, 107, 53, 0.1);
  border: 2px dashed rgba(255, 107, 53, 0.4);
  border-radius: 6px;
}

.light-theme .add-volume-cell {
  background: rgba(255, 107, 53, 0.08);
  border: 2px dashed rgba(255, 107, 53, 0.3);
}

.add-volume-icon {
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background: rgba(255, 107, 53, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.plus-icon {
  font-size: 20px;
  color: #ff6b35;
  font-weight: 300;
}

.add-volume-text {
  font-size: 15px;
  color: #ff6b35;
  font-weight: 500;
}

/* 卷列表 */
.volumes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.volume-item {
  background: rgba(45, 45, 45, 0.6);
  border-radius: 6px;
  overflow: hidden;
}

.light-theme .volume-item {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

/* 卷头 */
.volume-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: rgba(55, 55, 55, 0.8);
  transition: background 0.2s ease;
}

.light-theme .volume-header {
  background: rgba(255, 255, 255, 1);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.volume-expand-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  transition: transform 0.3s ease;
}

.volume-expand-icon.expanded {
  transform: rotate(90deg);
}

.expand-arrow {
  font-size: 18px;
  color: #b3b3b3;
  font-weight: 300;
}

.light-theme .expand-arrow {
  color: #666666;
}

.volume-title {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
}

.light-theme .volume-title {
  color: #333333;
}

.volume-count {
  font-size: 13px;
  color: #b3b3b3;
}

.light-theme .volume-count {
  color: #888888;
}

/* 卷内章节 */
.volume-chapters {
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 6px;
  background: rgba(35, 35, 35, 0.5);
}

.light-theme .volume-chapters {
  background: rgba(245, 245, 245, 0.8);
}

/* 章节项（恢复正常大小） */
.chapter-item {
  padding: 12px 16px;
  background: rgba(50, 50, 50, 0.7);
  border-radius: 6px;
}

.light-theme .chapter-item {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.chapter-title {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  display: block;
  margin-bottom: 4px;
}

.light-theme .chapter-title {
  color: #333333;
}

.chapter-time {
  font-size: 11px;
  color: #888888;
  display: block;
  margin-bottom: 6px;
}

.light-theme .chapter-time {
  color: #999999;
}

.chapter-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chapter-words {
  font-size: 12px;
  color: #888888;
}

.light-theme .chapter-words {
  color: #999999;
}

.chapter-status {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  background: #ff6b35;
  color: white;
}

.chapter-status.completed {
  background: #4ecdc4;
}

/* 加载中提示 */
.volume-loading {
  padding: 20px;
  text-align: center;
}

.loading-text {
  font-size: 14px;
  color: #888888;
}

.light-theme .loading-text {
  color: #999999;
}

/* 创建章节模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}

.create-chapter-modal {
  width: 85%;
  max-width: 340px;
  background: #2a2a2a;
  border-radius: 16px;
  overflow: hidden;
}

.light-theme .create-chapter-modal {
  background: #ffffff;
}

.modal-header {
  padding: 20px 20px 12px;
  text-align: center;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.light-theme .modal-title {
  color: #333333;
}

.modal-body {
  padding: 12px 20px 20px;
}

/* 卷选择区域 */
.volume-select-area {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.select-label {
  font-size: 14px;
  color: #b3b3b3;
  margin-right: 12px;
}

.light-theme .select-label {
  color: #666666;
}

.volume-select-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255, 107, 53, 0.1);
  border: 1px solid rgba(255, 107, 53, 0.3);
  border-radius: 8px;
}

.select-value {
  font-size: 14px;
  color: #ff6b35;
}

.select-arrow {
  font-size: 10px;
  color: #ff6b35;
}

/* 章节标题输入 */
.chapter-title-input-area {
  position: relative;
}

.chapter-title-input {
  width: 100%;
  height: 44px;
  padding: 0 16px;
  padding-right: 50px;
  background: #1a1a1a;
  border: 1px solid #404040;
  border-radius: 8px;
  color: #ffffff;
  font-size: 16px;
  box-sizing: border-box;
}

.light-theme .chapter-title-input {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  color: #333333;
}

.input-counter {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #666666;
}

/* 模态框底部按钮 */
.modal-footer {
  display: flex;
  border-top: 1px solid #404040;
}

.light-theme .modal-footer {
  border-top: 1px solid #e0e0e0;
}

.modal-btn {
  flex: 1;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-btn.cancel .btn-text {
  color: #999999;
}

.modal-btn.confirm .btn-text {
  color: #ff6b35;
  font-weight: 500;
}

.modal-btn.disabled .btn-text {
  color: #666666;
}

/* 卷选择菜单 */
.volume-select-menu {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #2a2a2a;
  border-radius: 16px 16px 0 0;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
}

.light-theme .volume-select-menu {
  background: #ffffff;
}

.menu-header {
  padding: 16px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .menu-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.menu-header-text {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.light-theme .menu-header-text {
  color: #333333;
}

.menu-scroll {
  flex: 1;
  max-height: 40vh;
}

.volume-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.light-theme .volume-option {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.volume-option.selected {
  background: rgba(255, 107, 53, 0.1);
}

.volume-option-text {
  font-size: 15px;
  color: #ffffff;
}

.light-theme .volume-option-text {
  color: #333333;
}

.volume-option.selected .volume-option-text {
  color: #ff6b35;
  font-weight: 500;
}

.volume-option-check {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon {
  font-size: 16px;
  color: #ff6b35;
}

.menu-footer {
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .menu-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.add-volume-btn {
  padding: 14px;
  text-align: center;
  background: rgba(255, 107, 53, 0.1);
  border-radius: 8px;
  border: 1px dashed rgba(255, 107, 53, 0.3);
}

.add-volume-btn-text {
  font-size: 15px;
  color: #ff6b35;
  font-weight: 500;
}

/* 操作菜单 */
.action-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

/* 卷选择菜单 - 层级高于模态框 */
.volume-select-overlay {
  z-index: 400;
}

.action-menu {
  width: 100%;
  background: #2a2a2a;
  border-radius: 16px 16px 0 0;
  padding: 8px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
}

.light-theme .action-menu {
  background: #ffffff;
}

.menu-item {
  padding: 16px;
  text-align: center;
  border-radius: 8px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.05);
}

.light-theme .menu-item {
  background: rgba(0, 0, 0, 0.03);
}

.menu-item.danger {
  background: rgba(255, 68, 68, 0.1);
}

.menu-item.danger .menu-item-text {
  color: #ff4444;
}

.menu-item.cancel {
  margin-top: 8px;
  background: rgba(255, 107, 53, 0.1);
}

.menu-item-text {
  font-size: 16px;
  color: #ffffff;
}

.light-theme .menu-item-text {
  color: #333333;
}

.menu-item.cancel .menu-item-text {
  color: #ff6b35;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #b3b3b3;
  margin-bottom: 20px;
}

.light-theme .empty-text {
  color: #666666;
}

.empty-btn {
  padding: 12px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
  transition: all 0.3s ease;
}

.empty-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
}

.btn-text {
  font-size: 14px;
  font-weight: 500;
  color: inherit;
}
</style>

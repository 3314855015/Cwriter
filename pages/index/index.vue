<template>
  <!-- 页面主容器 -->
  <view class="page-container" :class="{ 'light-theme': !isDarkMode }">
    <!-- 头部占位栏 - 防止内容与手机状态栏重叠 -->
    <HeaderPlaceholder />

    <!-- 用户信息区域 -->
    <view class="user-section">
      <view class="user-info" @tap="goToProfile">
        <view class="avatar-container">
          <view class="user-avatar">
            <image
              class="avatar-icon"
              src="/static/icons/user.svg"
              mode="aspectFit"
            ></image>
          </view>
        </view>
        <view class="user-details">
          <text class="user-name">游客</text>
          <text class="user-status">继续你的创作之旅</text>
        </view>
      </view>
      <button class="notification-btn" @tap="showNotifications">
        <image
          class="notification-icon"
          src="/static/icons/bell.svg"
          mode="aspectFit"
        ></image>
      </button>
    </view>

    <!-- 数据统计卡片 -->
    <view class="stats-card">
      <view class="stats-item">
        <text class="stats-number stats-primary">{{
          statsData.totalWorks
        }}</text>
        <text class="stats-label">总作品</text>
      </view>
      <view class="stats-item">
        <text class="stats-number stats-secondary">{{
          formatWordCount(statsData.totalCharacters)
        }}</text>
        <text class="stats-label">总字数</text>
      </view>
      <view class="stats-item">
        <text class="stats-number stats-tertiary">{{
          statsData.totalMaps
        }}</text>
        <text class="stats-label">地图</text>
      </view>
    </view>

    <!-- 标签导航 -->
    <view class="tabs-container">
      <scroll-view class="tabs-scroll" scroll-x="true" show-scrollbar="false">
        <view class="tabs">
          <view
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-item"
            :class="{ active: activeTab === tab.id }"
            @tap="switchTab(tab.id)"
          >
            <text class="tab-text">{{ tab.name }}</text>
            <view
              class="tab-indicator"
              :class="{ active: activeTab === tab.id }"
            ></view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 作品列表 -->
    <scroll-view 
      class="works-list" 
      scroll-y="true"
      :enhanced="true"
      :show-scrollbar="false"
      :bounces="true"
    >
      <!-- 加载状态 -->
      <view v-if="isLoading" class="loading-state">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中</text>
      </view>
      
      <!-- 空状态 -->
      <view v-else-if="filteredWorks.length === 0" class="empty-state">
        <image class="empty-icon" src="/static/icons/file.svg" mode="aspectFit"></image>
        <text class="empty-text">还没有作品</text>
        <view class="empty-btn" @tap="createNewWork">
          <text class="btn-text">创建第一个作品</text>
        </view>
      </view>
      
      <!-- 作品列表 -->
      <view v-else class="work-items">
        <view
          v-for="work in filteredWorks"
          :key="work.id"
          class="work-item"
          @tap="openWork(work.id)"
          hover-class="work-item-hover"
          :hover-stay-time="50"
        >
          <view class="work-content">
            <view class="work-main">
              <text class="work-title">{{ work.title }}</text>
              <text class="work-time">{{ work.modifiedTime }}</text>
            </view>
            <view class="work-info">
              <text class="work-chapter">{{ work.chapter }}</text>
              <view class="work-meta">
                <image
                  class="work-icon"
                  src="/static/icons/file.svg"
                  mode="aspectFit"
                  lazy-load
                ></image>
                <text class="work-words">{{ formatWordCount(work.wordCount) }}字</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 悬浮创建按钮 -->
    <view class="fab-container">
      <view class="fab-menu" :class="{ show: isMenuOpen }">
        <button
          v-for="menuItem in menuItems"
          :key="menuItem.id"
          class="fab-menu-item"
          :style="getMenuItemStyle(menuItem)"
          @tap="handleMenuAction(menuItem.action)"
        >
          <image
            class="fab-icon"
            :src="getIconPath(menuItem.icon)"
            mode="aspectFit"
          ></image>
          <text class="fab-menu-label">{{ menuItem.label }}</text>
        </button>
      </view>

      <button class="fab-main" @tap="toggleMenu">
        <image
          class="fab-main-icon"
          :src="
            isMenuOpen ? '/static/icons/times.svg' : '/static/icons/plus.svg'
          "
          mode="aspectFit"
        ></image>
      </button>
    </view>

    <!-- 底部导航栏 -->
    <BottomNav
      :active-nav="'home'"
      :is-dark-mode="isDarkMode"
      @switch-nav="handleNavSwitch"
      @toggle-theme="toggleTheme"
    />

    <!-- 创建作品弹窗 -->
    <CreateWorkModal
      v-if="currentUser && currentUser.id"
      :visible="showCreateWorkModal"
      @update:visible="showCreateWorkModal = $event"
      @created="handleWorkCreated"
      :userId="currentUser.id"
    />
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import CreateWorkModal from "@/components/CreateWorkModal.vue";
import HeaderPlaceholder from "@/components/HeaderPlaceholder.vue";

import BottomNav from "@/components/BottomNav.vue";
import FileSystemStorage from "@/utils/fileSystemStorage.js";
import { OfflineAuthService } from "@/utils/offlineAuth.js";
import themeManager, {
  isDarkMode as getIsDarkMode,
  getCurrentTheme,
} from "@/utils/themeManager.js";

// 使用导入的实例（已经是实例，不需要 new）
const fileStorage = FileSystemStorage;

// 响应式数据
const activeTab = ref("recent");
const isMenuOpen = ref(false);
const isDarkMode = ref(getIsDarkMode());
const activeNav = ref("home");
const showCreateWorkModal = ref(false);

const currentUser = ref(null);
const statsData = ref({
  totalWorks: 0,
  totalCharacters: 0,
  totalMaps: 0,
});

// 标签数据
const tabs = ref([
  { id: "recent", name: "最近" },
  { id: "favorite", name: "收藏" },
  { id: "local", name: "本机" },
  { id: "map", name: "场景" },
]);

// 菜单项数据
const menuItems = ref([
  {
    id: "work",
    icon: "icon-file-alt",
    action: "createNewWork",
    label: "作品",
    gradient: "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)",
  },
  {
    id: "character",
    icon: "icon-user-plus",
    action: "createNewCharacter",
    label: "人物",
    gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  },
  {
    id: "setting",
    icon: "icon-cog",
    action: "createNewSetting",
    label: "设定",
    gradient: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
  },
  {
    id: "foreshadowing",
    icon: "icon-lightbulb",
    action: "createNewForeshadowing",
    label: "伏笔",
    gradient: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
  },
  {
    id: "map",
    icon: "icon-map-marked-alt",
    action: "createNewMap",
    label: "场景",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
]);

// 作品数据 - 初始为空，显示加载状态
const works = ref([]);
const isLoading = ref(true);

// 计算属性：根据当前标签筛选作品
const filteredWorks = computed(() => {
  // 使用缓存优化性能
  if (!works.value || works.value.length === 0) {
    return [];
  }
  
  if (activeTab.value === "recent") {
    // 最近标签：显示所有作品
    return works.value;
  } else if (activeTab.value === "local") {
    // 本机标签：显示所有作品（因为都是本地存储）
    return works.value;
  } else if (activeTab.value === "favorite") {
    // 收藏标签：显示标记为收藏的作品
    return works.value.filter((work) => work.is_favorite === true);
  } else if (activeTab.value === "map") {
    // 地图标签：显示有地图的作品
    return works.value.filter((work) => work.map_count > 0);
  }
  return works.value;
});

// 生命周期
onMounted(() => {
  try {
    initPage();

    // 监听主题变更事件
    if (typeof uni !== 'undefined' && uni.$on) {
      uni.$on("theme-changed", (themeData) => {
        try {
          isDarkMode.value = themeData.isDark;
        } catch (error) {
          console.warn('主题变更处理失败:', error);
        }
      });
    }
  } catch (error) {
    console.error('页面初始化失败:', error);
  }
});

const switchTab = (tabId) => {
  activeTab.value = tabId;
};

const handleNavSwitch = (navType) => {
  if (navType === "profile") {
    goToProfile();
  }
};

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const toggleTheme = () => {
  const newTheme = themeManager.toggleTheme();
  isDarkMode.value = themeManager.isDarkMode();
  activeNav.value = "theme";
};

const getMenuItemStyle = (menuItem) => {
  return {
    background: menuItem.gradient,
    color: "#fff",
    border: isDarkMode.value
      ? "1px solid rgba(255,255,255,0.2)"
      : "1px solid rgba(0,0,0,0.05)",
  };
};

const handleMenuAction = (action) => {
  switch (action) {
    case "createNewWork":
      createNewWork();
      break;
    case "createNewCharacter":
      openCreationPage("character");
      break;
    case "createNewSetting":
      openCreationPage("setting");
      break;
    case "createNewForeshadowing":
      openCreationPage("foreshadowing");
      break;
    case "createNewMap":
      openCreationPage("map");
      break;
    default:
      openCreationPage();
      break;
  }
  isMenuOpen.value = false;
};
// 初始化页面
const initPage = async () => {
  // 初始化主题
  isDarkMode.value = themeManager.isDarkMode();

  // 检查是否需要自动切换主题
  themeManager.applyAutoSwitch();

  // 环境检测
  try {
    const systemInfo = uni.getSystemInfoSync();

    if (systemInfo.uniPlatform === "app") {
      // App环境使用plus.io
      if (typeof plus !== "undefined" && plus.io) {
      } else {
      }
    } else if (systemInfo.uniPlatform === "mp-weixin") {
      // 小程序环境使用uni.getFileSystemManager
      if (typeof uni.getFileSystemManager === "function") {
      } else {
      }
    } else if (systemInfo.uniPlatform === "h5") {
      // H5环境使用localStorage
    } else {
    }
  } catch (e) {
    console.error("获取系统信息失败:", e);
  }

  try {
    // 直接使用 default_user，不需要认证检查
    currentUser.value = {
      id: "default_user",
      username: "离线用户",
      email: "",
    };

    // 初始化用户存储

    await fileStorage.initUserStorage(currentUser.value.id);

    // 加载用户数据（扫描 works 目录）
    await loadUserData();

    // 输出存储路径调试信息
    fileStorage.logStoragePaths(currentUser.value.id);

    // 执行自动备份
    await createAutoBackup();

    // 调试：直接测试作品扫描

    const testWorks = await fileStorage.getUserWorks(currentUser.value.id);
  } catch (error) {
    console.error("❌ 初始化页面失败:", error);
    console.error("错误堆栈:", error.stack);

    // 失败时仍使用默认用户
    currentUser.value = {
      id: "default_user",
      username: "离线用户",
      email: "",
    };

    try {
      await fileStorage.initUserStorage(currentUser.value.id);
      await loadUserData();
    } catch (fallbackError) {
      console.error("❌ 回退方案也失败:", fallbackError);
    }
  }
};

// 字数格式化函数 - 将字数转换为K/W/M格式
const formatWordCount = (count) => {
  if (!count || count === 0) return '0';
  
  const num = parseInt(count);
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'm';
  } else if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
};

// 加载用户数据
const loadUserData = async () => {
  if (!currentUser.value) return;

  try {
    isLoading.value = true;
    
    // 加载作品列表（现在会扫描 works 目录下的所有 work.config.json）
    const userWorks = await fileStorage.getUserWorks(currentUser.value.id);

    // 使用 Promise.all 来并行处理所有作品的字数计算
    const worksPromises = userWorks.map(async (work) => {
      let wordCount = 0;
      
      try {
        // 所有作品都使用分章节字数获取逻辑
        wordCount = await getChapterizedWorkWordCount(work.id);
      } catch (error) {
        console.warn(`获取作品 ${work.title} 字数失败:`, error);
        // 如果读取失败，使用估算字数
        wordCount = (work.title?.length || 0) + (work.description?.length || 0);
      }

      return {
        id: work.id,
        title: work.title || "未命名作品",
        modifiedTime: formatTime(work.updated_at || work.created_at),
        chapter: await getChapterCount(work.id),
        wordCount: wordCount,
        structure_type: work.structure_type, // 确保保留结构类型
        description: work.description || "",
        category: work.category || "novel",
        created_at: work.created_at,
        updated_at: work.updated_at,
        is_active: work.is_active,
        file_structure: work.file_structure,
        local_file_path: work.local_file_path,
        folderName: work.folderName,
      };
    });

    // 等待所有作品数据处理完成
    works.value = await Promise.all(worksPromises);

    // 更新统计数据
    try {
      const stats = fileStorage.getStorageStats(currentUser.value.id);
      statsData.value = {
        totalWorks: works.value.length,
        totalCharacters: works.value.reduce(
          (sum, work) => sum + work.wordCount,
          0
        ),
        totalMaps: stats?.totalMaps || 0,
      };
    } catch (statsError) {
      console.error("获取统计数据失败，使用本地统计:", statsError);
      statsData.value = {
        totalWorks: works.value.length,
        totalCharacters: works.value.reduce(
          (sum, work) => sum + work.wordCount,
          0
        ),
        totalMaps: 0,
      };
    }
  } catch (error) {
    console.error("❌ 加载用户数据失败:", error);
    // 如果加载失败，清空作品列表并设置默认统计
    works.value = [];
    statsData.value = {
      totalWorks: 0,
      totalCharacters: 0,
      totalMaps: 0,
    };
  } finally {
    isLoading.value = false;
  }
};

// 创建自动备份
const createAutoBackup = async () => {
  try {
    console.log('开始创建自动备份...');
    
    // 获取所有作品
    const userWorks = await fileStorage.getUserWorks(currentUser.value.id);
    
    if (!userWorks || userWorks.length === 0) {
      console.log('没有作品需要备份');
      return;
    }
    
    const backupData = {
      backup_time: new Date().toISOString(),
      user_id: currentUser.value.id,
      app_version: '2.0.0',
      works: []
    };
    
    // 遍历所有作品，备份重要数据
    for (const work of userWorks) {
      try {
        const workDetail = await fileStorage.getWorkDetail(currentUser.value.id, work.id);
        if (workDetail) {
          backupData.works.push({
            id: workDetail.id,
            title: workDetail.title,
            description: workDetail.description,
            category: workDetail.category,
            structure_type: workDetail.structure_type,
            created_at: workDetail.created_at,
            updated_at: workDetail.updated_at,
            content: workDetail.content
          });
        }
      } catch (workError) {
        console.warn(`备份作品 ${work.id} 失败:`, workError);
      }
    }
    
    // 保存备份到本地存储
    const backupKey = `cwriter_auto_backup_${currentUser.value.id}_${new Date().toISOString().split('T')[0]}`;
    uni.setStorageSync(backupKey, backupData);
    
    console.log(`自动备份创建成功，备份了 ${backupData.works.length} 个作品`);
    
    // 清理旧备份（保留最近7天）
    const storageKeys = uni.getStorageInfoSync().keys;
    const backupKeys = storageKeys.filter(key => key.startsWith('cwriter_auto_backup_'));
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    for (const key of backupKeys) {
      const dateStr = key.split('_').pop();
      if (dateStr && dateStr.includes('-')) {
        const backupDate = new Date(dateStr);
        if (backupDate < sevenDaysAgo) {
          uni.removeStorageSync(key);
          console.log(`清理旧备份: ${key}`);
        }
      }
    }
    
  } catch (error) {
    console.error('⚠️ 创建自动备份失败:', error);
  }
};

// 获取分章节作品的字数统计
const getChapterizedWorkWordCount = async (workId) => {
  if (!currentUser.value || !workId) return 0;
  
  try {
    const workPath = fileStorage.getWorkPath(currentUser.value.id, workId);
    const chaptersPath = `${workPath}/chapters/chapters.json`;
    const chaptersList = await fileStorage.readFile(chaptersPath);
    
    if (!Array.isArray(chaptersList)) {
      console.warn(`作品 ${workId} 章节列表格式不正确`);
      return 0;
    }
    
    let totalWordCount = 0;
    
    // 遍历所有章节，累加字数
    for (const chapter of chaptersList) {
      if (chapter.word_count) {
        totalWordCount += chapter.word_count;
      } else {
        // 如果章节没有字数统计，尝试从章节文件中获取
        try {
          const chapterPath = `${workPath}/chapters/${chapter.id}.json`;
          const chapterData = await fileStorage.readFile(chapterPath);
          if (chapterData && chapterData.word_count) {
            totalWordCount += chapterData.word_count;
          } else if (chapterData && chapterData.content) {
            totalWordCount += chapterData.content.replace(/\s/g, "").length;
          }
        } catch (chapterError) {
          console.warn(`读取章节 ${chapter.id} 失败:`, chapterError);
        }
      }
    }
    
    return totalWordCount;
  } catch (error) {
    console.error(`获取作品 ${workId} 章节字数失败:`, error);
    return 0;
  }
};

// 获取分章节作品的章节数量
const getChapterCount = async (workId) => {
  if (!currentUser.value || !workId) return "0章";
  
  try {
    const workPath = fileStorage.getWorkPath(currentUser.value.id, workId);
    const chaptersPath = `${workPath}/chapters/chapters.json`;
    const chaptersList = await fileStorage.readFile(chaptersPath);
    
    if (Array.isArray(chaptersList)) {
      const chapterCount = chaptersList.filter(ch => ch.is_active !== false).length;
      return `${chapterCount}章`;
    }
  } catch (error) {
    console.warn(`获取作品 ${workId} 章节数量失败:`, error);
  }
  
  return "0章";
};

// 创建新作品
const createNewWork = () => {
  showCreateWorkModal.value = true;
};

// 处理作品创建成功
const handleWorkCreated = async (newWork) => {
  // 所有作品都使用分章节字数获取逻辑
  const wordCount = await getChapterizedWorkWordCount(newWork.id);

  // 添加到作品列表
  const formattedWork = {
    id: newWork.id,
    title: newWork.title,
    modifiedTime: formatTime(newWork.updated_at),
    chapter: await getChapterCount(newWork.id),
    wordCount: wordCount,
    structure_type: newWork.structure_type,
    type: "recent",
  };

  works.value.unshift(formattedWork);

  // 更新统计数据
  statsData.value = {
    totalWorks: works.value.length,
    totalCharacters: works.value.reduce(
      (sum, work) => sum + work.wordCount,
      0
    ),
    totalMaps: statsData.value.totalMaps || 0,
  };
};

// 格式化时间显示
const formatTime = (timestamp) => {
  if (!timestamp) return "未知时间";

  try {
    const now = new Date();
    const time = new Date(timestamp);

    // 检查时间是否有效
    if (isNaN(time.getTime())) {
      console.warn("⚠️ 无效的时间戳:", timestamp);
      return "未知时间";
    }

    const diff = now.getTime() - time.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "刚刚修改";
    if (minutes < 60) return `${minutes}分钟前修改`;
    if (hours < 24) return `${hours}小时前修改`;
    if (days < 7) return `${days}天前修改`;

    return time.toLocaleDateString() + "修改";
  } catch (error) {
    console.error("⚠️ 时间格式化错误:", error, timestamp);
    return "未知时间";
  }
};

const openWork = (workId) => {
  // 找到对应的作品信息
  const work = works.value.find((w) => w.id === workId);
  if (!work) {
    console.error("❌ 作品不存在:", workId);
    uni.showToast({
      title: "作品不存在",
      icon: "error",
    });
    return;
  }

  // 根据作品类型跳转到不同页面
  if (work.structure_type === "single") {
    // 整体作品 - 跳转到文档编辑页面
    uni.navigateTo({
      url: `/pages/editor/index?workId=${workId}&userId=${currentUser.value.id}`,
    });
  } else if (work.structure_type === "chapterized") {
    // 分章节作品 - 跳转到章节列表页面
    uni.navigateTo({
      url: `/pages/chapters/index?workId=${workId}&userId=${currentUser.value.id}`,
    });
  } else {
    // 未知类型，默认跳转到文档编辑
    uni.navigateTo({
      url: `/pages/editor/index?workId=${workId}&userId=${currentUser.value.id}`,
    });
  }
};

const creationRouteMap = {
  character: "/pages/create/character",
  setting: "/pages/create/setting"
};

const openCreationPage = (type) => {
  const userId = currentUser.value?.id || "default_user";
  const basePath = type && creationRouteMap[type] ? creationRouteMap[type] : "/pages/create/index";
  const query = [`userId=${userId}`];

  if (type && !creationRouteMap[type]) {
    query.push(`type=${type}`);
  }

  uni.navigateTo({
    url: `${basePath}?${query.join("&")}`,
  });
};

const goToProfile = () => {};

const goToService = () => {};

const showNotifications = () => {};

// 图标路径映射函数
const getIconPath = (iconClass) => {
  const iconMap = {
    "icon-file-alt": "/static/icons/file.svg",
    "icon-user-plus": "/static/icons/user.svg",
    "icon-cog": "/static/icons/cog.svg",
    "icon-lightbulb": "/static/icons/lightbulb.svg",
    "icon-map-marked-alt": "/static/icons/map.svg",
  };
  return iconMap[iconClass] || "/static/icons/file.svg";
};
</script>

<style scoped>
/* 页面主容器 */
.page-container {
  background-color: #1a1a1a;
  color: #ffffff;
  min-height: 100vh;
  position: relative;
  padding-bottom: 80px;
  box-sizing: border-box;
  overflow-x: hidden;
  transition: all 0.5s ease;
}

/* 亮色主题样式 */
.page-container.light-theme {
  background-color: #f5f5f5;
  color: #333333;
}

.page-container.light-theme .user-section {
  background: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid #e0e0e0;
}

.page-container.light-theme .user-section .user-name {
  color: #333333;
}

.page-container.light-theme .user-section .user-status {
  color: #666666;
}

.page-container.light-theme .work-item {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

/* 作品标题亮色主题样式 */
.page-container.light-theme .work-title {
  color: #333333;
}

.page-container.light-theme .work-time {
  color: #666666;
}

.page-container.light-theme .work-chapter {
  color: #666666;
}

.page-container.light-theme .work-words {
  color: #666666;
}

/* 作品标题亮色主题样式 */
.page-container.light-theme .work-title {
  color: #333333;
}

.page-container.light-theme .work-time {
  color: #666666;
}

.page-container.light-theme .work-chapter {
  color: #666666;
}

.page-container.light-theme .work-words {
  color: #666666;
}

/* 作品标题亮色主题样式 */
.page-container.light-theme .work-title {
  color: #333333;
}

.page-container.light-theme .work-time {
  color: #666666;
}

.page-container.light-theme .work-chapter {
  color: #666666;
}

.page-container.light-theme .work-words {
  color: #666666;
}

/* 作品标题亮色主题样式 */
.page-container.light-theme .work-title {
  color: #333333;
}

.page-container.light-theme .work-time {
  color: #666666;
}

.page-container.light-theme .work-chapter {
  color: #666666;
}

.page-container.light-theme .work-words {
  color: #666666;
}

.page-container.light-theme .bottom-nav {
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

/* 数据统计卡片亮色主题样式 */
.page-container.light-theme .stats-card {
  background: linear-gradient(to right, #f0f0f0, #e8e8e8);
}

.page-container.light-theme .stats-label {
  color: #666666;
}



/* 用户信息区域 */
.user-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--card-bg, rgba(45, 45, 45, 0.7));
  border-bottom: 1px solid var(--border-color, #404040);
  transition: all 0.5s ease;
}

/* 通知按钮在用户信息区域右侧 */
.notification-btn {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: rgba(64, 64, 64, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  flex-shrink: 0;
  margin-right: 8px;
}

.notification-icon {
  width: 24px;
  height: 24px;
}

/* 通知按钮亮色主题样式 */
.page-container.light-theme .notification-btn {
  background: rgba(0, 0, 0, 0.1);
}

.user-section .user-name {
  color: var(--text-color, #ffffff);
  transition: color 0.5s ease;
}

.user-section .user-status {
  color: var(--text-secondary, #b3b3b3);
  transition: color 0.5s ease;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  width: 24px;
  height: 24px;
  color: white;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.user-status {
  font-size: 12px;
  color: #b3b3b3;
  margin-top: 2px;
}

/* 数据统计卡片 */
.stats-card {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 16px 0;
  background: linear-gradient(to right, #2d2d2d, #404040);
}

.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-number {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.stats-primary {
  color: #ff6b35;
}

.stats-secondary {
  color: #4ecdc4;
}

.stats-tertiary {
  color: #45b7d1;
}

.stats-label {
  font-size: 12px;
  color: #b3b3b3;
}

/* 标签导航 */
.tabs-container {
  margin: 16px 0;
}

.tabs-scroll {
  white-space: nowrap;
}

.tabs {
  display: flex;
  padding: 0 16px;
  gap: 24px;
}

.tab-item {
  position: relative;
  padding: 8px 0;
  flex-shrink: 0;
}

.tab-text {
  font-size: 14px;
  color: #b3b3b3;
  transition: color 0.3s ease;
}

.tab-item.active .tab-text {
  color: #ff6b35;
  font-weight: 500;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #ff6b35;
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.tab-indicator.active {
  transform: scaleX(1);
}

/* 作品列表 */
.works-list {
  height: calc(100vh - 440px);
  padding: 0 16px;
  box-sizing: border-box;
  margin-bottom: 16px;
}

.work-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.work-item {
  background: rgba(45, 45, 45, 0.7);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
}

.work-item:active {
  background: rgba(64, 64, 64, 0.5);
  transform: translateY(1px);
}

.work-item-hover {
  background: rgba(64, 64, 64, 0.3);
  transform: translateY(-1px);
  transition: all 0.1s ease;
}

.work-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.work-main {
  flex: 1;
}

.work-title {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  display: block;
}

.work-time {
  font-size: 11px;
  color: #b3b3b3;
  margin-top: 2px;
  display: block;
}

.work-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.work-chapter {
  font-size: 12px;
  color: #b3b3b3;
}

.work-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #808080;
}

.work-icon {
  width: 14px;
  height: 14px;
}

/* 悬浮按钮 */
.fab-container {
  position: fixed;
  bottom: 100px;
  right: 24px;
  z-index: 999;
}

.fab-menu {
  position: absolute;
  bottom: 80px;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 0;
  transform: scale(0);
  transform-origin: bottom right;
  transition: all 0.3s ease;
}

.fab-menu.show {
  opacity: 1;
  transform: scale(1);
}

.fab-menu-item {
  min-width: 100px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border: none;
  color: #ffffff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(4px);
  font-size: 13px;
  font-weight: 500;
}

.page-container.light-theme .fab-menu-item {
  box-shadow: 0 10px 24px rgba(255, 105, 90, 0.18);
}

.fab-icon {
  width: 16px;
  height: 16px;
  filter: brightness(0) invert(1);
}

.fab-menu-label {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.fab-main {
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
}

.fab-main-icon {
  width: 20px;
  height: 20px;
  filter: brightness(0) invert(1);
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 107, 53, 0.3);
  border-top: 3px solid #FF6B35;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 16px;
  color: #B3B3B3;
}

.light-theme .loading-text {
  color: #666666;
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
  color: #B3B3B3;
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
</style>

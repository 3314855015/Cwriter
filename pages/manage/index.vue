<template>
  <view class="page-container" :class="{ 'light-theme': !isDarkMode }">
    <!-- 头部状态占位栏 -->
    <HeaderPlaceholder />

    <!-- 切换栏 -->
    <view class="tab-bar">
      <view 
        class="tab-item"
        :class="{ active: currentTab === 'import' }"
        @tap="switchTab('import')"
      >
        <text class="tab-icon">📥</text>
        <text class="tab-text">导入小说</text>
      </view>
      <view 
        class="tab-item"
        :class="{ active: currentTab === 'export' }"
        @tap="switchTab('export')"
      >
        <text class="tab-icon">📤</text>
        <text class="tab-text">导出小说</text>
      </view>
    </view>

    <!-- 导入面板 -->
    <ImportPanel
      v-if="currentTab === 'import'"
      :user-id="currentUser?.id || ''"
      :is-dark-mode="isDarkMode"
      @import-success="handleImportSuccess"
      @import-error="handleImportError"
    />

    <!-- 导出面板 -->
    <ExportPanel
      v-if="currentTab === 'export'"
      :user-id="currentUser?.id || ''"
      :is-dark-mode="isDarkMode"
      @export-success="handleExportSuccess"
      @export-error="handleExportError"
    />

    <!-- 底部导航栏 -->
    <BottomNav
      :active-nav="'manage'"
      :is-dark-mode="isDarkMode"
      @switch-nav="handleNavSwitch"
      @toggle-theme="toggleTheme"
    />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import HeaderPlaceholder from '@/components/HeaderPlaceholder.vue';
import BottomNav from '@/components/BottomNav.vue';
import ImportPanel from '@/components/writersmanger/ImportPanel.vue';
import ExportPanel from '@/components/writersmanger/ExportPanel.vue';
import { OfflineAuthService } from '@/utils/offlineAuth.js';
import themeManager from '@/utils/themeManager.js';

// 响应式数据
const isDarkMode = ref(themeManager.isDarkMode());
const currentTab = ref('import');
const currentUser = ref(null);

// 获取页面参数
onLoad((options) => {
  // 初始化主题
  isDarkMode.value = themeManager.isDarkMode();

  // 监听主题变更
  try {
    if (typeof uni !== 'undefined' && uni.$on) {
      uni.$on('theme-changed', (themeData) => {
        isDarkMode.value = themeData.isDark;
      });
    }
  } catch (error) {
    console.warn('主题监听器设置失败:', error);
  }

  // 处理页面参数
  if (options?.tab) {
    currentTab.value = options.tab;
  }
  
  if (options?.workId) {
    // 如果有作品ID，切换到导出页面
    currentTab.value = 'export';
  }
});

// 页面初始化
onMounted(async () => {
  // 获取当前用户
  try {
    currentUser.value = await OfflineAuthService.getCurrentUser();
    if (!currentUser.value?.id) {
      currentUser.value = {
        id: 'default_user',
        username: '离线用户',
        email: ''
      };
    }
  } catch (error) {
    console.error('加载用户数据失败:', error);
    currentUser.value = {
      id: 'default_user',
      username: '离线用户',
      email: ''
    };
  }
});

// 切换标签
const switchTab = (tab) => {
  currentTab.value = tab;
};

// 导航功能
const handleNavSwitch = () => {
  // 由 BottomNav 组件内部处理
};

const toggleTheme = () => {
  themeManager.toggleTheme();
  isDarkMode.value = themeManager.isDarkMode();
};

// 导入成功处理
const handleImportSuccess = (data) => {
  console.log('导入成功:', data);
  // 可以跳转到作品详情或章节列表
};

// 导入失败处理
const handleImportError = (error) => {
  console.error('导入失败:', error);
};

// 导出成功处理
const handleExportSuccess = (data) => {
  console.log('导出成功:', data);
};

// 导出失败处理
const handleExportError = (error) => {
  console.error('导出失败:', error);
};
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: radial-gradient(
      circle at 20% 20%,
      rgba(255, 138, 45, 0.08),
      transparent 36%
    ),
    radial-gradient(
      circle at 80% 10%,
      rgba(255, 138, 45, 0.06),
      transparent 30%
    ),
    linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
  color: #ffffff;
  padding-bottom: 80px;
  display: flex;
  flex-direction: column;
}

.light-theme.page-container {
  --surface-1: #ffffff;
  --surface-2: #f7f7f7;
  --border: rgba(0, 0, 0, 0.06);
  --text-primary: #1c1c1c;
  --text-secondary: rgba(0, 0, 0, 0.62);
  background: radial-gradient(
      circle at 20% 20%,
      rgba(255, 138, 45, 0.07),
      transparent 34%
    ),
    radial-gradient(circle at 80% 0%, rgba(255, 138, 45, 0.05), transparent 30%),
    linear-gradient(135deg, #ffffff 0%, #f3f3f3 100%);
  color: var(--text-primary);
}

/* 切换栏 */
.tab-bar {
  display: flex;
  padding: 12px 16px;
  gap: 12px;
  background: rgba(45, 45, 45, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.light-theme .tab-bar {
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.tab-item {
  flex: 1;
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.light-theme .tab-item {
  background: rgba(0, 0, 0, 0.03);
}

.tab-item.active {
  background: rgba(255, 107, 53, 0.15);
  border-color: #ff6b35;
}

.tab-icon {
  font-size: 28px;
}

.tab-text {
  font-size: 14px;
  font-weight: 600;
  color: #b3b3b3;
}

.light-theme .tab-text {
  color: #666666;
}

.tab-item.active .tab-text {
  color: #ff6b35;
}
</style>

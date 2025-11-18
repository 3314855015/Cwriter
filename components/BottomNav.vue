<template>
  <view class="bottom-nav">
    <view 
      class="nav-item" 
      :class="{ active: activeNav === 'home' }"
      @tap="switchNav('home')"
    >
      <view class="nav-indicator" v-if="activeNav === 'home'"></view>
      <view class="nav-icon">
        <image class="nav-icon-img" src="/static/icons/home.svg" mode="aspectFit"></image>
      </view>
      <text class="nav-text">首页</text>
    </view>
    
    <view 
      class="nav-item" 
      :class="{ active: activeNav === 'theme' }"
      @tap="toggleTheme"
    >
      <view class="nav-indicator" v-if="activeNav === 'theme'"></view>
      <view class="nav-icon">
        <image class="nav-icon-img" :src="isDarkMode ? '/static/icons/moon.svg' : '/static/icons/sun.svg'" mode="aspectFit"></image>
      </view>
      <text class="nav-text">主题</text>
    </view>
    
    <view 
      class="nav-item" 
      :class="{ active: activeNav === 'manage' }"
      @tap="switchNav('manage')"
    >
      <view class="nav-indicator" v-if="activeNav === 'manage'"></view>
      <view class="nav-icon">
        <image class="nav-icon-img" src="/static/icons/folder.svg" mode="aspectFit"></image>
      </view>
      <text class="nav-text">管理</text>
    </view>
    
    <view 
      class="nav-item" 
      :class="{ active: activeNav === 'service' }"
      @tap="switchNav('service')"
    >
      <view class="nav-indicator" v-if="activeNav === 'service'"></view>
      <view class="nav-icon">
        <image class="nav-icon-img" src="/static/icons/map.svg" mode="aspectFit"></image>
      </view>
      <text class="nav-text">服务</text>
    </view>
    
    <view 
      class="nav-item" 
      :class="{ active: activeNav === 'profile' }"
      @tap="switchNav('profile')"
    >
      <view class="nav-indicator" v-if="activeNav === 'profile'"></view>
      <view class="nav-icon">
        <image class="nav-icon-img" src="/static/icons/user.svg" mode="aspectFit"></image>
      </view>
      <text class="nav-text">我的</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  activeNav: {
    type: String,
    default: 'home'
  },
  isDarkMode: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['switchNav', 'toggleTheme'])

const switchNav = (target) => {
  if (target === 'manage') {
    uni.navigateTo({
      url: '/pages/manage/index'
    })
  } else if (target === 'service') {
    uni.showToast({
      title: '服务功能开发中',
      icon: 'none'
    })
  } else if (target === 'profile') {
    uni.showToast({
      title: '个人中心开发中',
      icon: 'none'
    })
  } else if (target === 'home') {
    uni.navigateTo({
      url: '/pages/index/index'
    })
  }
  
  emit('switchNav', target)
}

const toggleTheme = () => {
  emit('toggleTheme')
}
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120rpx;
  background: linear-gradient(
    to top,
    rgba(30, 30, 30, 0.98) 0%,
    rgba(30, 30, 30, 0.92) 50%,
    rgba(30, 30, 30, 0.85) 100%
  );
  backdrop-filter: blur(30rpx);
  -webkit-backdrop-filter: blur(30rpx);
  display: flex;
  align-items: center;
  padding: 0 20rpx;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 
    0 -2rpx 20rpx rgba(0, 0, 0, 0.15),
    0 -1rpx 2rpx rgba(255, 255, 255, 0.03) inset;
  z-index: 999;
  overflow: hidden;
}

.light-theme .bottom-nav {
  background: linear-gradient(
    to top,
    rgba(255, 255, 255, 0.98) 0%,
    rgba(255, 255, 255, 0.95) 50%,
    rgba(255, 255, 255, 0.90) 100%
  );
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 
    0 -2rpx 20rpx rgba(0, 0, 0, 0.08),
    0 -1rpx 2rpx rgba(255, 255, 255, 0.8) inset;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 8rpx;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.nav-item:active {
  transform: translateY(-2rpx) scale(0.96);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16rpx;
  box-shadow: 
    0 2rpx 8rpx rgba(0, 0, 0, 0.2) inset,
    0 0 20rpx rgba(255, 107, 53, 0.1);
}

.nav-item.active {
  transform: translateY(-2rpx);
}

.nav-item.active .nav-icon {
  transform: scale(1.1);
  filter: drop-shadow(0 2rpx 8rpx rgba(255, 107, 53, 0.3));
}

.nav-item.active .nav-text {
  color: #FF6B35;
  font-weight: 600;
  transform: translateY(-1rpx);
}

.nav-item:not(.active) {
  opacity: 0.7;
}

.nav-item:not(.active) .nav-text {
  color: inherit;
}

.nav-item:not(.active) .nav-icon {
  filter: grayscale(20%);
}

.nav-icon {
  width: 46rpx;
  height: 46rpx;
  margin-bottom: 6rpx;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon-img {
  width: 100%;
  height: 100%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-indicator {
  position: absolute;
  top: 8rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 6rpx;
  height: 6rpx;
  background: #FF6B35;
  border-radius: 50%;
  animation: pulse 2s infinite ease-in-out;
  box-shadow: 0 0 12rpx rgba(255, 107, 53, 0.6);
}

@keyframes pulse {
  0%, 100% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateX(-50%) scale(1.3);
    opacity: 0.8;
  }
}

.nav-text {
  font-size: 18rpx;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  line-height: 1.2;
}
</style>
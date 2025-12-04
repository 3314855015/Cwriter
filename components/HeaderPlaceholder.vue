<template>
  <view class="header-placeholder" :style="{ height: statusBarHeight + 'px' }">
    <!-- 完全空的内容，仅用于占位 -->
  </view>
</template>

<script>
export default {
  name: 'HeaderPlaceholder',
  data() {
    return {
      statusBarHeight: 0
    }
  },
  mounted() {
    this.getStatusBarHeight()
  },
  methods: {
    getStatusBarHeight() {
      // 获取状态栏高度
      try {
        const systemInfo = uni.getSystemInfoSync()
        this.statusBarHeight = systemInfo.statusBarHeight || 20
      } catch (error) {
        console.error('获取系统信息失败:', error)
        this.statusBarHeight = 20 // 默认值
      }
    }
  }
}
</script>

<style scoped>
.header-placeholder {
  width: 100%;
  background-color: transparent;
  /* 确保占位组件不会影响布局 */
  display: block;
  /* 防止内容溢出 */
  overflow: hidden;
}
</style>
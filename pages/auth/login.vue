<template>
  <view class="login-container">
    <!-- 登录表单区域 -->
    <view class="login-form">
      <!-- 应用标题 -->
      <view class="app-title">
        <text class="app-name">Cwriter</text>
        <text class="app-subtitle">创意写作助手</text>
      </view>

      <!-- 登录表单 -->
      <view class="form-group">
        <text class="form-label">用户名</text>
        <textarea 
          class="form-input title-textarea" 
          v-model="loginForm.username" 
          placeholder="请输入用户名"
          maxlength="20"
          auto-height
          :show-confirm-bar="false"
          :adjust-position="false"
        />
      </view>

      <view class="form-group">
        <text class="form-label">密码</text>
        <textarea 
          class="form-input title-textarea" 
          v-model="loginForm.password" 
          placeholder="请输入密码"
          maxlength="20"
          auto-height
          :show-confirm-bar="false"
          :adjust-position="false"
          password
        />
      </view>

      <!-- 错误提示 -->
      <view class="error-message" v-if="errorMessage">
        {{ errorMessage }}
      </view>

      <!-- 登录按钮 -->
      <button class="login-btn" @tap="handleLogin" :disabled="!isFormValid || isLoading">
        {{ isLoading ? '登录中...' : '登录' }}
      </button>

      <!-- 注册链接 -->
      <view class="register-link">
        <text class="register-text">还没有账号？</text>
        <text class="register-btn" @tap="goToRegister">立即注册</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { OfflineAuthService } from '@/utils/offlineAuth.js'

// 响应式数据
const loginForm = ref({
  username: '',
  password: ''
})

const errorMessage = ref('')
const isLoading = ref(false)

// 计算属性：表单验证
const isFormValid = computed(() => {
  return loginForm.value.username.trim().length > 0 && 
         loginForm.value.password.length > 0
})

// 处理登录
const handleLogin = async () => {
  if (!isFormValid.value) {
    errorMessage.value = '请输入用户名和密码'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    // 调用离线认证服务
    const result = await OfflineAuthService.signIn(
      loginForm.value.username.trim(),
      loginForm.value.password
    )

    // 登录成功，跳转到首页
    uni.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 1500
    })

    setTimeout(() => {
      uni.switchTab({
        url: '/pages/index/index'
      })
    }, 1500)

  } catch (error) {
    console.error('登录失败:', error)
    errorMessage.value = error.message || '登录失败，请检查用户名和密码'
    
    uni.showToast({
      title: '登录失败',
      icon: 'error',
      duration: 2000
    })
  } finally {
    isLoading.value = false
  }
}

// 跳转到注册页面
const goToRegister = () => {
  uni.navigateTo({
    url: '/pages/auth/register'
  })
}
</script>

<style scoped>
.login-container {
  background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-form {
  background: rgba(45, 45, 45, 0.9);
  border-radius: 16px;
  padding: 40px 30px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.app-title {
  text-align: center;
  margin-bottom: 40px;
}

.app-name {
  display: block;
  font-size: 32px;
  font-weight: bold;
  color: #FF6B35;
  margin-bottom: 8px;
}

.app-subtitle {
  display: block;
  font-size: 14px;
  color: #B3B3B3;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  color: #B3B3B3;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-input {
  width: 100%;
  background: #404040;
  border: 1px solid #555555;
  border-radius: 8px;
  padding: 12px 16px;
  color: #FFFFFF;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #FF6B35;
  outline: none;
}

.title-textarea {
  min-height: 44px;
  max-height: 44px;
  resize: none;
  line-height: 1.4;
}

.title-textarea {
  min-height: 44px;
  max-height: 44px;
  resize: none;
  line-height: 1.4;
}

.title-textarea {
  min-height: 44px;
  max-height: 44px;
  resize: none;
  line-height: 1.4;
}

.error-message {
  background: rgba(255, 107, 53, 0.1);
  border: 1px solid rgba(255, 107, 53, 0.3);
  border-radius: 6px;
  padding: 12px;
  color: #FF6B35;
  font-size: 14px;
  margin-bottom: 16px;
  text-align: center;
}

.login-btn {
  width: 100%;
  background: #FF6B35;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  padding: 14px;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 24px;
  transition: all 0.2s ease;
}

.login-btn:active:not(:disabled) {
  background: #E55A2B;
  transform: translateY(1px);
}

.login-btn:disabled {
  background: #808080;
  cursor: not-allowed;
  opacity: 0.6;
}

.register-link {
  text-align: center;
}

.register-text {
  color: #B3B3B3;
  font-size: 14px;
  margin-right: 8px;
}

.register-btn {
  color: #FF6B35;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

/* 亮色主题样式 */
:global(.light-theme) .login-container {
  background: linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%);
}

:global(.light-theme) .login-form {
  background: rgba(255, 255, 255, 0.9);
}

:global(.light-theme) .app-name {
  color: #FF6B35;
}

:global(.light-theme) .app-subtitle {
  color: #666666;
}

:global(.light-theme) .form-label {
  color: #666666;
}

:global(.light-theme) .form-input {
  background: #F5F5F5;
  border-color: #E0E0E0;
  color: #333333;
}

:global(.light-theme) .register-text {
  color: #666666;
}
</style>
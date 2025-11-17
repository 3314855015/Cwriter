// 认证相关工具函数 - 离线版本
import { OfflineAuthService } from './offlineAuth'

// 检查用户认证状态
export async function checkAuthStatus() {
  try {
    return await OfflineAuthService.checkAuthStatus()
  } catch (error) {
    console.error('检查认证状态失败:', error)
    return { isAuthenticated: false, session: null }
  }
}

// 用户登录
export async function login(username, password) {
  try {
    const result = await OfflineAuthService.signIn(username, password)
    
    // 登录成功后更新全局状态
    if (getApp()) {
      getApp().globalData.isAuthenticated = true
      getApp().globalData.user = result.user
    }
    
    return result
  } catch (error) {
    console.error('登录失败:', error)
    throw error
  }
}

// 用户注册
export async function register(username, password, email = '') {
  try {
    const result = await OfflineAuthService.signUp(username, password, email)
    return result
  } catch (error) {
    console.error('注册失败:', error)
    throw error
  }
}

// 用户登出
export async function logout() {
  try {
    await OfflineAuthService.signOut()
    
    // 登出后更新全局状态
    if (getApp()) {
      getApp().globalData.isAuthenticated = false
      getApp().globalData.user = null
    }
    
    // 跳转到登录页面
    uni.redirectTo({
      url: '/pages/auth/login'
    })
  } catch (error) {
    console.error('登出失败:', error)
    throw error
  }
}

// 获取当前用户信息
export function getCurrentUser() {
  return getApp()?.globalData.user || null
}

// 检查是否已登录
export function isAuthenticated() {
  return getApp()?.globalData.isAuthenticated || false
}

// 保存用户偏好设置
export async function saveUserPreferences(preferences) {
  try {
    await uni.setStorage({
      key: 'user_preferences',
      data: preferences
    })
  } catch (error) {
    console.error('保存用户偏好设置失败:', error)
  }
}

// 获取用户偏好设置
export async function getUserPreferences() {
  try {
    const result = await uni.getStorage({
      key: 'user_preferences'
    })
    return result.data || {}
  } catch (error) {
    console.error('获取用户偏好设置失败:', error)
    return {}
  }
}
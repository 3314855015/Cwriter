// 主题管理工具
// 专门处理主题切换和相关数据存储

const THEME_STORAGE_KEY = 'cwriter_theme_config'

// 默认主题配置
const DEFAULT_THEME_CONFIG = {
  currentTheme: 'dark', // 'dark' | 'light'
  themeVersion: '1.0.0',
  lastUpdated: null,
  userPreferences: {
    autoSwitch: false, // 是否自动切换（根据系统时间）
    lightStartTime: '06:00', // 浅色主题开始时间
    darkStartTime: '18:00', // 深色主题开始时间
    followSystem: false // 是否跟随系统主题
  },
  customThemes: {}, // 预留给未来的自定义主题
  themeHistory: [] // 主题切换历史记录
}

/**
 * 主题管理器类
 */
export class ThemeManager {
  constructor() {
    this.config = null
    this.init()
  }

  /**
   * 初始化主题管理器
   */
  init() {
    try {
      const storedConfig = uni.getStorageSync(THEME_STORAGE_KEY)
      if (storedConfig) {
        // 合并默认配置和存储的配置，确保新增的字段存在
        this.config = {
          ...DEFAULT_THEME_CONFIG,
          ...storedConfig,
          userPreferences: {
            ...DEFAULT_THEME_CONFIG.userPreferences,
            ...(storedConfig.userPreferences || {})
          }
        }
      } else {
        this.config = { ...DEFAULT_THEME_CONFIG }
        this.saveConfig()
      }
    } catch (error) {
      console.error('主题管理器初始化失败:', error)
      this.config = { ...DEFAULT_THEME_CONFIG }
    }
  }

  /**
   * 保存主题配置
   */
  saveConfig() {
    try {
      this.config.lastUpdated = new Date().toISOString()
      uni.setStorageSync(THEME_STORAGE_KEY, this.config)
      return true
    } catch (error) {
      console.error('保存主题配置失败:', error)
      return false
    }
  }

  /**
   * 获取当前主题
   */
  getCurrentTheme() {
    return this.config.currentTheme
  }

  /**
   * 获取是否为暗色主题
   */
  isDarkMode() {
    return this.config.currentTheme === 'dark'
  }

  /**
   * 切换主题
   */
  toggleTheme() {
    const oldTheme = this.config.currentTheme
    this.config.currentTheme = this.config.currentTheme === 'dark' ? 'light' : 'dark'
    
    // 记录切换历史
    this.addToHistory(oldTheme, this.config.currentTheme)
    
    // 保存配置
    this.saveConfig()
    
    // 触发全局主题变更事件
    this.notifyThemeChange()
    
    return this.config.currentTheme
  }

  /**
   * 设置指定主题
   */
  setTheme(theme) {
    if (!['dark', 'light'].includes(theme)) {
      console.error('无效的主题类型:', theme)
      return false
    }

    const oldTheme = this.config.currentTheme
    this.config.currentTheme = theme
    
    // 记录切换历史
    this.addToHistory(oldTheme, theme)
    
    // 保存配置
    this.saveConfig()
    
    // 触发全局主题变更事件
    this.notifyThemeChange()
    
    return true
  }

  /**
   * 获取主题配置
   */
  getConfig() {
    return { ...this.config }
  }

  /**
   * 更新用户偏好设置
   */
  updateUserPreferences(preferences) {
    this.config.userPreferences = {
      ...this.config.userPreferences,
      ...preferences
    }
    this.saveConfig()
  }

  /**
   * 获取用户偏好设置
   */
  getUserPreferences() {
    return { ...this.config.userPreferences }
  }

  /**
   * 添加主题切换历史记录
   */
  addToHistory(fromTheme, toTheme) {
    const historyEntry = {
      id: Date.now().toString(),
      from: fromTheme,
      to: toTheme,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'uni-app-environment'
    }

    this.config.themeHistory.unshift(historyEntry)
    
    // 只保留最近50条记录
    if (this.config.themeHistory.length > 50) {
      this.config.themeHistory = this.config.themeHistory.slice(0, 50)
    }
  }

  /**
   * 获取主题切换历史
   */
  getThemeHistory(limit = 10) {
    return this.config.themeHistory.slice(0, limit)
  }

  /**
   * 通知全局主题变更
   */
  notifyThemeChange() {
    // 使用 uni-app 的全局事件总线
    try {
      uni.$emit('theme-changed', {
        theme: this.config.currentTheme,
        isDark: this.isDarkMode(),
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.warn('触发主题变更事件失败:', error)
    }

    // 同时使用 uni.setStorageSync 保持向后兼容
    uni.setStorageSync('theme', this.config.currentTheme)
  }

  /**
   * 检查是否应该自动切换主题
   */
  shouldAutoSwitch() {
    const { autoSwitch, lightStartTime, darkStartTime } = this.config.userPreferences
    
    if (!autoSwitch) {
      return false
    }

    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    return currentTime >= darkStartTime || currentTime < lightStartTime
  }

  /**
   * 应用自动切换
   */
  applyAutoSwitch() {
    if (!this.config.userPreferences.autoSwitch) {
      return false
    }

    const shouldSwitchToDark = this.shouldAutoSwitch()
    const targetTheme = shouldSwitchToDark ? 'dark' : 'light'
    
    if (this.config.currentTheme !== targetTheme) {
      this.setTheme(targetTheme)
      return true
    }
    
    return false
  }

  /**
   * 检查系统主题（如果支持）
   */
  getSystemTheme() {
    try {
      // uni-app 中获取系统信息
      const systemInfo = uni.getSystemInfoSync()
      // 注意：不同平台对系统主题的支持程度不同
      // 这里返回默认值，实际使用时需要根据具体平台调整
      return 'dark' // 可以根据系统信息判断
    } catch (error) {
      console.warn('获取系统主题失败:', error)
      return 'dark'
    }
  }

  /**
   * 跟随系统主题
   */
  followSystemTheme() {
    if (!this.config.userPreferences.followSystem) {
      return false
    }

    const systemTheme = this.getSystemTheme()
    return this.setTheme(systemTheme)
  }

  /**
   * 重置主题配置
   */
  resetToDefault() {
    this.config = { ...DEFAULT_THEME_CONFIG }
    this.saveConfig()
    this.notifyThemeChange()
  }

  /**
   * 导出主题配置
   */
  exportConfig() {
    return {
      ...this.config,
      exportedAt: new Date().toISOString()
    }
  }

  /**
   * 导入主题配置
   */
  importConfig(configData) {
    try {
      // 验证配置数据
      if (!configData || typeof configData !== 'object') {
        throw new Error('无效的配置数据')
      }

      // 合并配置，保留版本信息
      this.config = {
        ...DEFAULT_THEME_CONFIG,
        ...configData,
        userPreferences: {
          ...DEFAULT_THEME_CONFIG.userPreferences,
          ...(configData.userPreferences || {})
        }
      }

      this.saveConfig()
      this.notifyThemeChange()
      return true
    } catch (error) {
      console.error('导入主题配置失败:', error)
      return false
    }
  }

  /**
   * 获取主题统计信息
   */
  getThemeStats() {
    const history = this.config.themeHistory
    const darkCount = history.filter(h => h.to === 'dark').length
    const lightCount = history.filter(h => h.to === 'light').length
    
    return {
      currentTheme: this.config.currentTheme,
      totalSwitches: history.length,
      darkThemeUsage: darkCount,
      lightThemeUsage: lightCount,
      lastSwitch: history[0]?.timestamp || null,
      autoSwitchEnabled: this.config.userPreferences.autoSwitch,
      followSystemEnabled: this.config.userPreferences.followSystem
    }
  }
}

// 创建全局主题管理器实例
const themeManager = new ThemeManager()

// 导出主题管理器实例和工具函数
export default themeManager

// 导出便捷的工具函数
export const {
  getCurrentTheme,
  isDarkMode,
  toggleTheme,
  setTheme,
  updateUserPreferences,
  getUserPreferences,
  getThemeHistory,
  shouldAutoSwitch,
  applyAutoSwitch,
  followSystemTheme,
  resetToDefault,
  exportConfig,
  importConfig,
  getThemeStats
} = {
  getCurrentTheme: () => themeManager.getCurrentTheme(),
  isDarkMode: () => themeManager.isDarkMode(),
  toggleTheme: () => themeManager.toggleTheme(),
  setTheme: (theme) => themeManager.setTheme(theme),
  updateUserPreferences: (preferences) => themeManager.updateUserPreferences(preferences),
  getUserPreferences: () => themeManager.getUserPreferences(),
  getThemeHistory: (limit) => themeManager.getThemeHistory(limit),
  shouldAutoSwitch: () => themeManager.shouldAutoSwitch(),
  applyAutoSwitch: () => themeManager.applyAutoSwitch(),
  followSystemTheme: () => themeManager.followSystemTheme(),
  resetToDefault: () => themeManager.resetToDefault(),
  exportConfig: () => themeManager.exportConfig(),
  importConfig: (config) => themeManager.importConfig(config),
  getThemeStats: () => themeManager.getThemeStats()
}
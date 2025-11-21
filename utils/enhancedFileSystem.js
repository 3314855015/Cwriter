// 增强型文件系统管理工具
// 基于你最新的文件结构，提供更便捷的API

import { unifiedStorage } from './unifiedStorage.js'
import { WorkEditor } from './workEditor.js'

export class EnhancedFileSystem {
  constructor() {
    this.storage = unifiedStorage
    this.editor = null
    this.cache = new Map()
    this.autoSaveEnabled = true
    this.autoSaveInterval = 30000 // 30秒自动保存
    this.autoSaveTimer = null
  }

  // === 初始化方法 ===

  // 初始化文件系统
  async init() {
    try {
      await this.storage.init()
      console.log('✅ 增强文件系统初始化完成')
      this.startAutoSave()
      return this
    } catch (error) {
      console.error('❌ 增强文件系统初始化失败:', error)
      throw error
    }
  }

  // 启动自动保存
  startAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
    }
    
    if (this.autoSaveEnabled) {
      this.autoSaveTimer = setInterval(async () => {
        if (this.editor && this.editor.currentWork) {
          try {
            await this.saveCurrentWork()
            console.log('💾 自动保存完成')
          } catch (error) {
            console.warn('⚠️ 自动保存失败:', error)
          }
        }
      }, this.autoSaveInterval)
    }
  }

  // 停止自动保存
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }

  // === 用户管理方法 ===

  // 获取当前用户ID
  getCurrentUserId() {
    return 'default_user' // 默认使用本地用户
  }

  // 获取用户信息
  async getUserInfo(userId = this.getCurrentUserId()) {
    const cacheKey = `user_${userId}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const userPath = `${this.storage.basePath}/users/${userId}`
      const configPath = `${userPath}/user.config.json`
      
      const config = await this.storage.readFile(configPath)
      this.cache.set(cacheKey, config)
      
      return config
    } catch (error) {
      console.error('❌ 获取用户信息失败:', error)
      return null
    }
  }

  // === 作品管理方法 ===

  // 创建作品编辑器实例
  async createEditor(workId = null, userId = this.getCurrentUserId()) {
    if (!this.editor) {
      this.editor = new WorkEditor(this.storage)
    }

    try {
      await this.editor.init(workId, userId)
      console.log('📝 作品编辑器初始化完成')
      return this.editor
    } catch (error) {
      console.error('❌ 创建编辑器失败:', error)
      throw error
    }
  }

  // 创建新作品
  async createWork(workData, userId = this.getCurrentUserId()) {
    try {
      const workConfig = await this.storage.createWork(userId, {
        title: workData.title || '新作品',
        description: workData.description || '',
        structure_type: workData.structure_type || 'chapterized'
      })

      // 创建初始内容
      const initialContent = {
        manuscript: {
          title: workConfig.title,
          text: workData.initialContent || '',
          word_count: 0
        },
        chapters: [],
        characters: [],
        settings: [],
        foreshadowing: []
      }

      await this.storage.saveWorkContent(userId, workConfig.id, initialContent)
      
      console.log('✅ 作品创建成功:', workConfig.id)
      return workConfig
    } catch (error) {
      console.error('❌ 创建作品失败:', error)
      throw error
    }
  }

  // 保存作品内容
  async saveWork(workId, content, userId = this.getCurrentUserId()) {
    try {
      await this.storage.saveWorkContent(userId, workId, content)
      
      // 更新缓存
      const cacheKey = `work_${workId}`
      const cachedWork = this.cache.get(cacheKey)
      if (cachedWork) {
        cachedWork.content = { ...cachedWork.content, ...content }
        this.cache.set(cacheKey, cachedWork)
      }
      
      console.log('✅ 作品内容保存成功:', workId)
      return true
    } catch (error) {
      console.error('❌ 保存作品失败:', error)
      throw error
    }
  }

  // 保存当前作品
  async saveCurrentWork() {
    if (!this.editor || !this.editor.currentWork) {
      console.warn('⚠️ 没有当前作品可保存')
      return false
    }

    try {
      const userId = this.getCurrentUserId()
      const workId = this.editor.currentWork.config.id
      
      await this.editor.save(userId)
      
      // 更新缓存
      const cacheKey = `work_${workId}`
      this.cache.set(cacheKey, this.editor.currentWork)
      
      return true
    } catch (error) {
      console.error('❌ 保存作品失败:', error)
      return false
    }
  }

  // 快速保存内容
  async quickSave(workId, content, userId = this.getCurrentUserId()) {
    try {
      await this.storage.saveWorkContent(userId, workId, content)
      
      // 更新缓存
      const cacheKey = `work_${workId}`
      const cachedWork = this.cache.get(cacheKey)
      if (cachedWork) {
        this.mergeDeep(cachedWork.content, content)
        cachedWork.config.updated_at = new Date().toISOString()
      }
      
      console.log('💾 快速保存成功')
      return true
    } catch (error) {
      console.error('❌ 快速保存失败:', error)
      return false
    }
  }

  // 加载作品
  async loadWork(workId, userId = this.getCurrentUserId()) {
    const cacheKey = `work_${workId}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const work = await this.storage.getWork(userId, workId)
      this.cache.set(cacheKey, work)
      
      return work
    } catch (error) {
      console.error('❌ 加载作品失败:', error)
      throw error
    }
  }

  // 获取作品列表
  async getWorks(userId = this.getCurrentUserId()) {
    try {
      const works = await this.storage.getUserWorks(userId)
      
      // 缓存每个作品的基本信息
      works.forEach(work => {
        const cacheKey = `work_${work.id}`
        if (!this.cache.has(cacheKey)) {
          this.cache.set(cacheKey, { config: work })
        }
      })
      
      return works
    } catch (error) {
      console.error('❌ 获取作品列表失败:', error)
      return []
    }
  }

  // === 文件操作便捷方法 ===

  // 保存章节内容
  async saveChapter(workId, chapterData, userId = this.getCurrentUserId()) {
    try {
      const work = await this.loadWork(workId, userId)
      
      if (!work.content.chapters) {
        work.content.chapters = []
      }
      
      const chapterIndex = work.content.chapters.findIndex(ch => ch.id === chapterData.id)
      if (chapterIndex >= 0) {
        work.content.chapters[chapterIndex] = {
          ...work.content.chapters[chapterIndex],
          ...chapterData,
          updated_at: new Date().toISOString()
        }
      } else {
        work.content.chapters.push({
          id: chapterData.id || `chapter_${Date.now()}`,
          title: chapterData.title || '新章节',
          content: chapterData.content || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
      
      await this.quickSave(workId, { chapters: work.content.chapters }, userId)
      
      return work.content.chapters
    } catch (error) {
      console.error('❌ 保存章节失败:', error)
      throw error
    }
  }

  // 保存人物设定
  async saveCharacter(workId, characterData, userId = this.getCurrentUserId()) {
    try {
      const work = await this.loadWork(workId, userId)
      
      if (!work.content.characters) {
        work.content.characters = []
      }
      
      const characterIndex = work.content.characters.findIndex(ch => ch.id === characterData.id)
      if (characterIndex >= 0) {
        work.content.characters[characterIndex] = {
          ...work.content.characters[characterIndex],
          ...characterData,
          updated_at: new Date().toISOString()
        }
      } else {
        work.content.characters.push({
          id: characterData.id || `character_${Date.now()}`,
          name: characterData.name || '新人物',
          description: characterData.description || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
      
      await this.quickSave(workId, { characters: work.content.characters }, userId)
      
      return work.content.characters
    } catch (error) {
      console.error('❌ 保存人物失败:', error)
      throw error
    }
  }

  // === 统计和监控方法 ===

  // 获取作品统计信息
  async getWorkStats(workId, userId = this.getCurrentUserId()) {
    try {
      const work = await this.loadWork(workId, userId)
      
      const manuscriptText = work.content.manuscript?.text || ''
      
      return {
        wordCount: manuscriptText.replace(/\s/g, '').length,
        chapterCount: work.content.chapters?.length || 0,
        characterCount: work.content.characters?.length || 0,
        settingCount: work.content.settings?.length || 0,
        lastModified: work.config.updated_at,
        created: work.config.created_at
      }
    } catch (error) {
      console.error('❌ 获取作品统计失败:', error)
      return null
    }
  }

  // 获取用户存储统计
  async getUserStats(userId = this.getCurrentUserId()) {
    try {
      const works = await this.getWorks(userId)
      
      let totalWords = 0
      let totalCharacters = 0
      
      for (const work of works) {
        const stats = await this.getWorkStats(work.id, userId)
        if (stats) {
          totalWords += stats.wordCount
          totalCharacters += stats.characterCount
        }
      }
      
      return {
        totalWorks: works.length,
        totalWords,
        totalCharacters,
        lastActive: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ 获取用户统计失败:', error)
      return null
    }
  }

  // === 工具方法 ===

  // 深度合并对象
  mergeDeep(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {}
        this.mergeDeep(target[key], source[key])
      } else {
        target[key] = source[key]
      }
    }
  }

  // 清除缓存
  clearCache(pattern = null) {
    if (pattern) {
      for (const [key] of this.cache.entries()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
    
    console.log('🧹 缓存已清理')
  }

  // 保存设置信息
  async saveSetting(key, value, userId = this.getCurrentUserId()) {
    try {
      const userPath = `${this.storage.basePath}/users/${userId}`
      const settingsPath = `${userPath}/settings.json`
      
      let settings = {}
      try {
        const settingsContent = await this.storage.readFile(settingsPath)
        if (typeof settingsContent === 'string' && settingsContent.trim() === '') {
          settings = {}
        } else {
          settings = JSON.parse(settingsContent)
        }
      } catch (error) {
        // 文件不存在或解析失败时创建空对象
        settings = {}
      }
      
      settings[key] = value
      await this.storage.writeFile(settingsPath, JSON.stringify(settings, null, 2))
      
      // 更新缓存
      const cacheKey = `settings_${userId}`
      this.cache.set(cacheKey, settings)
      
      return true
    } catch (error) {
      console.error('❌ 保存设置失败:', error)
      return false
    }
  }

  // 保存伏笔信息
  async saveForeshadowing(workId, foreshadowingData, userId = this.getCurrentUserId()) {
    try {
      const work = await this.loadWork(workId, userId)
      
      if (!work.content.foreshadowing) {
        work.content.foreshadowing = []
      }
      
      const foreshadowingIndex = work.content.foreshadowing.findIndex(f => f.id === foreshadowingData.id)
      if (foreshadowingIndex >= 0) {
        work.content.foreshadowing[foreshadowingIndex] = {
          ...work.content.foreshadowing[foreshadowingIndex],
          ...foreshadowingData,
          updated_at: new Date().toISOString()
        }
      } else {
        work.content.foreshadowing.push({
          id: foreshadowingData.id || `foreshadowing_${Date.now()}`,
          title: foreshadowingData.title || '新伏笔',
          description: foreshadowingData.description || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
      
      await this.quickSave(workId, { foreshadowing: work.content.foreshadowing }, userId)
      
      return work.content.foreshadowing
    } catch (error) {
      console.error('❌ 保存伏笔失败:', error)
      throw error
    }
  }

  // 获取调试信息
  async getDebugInfo() {
    try {
      const storageInfo = await this.storage.debugInfo()
      
      return {
        storage: storageInfo,
        cacheSize: this.cache.size,
        autoSaveEnabled: this.autoSaveEnabled,
        editorActive: !!this.editor,
        currentWork: this.editor?.currentWork?.config?.id || null
      }
    } catch (error) {
      return {
        error: error.message,
        cacheSize: this.cache.size
      }
    }
  }

  // === 清理方法 ===

  // 清理资源
  destroy() {
    this.stopAutoSave()
    
    if (this.editor) {
      this.editor.destroy()
      this.editor = null
    }
    
    this.clearCache()
    console.log('🧹 增强文件系统已清理')
  }
}

// 创建单例实例
const enhancedFileSystem = new EnhancedFileSystem()

// 导出
export { enhancedFileSystem }
export default enhancedFileSystem
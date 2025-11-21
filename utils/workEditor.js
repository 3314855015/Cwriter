// 作品编辑器 - 统一的保存和读取管理

export class WorkEditor {
  constructor(storage) {
    this.storage = storage
    this.currentWork = null
    this.autoSaveInterval = null
  }

  // 初始化编辑器
  async init(workId, userId = 'default_user') {
    try {
      await this.storage.init()
      
      if (workId) {
        // 加载现有作品
        this.currentWork = await this.storage.getWork(userId, workId)
        console.log('📖 作品加载成功:', workId)
      } else {
        // 创建新作品
        this.currentWork = {
          config: {
            id: `work_${Date.now()}`,
            title: '新作品',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'draft'
          },
          content: {
            manuscript: {
              text: '',
              title: '新作品'
            },
            chapters: [],
            characters: [],
            settings: [],
            foreshadowing: []
          }
        }
        
        // 保存到存储
        await this.storage.createWork(userId, this.currentWork.config)
        await this.storage.saveWorkContent(userId, this.currentWork.config.id, this.currentWork.content)
        
        console.log('📝 新作品创建成功:', this.currentWork.config.id)
      }
      
      // 启动自动保存
      this.startAutoSave(userId)
      
      return this.currentWork
    } catch (error) {
      console.error('❌ 编辑器初始化失败:', error)
      throw error
    }
  }

  // 保存作品
  async save(userId) {
    if (!this.currentWork) {
      console.warn('⚠️ 没有当前作品可保存')
      return
    }

    try {
      // 更新修改时间
      this.currentWork.config.updated_at = new Date().toISOString()
      
      // 保存到存储
      await this.storage.saveWorkContent(userId, this.currentWork.config.id, this.currentWork.content)
      
      console.log('💾 作品保存成功:', this.currentWork.config.id)
      return true
    } catch (error) {
      console.error('❌ 作品保存失败:', error)
      return false
    }
  }

  // 自动保存
  startAutoSave(userId) {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
    }
    
    this.autoSaveInterval = setInterval(() => {
      if (this.currentWork && this.hasUnsavedChanges()) {
        this.save(userId).catch(error => {
          console.warn('⚠️ 自动保存失败:', error)
        })
      }
    }, 30000) // 30秒自动保存一次
  }

  // 检查是否有未保存的更改
  hasUnsavedChanges() {
    // 这里可以添加更复杂的更改检测逻辑
    return true // 简化实现
  }

  // 更新作品内容
  updateContent(contentUpdates) {
    if (!this.currentWork) {
      console.warn('⚠️ 没有当前作品可更新')
      return
    }

    // 深度合并内容
    this.mergeDeep(this.currentWork.content, contentUpdates)
    
    console.log('✏️ 作品内容已更新')
  }

  // 更新章节内容
  updateChapter(chapterId, chapterContent) {
    if (!this.currentWork) return
    
    const chapterIndex = this.currentWork.content.chapters.findIndex(ch => ch.id === chapterId)
    if (chapterIndex >= 0) {
      this.currentWork.content.chapters[chapterIndex] = {
        ...this.currentWork.content.chapters[chapterIndex],
        ...chapterContent,
        updated_at: new Date().toISOString()
      }
    } else {
      this.currentWork.content.chapters.push({
        id: chapterId,
        title: chapterContent.title || '新章节',
        content: chapterContent.content || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }
  }

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

  // 获取作品统计信息
  getStats() {
    if (!this.currentWork) return null
    
    const content = this.currentWork.content.manuscript.text || ''
    const chapters = this.currentWork.content.chapters || []
    
    return {
      wordCount: content.replace(/\s/g, '').length,
      chapterCount: chapters.length,
      characterCount: (this.currentWork.content.characters || []).length,
      settingCount: (this.currentWork.content.settings || []).length,
      lastModified: this.currentWork.config.updated_at
    }
  }

  // 导出作品
  exportWork(format = 'json') {
    if (!this.currentWork) return null
    
    switch (format) {
      case 'json':
        return JSON.stringify(this.currentWork, null, 2)
      case 'text':
        return this.currentWork.content.manuscript.text || ''
      case 'markdown':
        return this.convertToMarkdown()
      default:
        return this.currentWork
    }
  }

  // 转换为Markdown格式
  convertToMarkdown() {
    if (!this.currentWork) return ''
    
    let markdown = `# ${this.currentWork.config.title}\n\n`
    
    // 添加章节
    if (this.currentWork.content.chapters && this.currentWork.content.chapters.length > 0) {
      this.currentWork.content.chapters.forEach(chapter => {
        markdown += `## ${chapter.title}\n\n`
        markdown += `${chapter.content || ''}\n\n`
      })
    }
    
    return markdown
  }

  // 清理资源
  destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }
    
    this.currentWork = null
    console.log('🧹 编辑器已清理')
  }
}
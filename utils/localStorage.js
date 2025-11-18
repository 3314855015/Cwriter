// 本地存储管理工具
// 基于需求文档的本地文件结构设计

const USER_STORAGE_KEY = 'cwriter_local_storage'

// 初始化本地存储结构
export function initLocalStorage() {
  const storage = uni.getStorageSync(USER_STORAGE_KEY)
  if (!storage) {
    const defaultStructure = {
      users: {},
      backups: {},
      logs: {}
    }
    uni.setStorageSync(USER_STORAGE_KEY, defaultStructure)
  }
}

// 用户相关存储操作
export class UserStorage {
  // 获取用户存储路径
  static getUserPath(userId) {
    return `users/${userId}`
  }

  // 获取作品存储路径
  static getWorkPath(userId, workId) {
    return `${this.getUserPath(userId)}/works/${workId}`
  }

  // 初始化用户存储空间
  static initUserStorage(userId) {
    const storage = uni.getStorageSync(USER_STORAGE_KEY)
    if (!storage.users[userId]) {
      storage.users[userId] = {
        works: {},
        preferences: {
          theme: 'dark',
          autoSaveInterval: 30,
          lastLogin: new Date().toISOString()
        }
      }
      uni.setStorageSync(USER_STORAGE_KEY, storage)
    }
    return storage.users[userId]
  }

  // 获取用户作品列表
  static getUserWorks(userId) {
    const storage = uni.getStorageSync(USER_STORAGE_KEY)
    const user = storage.users[userId]
    if (!user || !user.works) return []
    
    return Object.values(user.works).sort((a, b) => 
      new Date(b.updated_at) - new Date(a.updated_at)
    )
  }

  // 创建新作品
  static createWork(userId, workData) {
    const storage = uni.getStorageSync(USER_STORAGE_KEY)
    
    if (!storage.users[userId]) {
      this.initUserStorage(userId)
    }
    
    const workId = Date.now().toString()
    const now = new Date().toISOString()
    
    const newWork = {
      id: workId,
      title: workData.title || '未命名作品',
      description: workData.description || '',
      category: workData.category || 'novel',
      structure_type: workData.structure_type || 'single',
      is_active: true,
      created_at: now,
      updated_at: now,
      local_file_path: this.getWorkPath(userId, workId),
      
      // 作品内容结构
      content: {
        manuscript: {
          title: workData.title || '未命名作品',
          content: workData.initialContent || '',
          word_count: 0,
          last_modified: now
        },
        chapters: [],
        glossary: [],
        map_data: []
      }
    }
    
    storage.users[userId].works[workId] = newWork
    
    // 创建作品文件
    this.createWorkFiles(userId, workId, newWork.content)
    
    uni.setStorageSync(USER_STORAGE_KEY, storage)
    
    // 记录操作日志
    this.logOperation(userId, 'create_work', { workId, workTitle: newWork.title })
    
    return newWork
  }

  // 创建作品相关文件
  static createWorkFiles(userId, workId, content) {
    try {
      // 在 uni-app 中，我们不能直接创建嵌套路径，所以使用不同的键名
      const manuscriptKey = `work_${workId}_manuscript`
      const chaptersKey = `work_${workId}_chapters`
      const glossaryKey = `work_${workId}_glossary`
      const mapDataKey = `work_${workId}_map_data`
      
      // 存储作品内容
      uni.setStorageSync(manuscriptKey, content.manuscript)
      
      // 存储章节信息（如果存在）
      if (content.chapters && content.chapters.length > 0) {
        uni.setStorageSync(chaptersKey, content.chapters)
      }
      
      // 存储专有名词
      uni.setStorageSync(glossaryKey, content.glossary)
      
      // 存储地图数据
      uni.setStorageSync(mapDataKey, content.map_data)
      
      return true
    } catch (error) {
      console.error('创建作品文件失败:', error)
      return false
    }
  }

  // 更新作品信息
  static updateWork(userId, workId, updates) {
    const storage = uni.getStorageSync(USER_STORAGE_KEY)
    
    if (!storage.users[userId] || !storage.users[userId].works[workId]) {
      throw new Error('作品不存在')
    }
    
    const work = storage.users[userId].works[workId]
    storage.users[userId].works[workId] = {
      ...work,
      ...updates,
      updated_at: new Date().toISOString()
    }
    
    uni.setStorageSync(USER_STORAGE_KEY, storage)
    
    // 记录操作日志
    this.logOperation(userId, 'update_work', { workId, updates })
    
    return storage.users[userId].works[workId]
  }

  // 删除作品
  static deleteWork(userId, workId) {
    const storage = uni.getStorageSync(USER_STORAGE_KEY)
    
    if (!storage.users[userId] || !storage.users[userId].works[workId]) {
      throw new Error('作品不存在')
    }
    
    // 删除作品文件 - 使用独立的键名而不是嵌套路径
    const manuscriptKey = `work_${workId}_manuscript`
    const chaptersKey = `work_${workId}_chapters`
    const glossaryKey = `work_${workId}_glossary`
    const mapDataKey = `work_${workId}_map_data`
    
    uni.removeStorageSync(manuscriptKey)
    uni.removeStorageSync(chaptersKey)
    uni.removeStorageSync(glossaryKey)
    uni.removeStorageSync(mapDataKey)
    
    // 删除作品记录
    delete storage.users[userId].works[workId]
    
    uni.setStorageSync(USER_STORAGE_KEY, storage)
    
    // 记录操作日志
    this.logOperation(userId, 'delete_work', { workId })
    
    return true
  }

  // 获取作品详情
  static getWorkDetail(userId, workId) {
    const storage = uni.getStorageSync(USER_STORAGE_KEY)
    
    if (!storage.users[userId] || !storage.users[userId].works[workId]) {
      throw new Error('作品不存在')
    }
    
    const work = storage.users[userId].works[workId]
    
    // 加载作品内容文件
    try {
      const manuscriptKey = `work_${workId}_manuscript`
      const chaptersKey = `work_${workId}_chapters`
      const glossaryKey = `work_${workId}_glossary`
      const mapDataKey = `work_${workId}_map_data`
      
      work.content = {
        manuscript: uni.getStorageSync(manuscriptKey) || {},
        chapters: uni.getStorageSync(chaptersKey) || [],
        glossary: uni.getStorageSync(glossaryKey) || [],
        map_data: uni.getStorageSync(mapDataKey) || []
      }
    } catch (error) {
      console.error('加载作品内容失败:', error)
      work.content = {}
    }
    
    return work
  }

  // 保存作品内容
  static saveWorkContent(userId, workId, contentUpdates) {
    const manuscriptKey = `work_${workId}_manuscript`
    const chaptersKey = `work_${workId}_chapters`
    const glossaryKey = `work_${workId}_glossary`
    const mapDataKey = `work_${workId}_map_data`
    
    if (contentUpdates.manuscript) {
      const currentManuscript = uni.getStorageSync(manuscriptKey) || {}
      uni.setStorageSync(manuscriptKey, {
        ...currentManuscript,
        ...contentUpdates.manuscript,
        last_modified: new Date().toISOString()
      })
    }
    
    if (contentUpdates.chapters) {
      uni.setStorageSync(chaptersKey, contentUpdates.chapters)
    }
    
    if (contentUpdates.glossary) {
      uni.setStorageSync(glossaryKey, contentUpdates.glossary)
    }
    
    if (contentUpdates.map_data) {
      uni.setStorageSync(mapDataKey, contentUpdates.map_data)
    }
    
    // 更新作品元数据
    this.updateWork(userId, workId, {
      updated_at: new Date().toISOString()
    })
    
    return true
  }

  // 添加专有名词
  static addGlossaryItem(userId, workId, itemData) {
    const workPath = this.getWorkPath(userId, workId)
    const glossary = uni.getStorageSync(`${workPath}/glossary.json`) || []
    
    const newItem = {
      id: Date.now().toString(),
      work_id: workId,
      user_id: userId,
      category: itemData.category || 'character',
      name: itemData.name,
      description: itemData.description || '',
      color_code: itemData.color_code || '#FF6B35',
      is_active: true,
      created_at: new Date().toISOString()
    }
    
    glossary.push(newItem)
    uni.setStorageSync(`${workPath}/glossary.json`, glossary)
    
    // 记录操作日志
    this.logOperation(userId, 'add_glossary', { workId, itemName: newItem.name })
    
    return newItem
  }

  // 记录操作日志
  static logOperation(userId, operation, data = {}) {
    try {
      const storage = uni.getStorageSync(USER_STORAGE_KEY)
      
      if (!storage.logs) {
        storage.logs = {}
      }
      
      if (!storage.logs[userId]) {
        storage.logs[userId] = []
      }
      
      // 在 uni-app 环境中，navigator 可能不存在，使用安全的方式获取 userAgent
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'uni-app-environment'
      
      const logEntry = {
        id: Date.now().toString(),
        user_id: userId,
        operation,
        data,
        timestamp: new Date().toISOString(),
        user_agent: userAgent
      }
      
      storage.logs[userId].push(logEntry)
      
      // 只保留最近1000条日志
      if (storage.logs[userId].length > 1000) {
        storage.logs[userId] = storage.logs[userId].slice(-1000)
      }
      
      uni.setStorageSync(USER_STORAGE_KEY, storage)
      
      // 调试信息
      console.log(`操作日志记录成功: ${operation}`, {
        userId,
        operation,
        data
      })
      
    } catch (error) {
      console.error('记录操作日志失败:', error)
      // 日志记录失败不应该影响主流程，继续执行
    }
  }

  // 备份数据
  static createBackup(userId) {
    const storage = uni.getStorageSync(USER_STORAGE_KEY)
    const userData = storage.users[userId]
    
    if (!userData) return null
    
    const backupId = Date.now().toString()
    const backup = {
      id: backupId,
      user_id: userId,
      data: JSON.parse(JSON.stringify(userData)), // 深拷贝
      created_at: new Date().toISOString(),
      size: JSON.stringify(userData).length
    }
    
    storage.backups[backupId] = backup
    uni.setStorageSync(USER_STORAGE_KEY, storage)
    
    return backup
  }

  // 获取存储统计信息
  static getStorageStats(userId) {
    const storage = uni.getStorageSync(USER_STORAGE_KEY)
    const user = storage.users[userId]
    
    if (!user) {
      return {
        totalWorks: 0,
        totalWords: 0,
        totalCharacters: 0,
        totalMaps: 0,
        storageUsed: 0
      }
    }
    
    let totalWords = 0
    let totalCharacters = 0
    let totalMaps = 0
    
    Object.values(user.works).forEach(work => {
      try {
        const manuscriptKey = `work_${work.id}_manuscript`
        const manuscript = uni.getStorageSync(manuscriptKey)
        if (manuscript && manuscript.content) {
          totalWords += manuscript.content.split(/\s+/).length
          totalCharacters += manuscript.content.length
        }
        
        const mapDataKey = `work_${work.id}_map_data`
        const mapData = uni.getStorageSync(mapDataKey)
        if (mapData && mapData.length > 0) {
          totalMaps += mapData.length
        }
      } catch (error) {
        console.error('计算存储统计失败:', error)
      }
    })
    
    return {
      totalWorks: Object.keys(user.works).length,
      totalWords,
      totalCharacters,
      totalMaps,
      storageUsed: JSON.stringify(storage).length
    }
  }
}

// 初始化存储
initLocalStorage()

export default UserStorage
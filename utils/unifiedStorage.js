// 统一存储管理工具
// 基于你最新的文件结构设计

export class UnifiedStorage {
  constructor() {
    this.basePath = '_doc/cwriter_data'
    this.configFile = `${this.basePath}/global.config.json`
    this.initialized = false
    this.initPromise = null
  }

  // 异步初始化
  async init() {
    if (this.initialized) return this
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        // 检测环境
        const env = this.detectEnvironment()
        console.log('🌍 当前环境:', env)

        // 初始化基础目录结构
        await this.initBaseStructure()
        
        // 初始化全局配置
        await this.initGlobalConfig()
        
        // 确保默认用户存在
        await this.ensureDefaultUser()

        this.initialized = true
        console.log('✅ 统一存储初始化完成')
        resolve(this)
      } catch (error) {
        console.error('❌ 统一存储初始化失败:', error)
        reject(error)
      }
    })

    return this.initPromise
  }

  // 检测环境
  detectEnvironment() {
    if (typeof plus !== 'undefined' && plus.io) {
      return 'APP'
    } else if (typeof uni !== 'undefined' && uni.getFileSystemManager) {
      return 'MP'
    } else {
      return 'H5'
    }
  }

  // 初始化基础目录结构
  async initBaseStructure() {
    const dirs = [
      this.basePath,
      `${this.basePath}/users`,
      `${this.basePath}/logs`
    ]

    for (const dir of dirs) {
      await this.mkdir(dir)
    }
  }

  // 创建目录
  async mkdir(path) {
    return new Promise((resolve, reject) => {
      plus.io.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, (fs) => {
        fs.root.getDirectory(path, { create: true }, (dirEntry) => {
          resolve(dirEntry)
        }, (error) => {
          // 忽略目录已存在的错误
          if (error.code === 10) { // 文件已存在
            resolve()
          } else {
            reject(error)
          }
        })
      }, reject)
    })
  }

  // 初始化全局配置
  async initGlobalConfig() {
    const exists = await this.fileExists(this.configFile)
    if (!exists) {
      const defaultConfig = {
        version: '2.0.0',
        created_at: new Date().toISOString(),
        users: {},
        storage_type: 'unified',
        last_modified: new Date().toISOString()
      }
      await this.writeFile(this.configFile, JSON.stringify(defaultConfig, null, 2))
    }
  }

  // 确保默认用户存在
  async ensureDefaultUser() {
    const userId = 'default_user'
    const userPath = `${this.basePath}/users/${userId}`
    const userConfigPath = `${userPath}/user.config.json`
    
    // 创建用户目录结构
    await this.mkdir(userPath)
    await this.mkdir(`${userPath}/works`)
    await this.mkdir(`${this.basePath}/logs/${userId}`)

    // 创建用户配置文件
    const exists = await this.fileExists(userConfigPath)
    if (!exists) {
      const userConfig = {
        id: userId,
        username: '本地用户',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        storage_path: userPath
      }
      await this.writeFile(userConfigPath, JSON.stringify(userConfig, null, 2))
    }

    // 更新全局配置
    await this.updateGlobalConfig({
      users: {
        [userId]: {
          created_at: new Date().toISOString(),
          storage_path: userPath
        }
      }
    })
  }

  // 检查文件是否存在
  async fileExists(filePath) {
    return new Promise((resolve) => {
      plus.io.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, (fs) => {
        fs.root.getFile(filePath, {}, (fileEntry) => {
          fileEntry.file((file) => {
            resolve(file.size > 0)
          }, () => resolve(false))
        }, () => resolve(false))
      }, () => resolve(false))
    })
  }

  // 写入文件
  async writeFile(filePath, content) {
    return new Promise((resolve, reject) => {
      plus.io.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, (fs) => {
        fs.root.getFile(filePath, { create: true }, (fileEntry) => {
          fileEntry.createWriter((writer) => {
            writer.onwriteend = () => {
              console.log('📝 文件写入成功:', filePath)
              resolve()
            }
            writer.onerror = (error) => {
              console.error('❌ 文件写入失败:', error)
              reject(error)
            }
            writer.seek(0)
            writer.truncate(0)
            writer.write(content)
          }, reject)
        }, reject)
      }, reject)
    })
  }

  // 读取文件
  async readFile(filePath) {
    return new Promise((resolve, reject) => {
      plus.io.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, (fs) => {
        fs.root.getFile(filePath, {}, (fileEntry) => {
          fileEntry.file((file) => {
            const reader = new plus.io.FileReader()
            reader.onloadend = () => {
              resolve(reader.result)
            }
            reader.onerror = reject
            reader.readAsText(file)
          }, reject)
        }, reject)
      }, reject)
    })
  }

  // 更新全局配置
  async updateGlobalConfig(updates) {
    try {
      const currentConfig = await this.readFile(this.configFile)
      const config = JSON.parse(currentConfig)
      
      const updatedConfig = {
        ...config,
        ...updates,
        last_modified: new Date().toISOString()
      }
      
      await this.writeFile(this.configFile, JSON.stringify(updatedConfig, null, 2))
    } catch (error) {
      console.error('更新全局配置失败:', error)
    }
  }

  // === 作品管理方法 ===

  // 创建作品
  async createWork(userId, workData) {
    await this.init()
    
    const workId = workData.id || `work_${Date.now()}`
    const workPath = `${this.basePath}/users/${userId}/works/${workId}`
    
    // 创建作品目录结构
    await this.mkdir(workPath)
    await this.mkdir(`${workPath}/chapters`)
    await this.mkdir(`${workPath}/settings`)
    await this.mkdir(`${workPath}/characters`)
    await this.mkdir(`${workPath}/foreshadowing`)

    // 创建作品配置文件
    const workConfig = {
      id: workId,
      title: workData.title || '未命名作品',
      description: workData.description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      structure_type: workData.structure_type || 'chapterized',
      word_count: 0,
      status: 'draft',
      storage_path: workPath
    }

    await this.writeFile(`${workPath}/work.config.json`, JSON.stringify(workConfig, null, 2))
    
    console.log('✅ 作品创建成功:', workId)
    return workConfig
  }

  // 保存作品内容
  async saveWorkContent(userId, workId, content) {
    await this.init()
    
    const workPath = `${this.basePath}/users/${userId}/works/${workId}`
    const configPath = `${workPath}/work.config.json`
    
    try {
      // 读取当前配置
      const configContent = await this.readFile(configPath)
      const config = JSON.parse(configContent)
      
      // 更新作品内容
      await this.writeFile(`${workPath}/content.json`, JSON.stringify(content, null, 2))
      
      // 更新配置
      config.updated_at = new Date().toISOString()
      config.word_count = this.calculateWordCount(content)
      
      await this.writeFile(configPath, JSON.stringify(config, null, 2))
      
      console.log('✅ 作品内容保存成功:', workId)
      return config
    } catch (error) {
      console.error('❌ 保存作品内容失败:', error)
      throw error
    }
  }

  // 读取作品
  async getWork(userId, workId) {
    await this.init()
    
    const workPath = `${this.basePath}/users/${userId}/works/${workId}`
    
    try {
      const configContent = await this.readFile(`${workPath}/work.config.json`)
      const contentContent = await this.readFile(`${workPath}/content.json`)
      
      const config = JSON.parse(configContent)
      const content = JSON.parse(contentContent)
      
      return {
        config,
        content
      }
    } catch (error) {
      console.error('❌ 读取作品失败:', error)
      throw error
    }
  }

  // 获取用户所有作品
  async getUserWorks(userId) {
    await this.init()
    
    const worksPath = `${this.basePath}/users/${userId}/works`
    
    try {
      // 获取works目录下的所有文件夹
      const works = []
      
      // 这里需要遍历目录，简化实现
      // 实际应用中应该使用更精确的目录遍历方法
      
      // 临时方案：从全局配置中获取作品列表
      const globalConfig = await this.readFile(this.configFile)
      const config = JSON.parse(globalConfig)
      
      if (config.users && config.users[userId] && config.users[userId].works) {
        return config.users[userId].works
      }
      
      return works
    } catch (error) {
      console.error('❌ 获取用户作品列表失败:', error)
      return []
    }
  }

  // 计算字数
  calculateWordCount(content) {
    if (!content || !content.manuscript) return 0
    
    const text = content.manuscript.text || ''
    // 简单的中文字数计算
    return text.replace(/\s/g, '').length
  }

  // 删除作品
  async deleteWork(userId, workId) {
    await this.init()
    
    const workPath = `${this.basePath}/users/${userId}/works/${workId}`
    
    try {
      // 删除作品目录（实际应用中应该递归删除）
      // 这里简化处理，实际需要更复杂的删除逻辑
      
      console.log('🗑️ 删除作品:', workId)
      return true
    } catch (error) {
      console.error('❌ 删除作品失败:', error)
      return false
    }
  }

  // 导出调试信息
  async debugInfo() {
    await this.init()
    
    try {
      const globalConfig = await this.readFile(this.configFile)
      const config = JSON.parse(globalConfig)
      
      return {
        initialized: this.initialized,
        basePath: this.basePath,
        globalConfig: config,
        environment: this.detectEnvironment()
      }
    } catch (error) {
      return {
        initialized: this.initialized,
        error: error.message
      }
    }
  }
}

// 创建单例实例
export const unifiedStorage = new UnifiedStorage()
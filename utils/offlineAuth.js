// 离线认证工具函数
// 提供本地认证功能，不依赖网络

// 模拟本地用户存储
const LOCAL_STORAGE_KEY = 'cwriter_local_users'
const CURRENT_USER_KEY = 'cwriter_current_user'

// 初始化本地用户存储
export function initLocalStorage() {
  if (!uni.getStorageSync(LOCAL_STORAGE_KEY)) {
    uni.setStorageSync(LOCAL_STORAGE_KEY, [])
  }
}

// 用户认证相关方法
export class OfflineAuthService {
  // 用户登录
  static async signIn(username, password) {
    try {
      const users = uni.getStorageSync(LOCAL_STORAGE_KEY) || []
      const user = users.find(u => u.username === username && u.password === password)
      
      if (user) {
        // 登录成功，保存当前用户
        uni.setStorageSync(CURRENT_USER_KEY, {
          id: user.id,
          username: user.username,
          email: user.email
        })
        return { user: { id: user.id, username: user.username, email: user.email } }
      } else {
        throw new Error('用户名或密码错误')
      }
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    }
  }

  // 用户注册
  static async signUp(username, password, email = '') {
    try {
      initLocalStorage()
      const users = uni.getStorageSync(LOCAL_STORAGE_KEY)
      
      // 检查用户名是否已存在
      if (users.find(u => u.username === username)) {
        throw new Error('用户名已存在')
      }
      
      const newUser = {
        id: Date.now().toString(),
        username,
        password,
        email,
        created_at: new Date().toISOString()
      }
      
      users.push(newUser)
      uni.setStorageSync(LOCAL_STORAGE_KEY, users)
      
      return { user: { id: newUser.id, username: newUser.username, email: newUser.email } }
    } catch (error) {
      console.error('注册失败:', error)
      throw error
    }
  }

  // 用户登出
  static async signOut() {
    try {
      uni.removeStorageSync(CURRENT_USER_KEY)
    } catch (error) {
      console.error('登出失败:', error)
      throw error
    }
  }

  // 获取当前用户
  static getCurrentUser() {
    try {
      const user = uni.getStorageSync(CURRENT_USER_KEY)
      return { data: { user } }
    } catch (error) {
      console.error('获取用户失败:', error)
      return { data: { user: null } }
    }
  }

// 检查登录状态
static async checkAuthStatus() {
  try {
    const user = uni.getStorageSync(CURRENT_USER_KEY)
    
    // 如果没有用户，创建默认用户（离线模式）
    if (!user) {
      const defaultUser = {
        id: 'default_user',
        username: '离线用户',
        email: '',
        created_at: new Date().toISOString()
      }
      
      // 保存默认用户到本地存储
      uni.setStorageSync(CURRENT_USER_KEY, defaultUser)
      
      // 添加到用户列表
      let users = uni.getStorageSync(LOCAL_STORAGE_KEY) || []
      if (!users.find(u => u.id === 'default_user')) {
        users.push({
          ...defaultUser,
          password: '' // 空密码
        })
        uni.setStorageSync(LOCAL_STORAGE_KEY, users)
      }
      
      return { 
        isAuthenticated: true, 
        session: { user: defaultUser } 
      }
    }
    
    return { 
      isAuthenticated: !!user, 
      session: user ? { user } : null 
    }
  } catch (error) {
    console.error('检查认证状态失败:', error)
    
    // 出错时返回默认用户
    const defaultUser = {
      id: 'default_user',
      username: '离线用户',
      email: '',
      created_at: new Date().toISOString()
    }
    
    return { 
      isAuthenticated: true, 
      session: { user: defaultUser } 
    }
  }
}
}

// 数据操作相关方法 - 本地存储版本
export class OfflineDataService {
  // 获取用户作品列表
  static async getUserWorks(userId) {
    try {
      const works = uni.getStorageSync(`works_${userId}`) || []
      return works
    } catch (error) {
      console.error('获取作品列表失败:', error)
      return []
    }
  }

  // 创建新作品
  static async createWork(workData) {
    try {
      const userId = uni.getStorageSync(CURRENT_USER_KEY)?.id
      if (!userId) throw new Error('用户未登录')
      
      const works = uni.getStorageSync(`works_${userId}`) || []
      const newWork = {
        ...workData,
        id: Date.now().toString(),
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      works.push(newWork)
      uni.setStorageSync(`works_${userId}`, works)
      
      return newWork
    } catch (error) {
      console.error('创建作品失败:', error)
      throw error
    }
  }

  // 更新作品信息
  static async updateWork(workId, updates) {
    try {
      const userId = uni.getStorageSync(CURRENT_USER_KEY)?.id
      if (!userId) throw new Error('用户未登录')
      
      const works = uni.getStorageSync(`works_${userId}`) || []
      const workIndex = works.findIndex(w => w.id === workId)
      
      if (workIndex === -1) throw new Error('作品不存在')
      
      works[workIndex] = {
        ...works[workIndex],
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      uni.setStorageSync(`works_${userId}`, works)
      return works[workIndex]
    } catch (error) {
      console.error('更新作品失败:', error)
      throw error
    }
  }

  // 删除作品
  static async deleteWork(workId) {
    try {
      const userId = uni.getStorageSync(CURRENT_USER_KEY)?.id
      if (!userId) throw new Error('用户未登录')
      
      const works = uni.getStorageSync(`works_${userId}`) || []
      const filteredWorks = works.filter(w => w.id !== workId)
      
      uni.setStorageSync(`works_${userId}`, filteredWorks)
      return true
    } catch (error) {
      console.error('删除作品失败:', error)
      throw error
    }
  }

  // 获取专有名词列表
  static async getGlossaryItems(workId) {
    try {
      const glossary = uni.getStorageSync(`glossary_${workId}`) || []
      return glossary
    } catch (error) {
      console.error('获取专有名词列表失败:', error)
      return []
    }
  }

  // 添加专有名词
  static async addGlossaryItem(workId, itemData) {
    try {
      const glossary = uni.getStorageSync(`glossary_${workId}`) || []
      const newItem = {
        ...itemData,
        id: Date.now().toString(),
        work_id: workId,
        created_at: new Date().toISOString()
      }
      
      glossary.push(newItem)
      uni.setStorageSync(`glossary_${workId}`, glossary)
      
      return newItem
    } catch (error) {
      console.error('添加专有名词失败:', error)
      throw error
    }
  }

  // 获取地图模块数据
  static async getMapModules(workId) {
    try {
      const modules = uni.getStorageSync(`map_modules_${workId}`) || []
      return modules
    } catch (error) {
      console.error('获取地图模块失败:', error)
      return []
    }
  }

  // 记录AI使用日志
  static async logAIUsage(logData) {
    try {
      const logs = uni.getStorageSync('ai_usage_logs') || []
      const newLog = {
        ...logData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        status: 'completed'
      }
      
      logs.push(newLog)
      uni.setStorageSync('ai_usage_logs', logs)
      
      return newLog
    } catch (error) {
      console.error('记录AI使用日志失败:', error)
      // 不抛出错误，避免影响主流程
      return null
    }
  }
}
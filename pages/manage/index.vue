<template>
  <view class="page-container" :class="{ 'light-theme': !isDarkMode }">
    <!-- 状态栏 -->
    <view class="status-bar">
      <text class="status-time">{{ currentTime }}</text>
      <view class="status-icons">
        <image class="status-icon" src="/static/icons/signal.svg" mode="aspectFit"></image>
        <image class="status-icon" src="/static/icons/wifi.svg" mode="aspectFit"></image>
        <image class="status-icon" src="/static/icons/battery.svg" mode="aspectFit"></image>
      </view>
    </view>

    <!-- 页面标题 -->
    <view class="page-header">
      <view class="header-content">
        <view class="header-text">
          <text class="page-title">文件管理</text>
          <text class="page-subtitle">管理您的创作内容</text>
        </view>
        <view class="header-actions">
          <view class="more-menu-container">
            <view class="more-btn" @tap="toggleMoreMenu">
              <text class="more-dots">···</text>
            </view>
            <!-- 点击遮罩关闭菜单 -->
            <view 
              v-if="showMoreMenu" 
              class="menu-overlay" 
              @tap="closeMoreMenu"
              @touchmove.prevent
            ></view>
            <view v-if="showMoreMenu" class="more-menu">
              <view class="menu-item" @tap="showImport">
                <text class="menu-text">导入</text>
              </view>
              <view class="menu-item" @tap="showExport">
                <text class="menu-text">导出</text>
              </view>
              <view class="menu-item" @tap="loadLocalWorks">
                <text class="menu-text">加载</text>
              </view>
              <view class="menu-item" @tap="deleteSelected">
                <text class="menu-text">删除</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 文件管理内容 -->
    <view class="manage-content">

    <!-- 作品列表 -->
    <view class="works-section">
      <view class="section-header">
        <text class="section-title">{{ currentWork ? currentWork.title : '作品列表' }}</text>
        <text class="work-count" v-if="!currentWork">共 {{ works.length }} 部作品</text>
      </view>
      
      <!-- 作品列表 -->
      <view v-if="!currentWork" class="works-list">
        <view 
          v-for="work in works" 
          :key="work.id" 
          class="work-item"
          :class="{ selected: selectedWorks.includes(work.id) }"
          @tap="selectWork(work)"
          @longpress="toggleWorkSelection(work.id)"
        >
          <view class="work-checkbox" v-if="isSelectionMode">
            <view class="checkbox" :class="{ checked: selectedWorks.includes(work.id) }"></view>
          </view>
          
          <view class="work-info">
            <text class="work-title">{{ work.title }}</text>
            <text class="work-meta">{{ work.chapterCount }} 章节 · {{ work.wordCount }} 字</text>
          </view>
          
          <view class="delete-btn" @tap.stop="deleteWork(work)">
            <text class="delete-x">×</text>
          </view>
        </view>
      </view>
      
      <!-- 管理单元格 -->
      <view v-else class="management-content">
        <!-- 章节管理 -->
        <view v-if="currentManagementType === 'chapters'" class="management-section">
          <view class="management-header">
            <text class="management-title">章节管理</text>
            <text class="management-subtitle">管理作品章节结构</text>
          </view>
          <view class="management-body">
            <view v-if="chapters.length === 0" class="empty-state">
              <text class="empty-text">暂无章节</text>
              <text class="empty-hint">点击下方按钮创建第一个章节</text>
            </view>
            <view v-else class="chapters-list">
              <view 
                v-for="(chapter, index) in chapters" 
                :key="chapter.id"
                class="chapter-item"
                @tap="editChapter(chapter)"
              >
                <view class="chapter-info">
                  <text class="chapter-title">{{ chapter.title || `第${index + 1}章` }}</text>
                  <text class="chapter-word-count">{{ chapter.word_count || 0 }}字</text>
                </view>
                <view class="chapter-actions">
                  <text class="action-btn delete" @tap.stop="deleteChapter(chapter.id)">删除</text>
                </view>
              </view>
            </view>
            <view class="add-btn" @tap="addChapter">
              <text class="add-text">+ 添加章节</text>
            </view>
          </view>
        </view>

        <!-- 人物管理 -->
        <view v-else-if="currentManagementType === 'characters'" class="management-section">
          <view class="management-header">
            <text class="management-title">人物管理</text>
            <text class="management-subtitle">管理作品人物设定</text>
          </view>
          <view class="management-body">
            <view v-if="characters.length === 0" class="empty-state">
              <text class="empty-text">暂无人物</text>
              <text class="empty-hint">点击下方按钮创建第一个人物</text>
            </view>
            <view v-else class="characters-grid">
              <view 
                v-for="character in characters" 
                :key="character.id"
                class="character-card"
                @tap="editCharacter(character)"
              >
                <view class="character-avatar">
                  <text class="avatar-text">{{ character.name ? character.name[0] : '?' }}</text>
                </view>
                <view class="character-info">
                  <text class="character-name">{{ character.name || '未命名' }}</text>
                  <text class="character-role">{{ character.role || character.description || '无角色' }}</text>
                </view>
                <view class="character-actions">
                  <text class="action-btn delete" @tap.stop="deleteCharacter(character.id)">删除</text>
                </view>
              </view>
            </view>
            <view class="add-btn" @tap="addCharacter">
              <text class="add-text">+ 添加人物</text>
            </view>
          </view>
        </view>

        <!-- 术语管理 -->
        <view v-else-if="currentManagementType === 'terms'" class="management-section">
          <view class="management-header">
            <text class="management-title">术语管理</text>
            <text class="management-subtitle">管理作品术语设定</text>
          </view>
          <view class="management-body">
            <view v-if="terms.length === 0" class="empty-state">
              <text class="empty-text">暂无术语</text>
              <text class="empty-hint">点击下方按钮添加第一个术语</text>
            </view>
            <view v-else class="terms-list">
              <view 
                v-for="term in terms" 
                :key="term.id"
                class="term-item"
                @tap="editTerm(term)"
              >
                <view class="term-info">
                  <text class="term-name">{{ term.name || '未命名' }}</text>
                  <text class="term-definition">{{ term.description || term.definition || '暂无定义' }}</text>
                </view>
                <view class="term-actions">
                  <text class="action-btn delete" @tap.stop="deleteTerm(term.id)">删除</text>
                </view>
              </view>
            </view>
            <view class="add-btn" @tap="addTerm">
              <text class="add-text">+ 添加术语</text>
            </view>
          </view>
        </view>

        <!-- 地图管理 -->
        <view v-else-if="currentManagementType === 'maps'" class="management-section">
          <view class="management-header">
            <text class="management-title">地图管理</text>
            <text class="management-subtitle">管理作品地图数据</text>
          </view>
          <view class="management-body">
            <view v-if="maps.length === 0" class="empty-state">
              <text class="empty-text">暂无地图</text>
              <text class="empty-hint">点击下方按钮创建第一个地图</text>
            </view>
            <view v-else class="maps-list">
              <view 
                v-for="map in maps" 
                :key="map.id"
                class="map-item"
                @tap="editMap(map)"
              >
                <view class="map-info">
                  <text class="map-name">{{ map.name || '未命名' }}</text>
                  <text class="map-desc">{{ map.description || '暂无描述' }}</text>
                  <text class="map-meta">{{ formatTime(map.updated_at) }} · {{ map.nodes?.length || 0 }}个节点</text>
                </view>
                <view class="map-actions">
                  <text class="action-btn edit" @tap.stop="editMapDirectly(map)">编辑</text>
                  <text class="action-btn delete" @tap.stop="deleteMap(map.id)">删除</text>
                </view>
              </view>
            </view>
            <view class="add-btn" @tap="addMap">
              <text class="add-text">+ 创建地图</text>
            </view>
          </view>
        </view>

        <!-- 默认管理选项 -->
        <view v-else class="management-options">
          <view class="management-cell" @tap="startManagement('chapters')">
            <text class="cell-text">章节管理</text>
          </view>
          <view class="management-cell" @tap="startManagement('characters')">
            <text class="cell-text">人物管理</text>
          </view>
          <view class="management-cell" @tap="startManagement('drafts')">
            <text class="cell-text">草稿管理</text>
          </view>
          <view class="management-cell" @tap="startManagement('terms')">
            <text class="cell-text">术语管理</text>
          </view>
          <view class="management-cell" @tap="startManagement('maps')">
            <text class="cell-text">地图管理</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 悬浮返回按钮 -->
    <view v-if="currentWork" class="floating-back-btn" @tap="backToList">
      <text class="back-icon">←</text>
      <text class="back-label">返回</text>
    </view>
    </view>

    <!-- 批量操作栏 -->
    <view class="batch-toolbar" v-if="isSelectionMode && selectedWorks.length > 0">
      <text class="selected-count">已选择 {{ selectedWorks.length }} 个作品</text>
      <view class="batch-actions">
        <view class="batch-btn" @tap="deleteSelected">
          <image src="/static/icons/trash.svg" mode="aspectFit"></image>
          <text>删除</text>
        </view>
        <view class="batch-btn" @tap="exportSelected">
          <image src="/static/icons/file.svg" mode="aspectFit"></image>
          <text>导出</text>
        </view>
      </view>
    </view>
  
    <!-- 底部导航栏 -->
    <BottomNav 
      :active-nav="'manage'"
      :is-dark-mode="isDarkMode"
      @switch-nav="handleNavSwitch"
      @toggle-theme="toggleTheme"
    />

    <!-- 创建作品弹窗 -->
    <CreateWorkModal 
      v-if="currentUser && currentUser.id"
      :visible="showCreateWorkModal" 
      @update:visible="showCreateWorkModal = $event"
      @created="handleWorkCreated"
      :userId="currentUser.id"
    />


  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import CreateWorkModal from '@/components/CreateWorkModal.vue'
import BottomNav from '@/components/BottomNav.vue'
import FileSystemStorage from '@/utils/fileSystemStorage.js'
import { OfflineAuthService } from '@/utils/offlineAuth.js'
import themeManager, { isDarkMode as getIsDarkMode } from '@/utils/themeManager.js'

const fileStorage = FileSystemStorage

// 响应式数据
const currentTime = ref('')
const isDarkMode = ref(getIsDarkMode())
const currentUser = ref(null)
const showCreateWorkModal = ref(false)

const works = ref([])
const selectedWorks = ref([])
const isSelectionMode = ref(false)
const currentWork = ref(null)
const showMoreMenu = ref(false)

// 管理相关数据
const currentManagementType = ref('')
const chapters = ref([])
const characters = ref([])
const terms = ref([])
const maps = ref([])

// 页面初始化
onMounted(async () => {
  // 初始化主题
  isDarkMode.value = themeManager.isDarkMode()
  
  updateTime()
  setInterval(updateTime, 1000)
  
  // 监听主题变更事件
  try {
    if (typeof uni !== 'undefined' && uni.$on) {
      uni.$on('theme-changed', (themeData) => {
        try {
          isDarkMode.value = themeData.isDark
        } catch (error) {
          console.warn('主题变更处理失败:', error);
        }
      })
    }
  } catch (error) {
    console.warn('主题监听器设置失败:', error);
  }
  
  // 获取当前用户
  try {
    currentUser.value = await OfflineAuthService.getCurrentUser()
    
    if (currentUser.value && currentUser.value.id) {
      await loadWorks()
    } else {
      console.warn('未找到有效用户信息，创建默认用户')
      // 创建默认用户
      currentUser.value = {
        id: 'default_user',
        username: '离线用户',
        email: ''
      }
      // 初始化默认用户存储
      await fileStorage.initUserStorage(currentUser.value.id)
      await loadWorks()
    }
  } catch (error) {
    console.error('Failed to load user data:', error)
    // 失败时创建默认用户
    currentUser.value = {
      id: 'default_user',
      username: '离线用户', 
      email: ''
    }
    try {
      await fileStorage.initUserStorage(currentUser.value.id)
      await loadWorks()
    } catch (initError) {
      console.error('初始化默认用户存储失败:', initError)
    }
  }
})

// 更新时间
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// 加载作品列表
const loadWorks = async () => {
  try {
    if (!currentUser.value || !currentUser.value.id) {
      console.warn('用户信息无效，跳过作品加载')
      works.value = []
      return
    }

    // 从文件系统获取作品列表
    const userWorks = await fileStorage.getUserWorks(currentUser.value.id)
    
    console.log('📚 管理页面加载到的作品数据:', userWorks)
    
    // 使用 Promise.all 来并行处理所有作品的字数计算
    const worksPromises = userWorks.map(async (work) => {
      // 计算字数：尝试从文档文件获取，如果没有则从标题和描述估算
      let wordCount = 0
      try {
        // 尝试读取文档内容来计算字数
        const manuscriptPath = `${work.local_file_path}/settings/manuscript.json`
        const manuscript = await fileStorage.readFile(manuscriptPath)
        if (manuscript && manuscript.word_count) {
          wordCount = manuscript.word_count
        } else if (manuscript && manuscript.content) {
          wordCount = manuscript.content.replace(/\s/g, '').length
        } else {
          // 估算字数：标题 + 描述
          wordCount = (work.title?.length || 0) + (work.description?.length || 0)
        }
      } catch (error) {
        // 如果读取失败，使用估算字数
        wordCount = (work.title?.length || 0) + (work.description?.length || 0)
      }
      
      return {
        id: work.id,
        title: work.title || '未命名作品',
        modifiedTime: new Date(work.updated_at || work.created_at).toLocaleDateString(),
        chapterCount: work.chapter_count || 0,
        wordCount: wordCount,
        structure_type: work.structure_type,
        file_structure: work.file_structure,
        local_file_path: work.local_file_path,
        folderName: work.folderName
      }
    })
    
    // 等待所有作品数据处理完成
    works.value = await Promise.all(worksPromises)
    
    console.log('✅ 管理页面作品列表加载完成，共', works.value.length, '个作品')
    
  } catch (error) {
    console.error('❌ 管理页面加载作品列表失败:', error)
    console.error('错误详情:', error.stack)
    works.value = []
  }
}

// 导航功能
const handleNavSwitch = () => {
  // 管理页面不处理，由 BottomNav 组件内部处理
}

const toggleTheme = () => {
  themeManager.toggleTheme()
  isDarkMode.value = themeManager.isDarkMode()
}

// 工具栏操作
const showImport = () => {
  uni.showToast({
    title: '导入功能开发中',
    icon: 'none'
  })
}

const showExport = () => {
  uni.showToast({
    title: '导出功能开发中',
    icon: 'none'
  })
}

const loadLocalWorks = async () => {
  try {
    if (!currentUser.value || !currentUser.value.id) {
      uni.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    // 获取用户的所有作品
    const userWorks = await fileStorage.getUserWorks(currentUser.value.id)
    if (userWorks && userWorks.length > 0) {
      // 更新作品列表
      works.value = userWorks.map(work => ({
        id: work.id,
        title: work.title,
        modifiedTime: new Date(work.updated_at).toLocaleDateString(),
        chapterCount: work.chapter_count || 0,
        wordCount: work.word_count || 0
      }))
      
      uni.showToast({
        title: `加载了 ${userWorks.length} 个作品`,
        icon: 'success'
      })
    } else {
      uni.showToast({
        title: '未找到作品',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('Failed to load user works:', error)
    uni.showToast({
      title: '加载作品失败',
      icon: 'error'
    })
  }
}

// 作品操作
const openWorkDetail = (work) => {
  if (isSelectionMode.value) {
    toggleWorkSelection(work.id)
  } else {
    // 选择作品进入管理模式
    selectWork(work)
  }
}



const deleteWork = async (work) => {
  try {
    uni.showModal({
      title: '确认删除',
      content: `确定要删除作品"${work.title}"吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          // 传递userId和workId两个参数
          await fileStorage.deleteWork(currentUser.value?.id || 'default_user', work.id)
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })
          await loadWorks()
        }
      }
    })
  } catch (error) {
    console.error('Failed to delete work:', error)
    uni.showToast({
      title: '删除失败',
      icon: 'error'
    })
  }
}

const toggleWorkSelection = (workId) => {
  const index = selectedWorks.value.indexOf(workId)
  if (index > -1) {
    selectedWorks.value.splice(index, 1)
  } else {
    selectedWorks.value.push(workId)
  }
  
  if (selectedWorks.value.length === 0) {
    isSelectionMode.value = false
  }
}

const deleteSelected = async () => {
  if (selectedWorks.value.length === 0) return
  
  try {
    uni.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedWorks.value.length} 个作品吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          for (const workId of selectedWorks.value) {
            await fileStorage.deleteWork(currentUser.value?.id || 'default_user', workId)
          }
          
          uni.showToast({
            title: `删除成功`,
            icon: 'success'
          })
          
          selectedWorks.value = []
          isSelectionMode.value = false
          await loadWorks()
        }
      }
    })
  } catch (error) {
    console.error('Failed to delete selected works:', error)
    uni.showToast({
      title: '删除失败',
      icon: 'error'
    })
  }
}



const exportSelected = () => {
  uni.showToast({
    title: '导出功能开发中',
    icon: 'none'
  })
}

const handleWorkCreated = () => {
  uni.showToast({
    title: '作品创建成功',
    icon: 'success'
  })
  loadWorks()
}

// 选择作品
const selectWork = (work) => {
  if (isSelectionMode.value) {
    toggleWorkSelection(work.id)
  } else {
    currentWork.value = work
  }
}

// 返回列表
const backToList = () => {
  currentWork.value = null
  currentManagementType.value = ''
  chapters.value = []
  characters.value = []
  terms.value = []
  maps.value = []
}

// 开始管理
const startManagement = async (type) => {
  currentManagementType.value = type
  await loadManagementData(type)
}

// 加载管理数据
const loadManagementData = async (type) => {
  if (!currentUser.value || !currentWork.value) return
  
  try {
    switch (type) {
      case 'chapters':
        await loadChapters()
        break
      case 'characters':
        await loadCharacters()
        break
      case 'terms':
        await loadTerms()
        break
      case 'maps':
        await loadMaps()
        break
    }
  } catch (error) {
    console.error(`加载${type}数据失败:`, error)
    uni.showToast({
      title: '加载失败',
      icon: 'error'
    })
  }
}

// 加载章节数据
const loadChapters = async () => {
  try {
    const result = await fileStorage.getChapters(currentUser.value.id, currentWork.value.id)
    chapters.value = Array.isArray(result) ? result : []
    console.log('章节数据:', chapters.value)
  } catch (error) {
    console.error('加载章节数据失败:', error)
    chapters.value = []
  }
}

// 加载人物数据
const loadCharacters = async () => {
  try {
    const result = await fileStorage.getCharacters(currentUser.value.id, currentWork.value.id)
    characters.value = Array.isArray(result) ? result : []
    console.log('人物数据:', characters.value)
  } catch (error) {
    console.error('加载人物数据失败:', error)
    characters.value = []
  }
}

// 加载术语数据
const loadTerms = async () => {
  try {
    const result = await fileStorage.getTerms(currentUser.value.id, currentWork.value.id)
    terms.value = Array.isArray(result) ? result : []
    console.log('术语数据:', terms.value)
  } catch (error) {
    console.error('加载术语数据失败:', error)
    terms.value = []
  }
}

// 加载地图数据
const loadMaps = async () => {
  try {
    const mapsData = await fileStorage.getMapList(currentUser.value.id, currentWork.value.id)
    maps.value = (mapsData && Array.isArray(mapsData.maps)) ? mapsData.maps : []
    console.log('地图数据:', maps.value)
  } catch (error) {
    console.error('加载地图数据失败:', error)
    maps.value = []
  }
}

// 章节操作
const addChapter = () => {
  uni.navigateTo({
    url: `/pages/editor/chapter?workId=${currentWork.value.id}&mode=create`
  })
}

const editChapter = (chapter) => {
  uni.navigateTo({
    url: `/pages/editor/chapter?workId=${currentWork.value.id}&chapterId=${chapter.id}&mode=edit`
  })
}

const deleteChapter = (chapterId) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个章节吗？此操作不可恢复。',
    success: async (res) => {
      if (res.confirm) {
        try {
          await fileStorage.deleteChapter(currentUser.value.id, currentWork.value.id, chapterId)
          await loadChapters()
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })
        } catch (error) {
          console.error('删除章节失败:', error)
          uni.showToast({
            title: '删除失败',
            icon: 'error'
          })
        }
      }
    }
  })
}

// 人物操作
const addCharacter = () => {
  uni.navigateTo({
    url: `/pages/create?type=character&workId=${currentWork.value.id}`
  })
}

const editCharacter = (character) => {
  uni.navigateTo({
    url: `/pages/create?type=character&workId=${currentWork.value.id}&characterId=${character.id}`
  })
}

const deleteCharacter = (characterId) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个人物吗？此操作不可恢复。',
    success: async (res) => {
      if (res.confirm) {
        try {
          await fileStorage.deleteCharacter(currentUser.value.id, currentWork.value.id, characterId)
          await loadCharacters()
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })
        } catch (error) {
          console.error('删除人物失败:', error)
          uni.showToast({
            title: '删除失败',
            icon: 'error'
          })
        }
      }
    }
  })
}

// 术语操作
const addTerm = () => {
  uni.navigateTo({
    url: `/pages/create?type=term&workId=${currentWork.value.id}`
  })
}

const editTerm = (term) => {
  uni.navigateTo({
    url: `/pages/create?type=term&workId=${currentWork.value.id}&termId=${term.id}`
  })
}

const deleteTerm = (termId) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个术语吗？此操作不可恢复。',
    success: async (res) => {
      if (res.confirm) {
        try {
          await fileStorage.deleteTerm(currentUser.value.id, currentWork.value.id, termId)
          await loadTerms()
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })
        } catch (error) {
          console.error('删除术语失败:', error)
          uni.showToast({
            title: '删除失败',
            icon: 'error'
          })
        }
      }
    }
  })
}

// 地图操作
const addMap = () => {
  uni.navigateTo({
    url: `/pages/create?type=map&workId=${currentWork.value.id}`
  })
}

const editMap = (map) => {
  // 这里可以扩展为查看地图详情
  console.log('查看地图:', map)
}

const editMapDirectly = (map) => {
  uni.navigateTo({
    url: `/pages/create?type=map&workId=${currentWork.value.id}&mapId=${map.id}`
  })
}

const deleteMap = (mapId) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个地图吗？此操作不可恢复。',
    success: async (res) => {
      if (res.confirm) {
        try {
          await fileStorage.deleteMap(currentUser.value.id, currentWork.value.id, mapId)
          await loadMaps()
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })
        } catch (error) {
          console.error('删除地图失败:', error)
          uni.showToast({
            title: '删除失败',
            icon: 'error'
          })
        }
      }
    }
  })
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '未知时间'
  
  try {
    const now = new Date()
    const time = new Date(timestamp)
    
    if (isNaN(time.getTime())) {
      return '未知时间'
    }
    
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000)
    
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    if (diff < 604800) return `${Math.floor(diff / 86400)}天前`
    
    return time.toLocaleDateString()
  } catch (error) {
    return '未知时间'
  }
}

// 处理管理选项点击（保留原有功能）
const handleManagement = (type) => {
  if (type === 'drafts') {
    uni.showToast({
      title: '草稿管理功能开发中',
      icon: 'none'
    })
  } else {
    startManagement(type)
  }
}

// 切换更多菜单
const toggleMoreMenu = () => {
  showMoreMenu.value = !showMoreMenu.value
}

// 关闭菜单
const closeMoreMenu = () => {
  showMoreMenu.value = false
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  color: #ffffff;
  padding-bottom: 120rpx;
}

.page-container.light-theme {
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  color: #333333;
}

/* 管理内容 */
.manage-content {
  padding: 0 30rpx;
  padding-bottom: 140rpx; /* 为悬浮返回按钮留出空间 */
}

/* 管理区域 */
.management-section {
  min-height: 60vh;
}

.management-header {
  text-align: center;
  margin-bottom: 40rpx;
}

.management-title {
  font-size: 48rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 16rpx;
  background: linear-gradient(135deg, #ffffff, #f0f0f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.light-theme .management-title {
  background: linear-gradient(135deg, #333333, #666666);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.management-subtitle {
  font-size: 28rpx;
  opacity: 0.7;
  display: block;
}

.management-body {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24rpx;
  padding: 30rpx;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10rpx);
}

.light-theme .management-body {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

/* 管理选项页面 */
.management-options {
  padding: 30rpx 0;
}

/* 悬浮返回按钮 */
.floating-back-btn {
  position: fixed;
  bottom: 140rpx; /* 底部导航栏高度 + 间隔 */
  right: 30rpx;
  background: linear-gradient(135deg, #007AFF, #5AC8FA);
  border-radius: 50rpx;
  padding: 20rpx 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.3);
  backdrop-filter: blur(10rpx);
  display: flex;
  align-items: center;
  gap: 10rpx;
  z-index: 999;
  transition: all 0.3s ease;
}

.floating-back-btn:active {
  transform: scale(0.95);
  box-shadow: 0 4rpx 12rpx rgba(0, 122, 255, 0.4);
}

.back-icon {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
}

.back-label {
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80rpx 40rpx;
}

.empty-text {
  font-size: 32rpx;
  opacity: 0.8;
  display: block;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 28rpx;
  opacity: 0.5;
  display: block;
}

/* 添加按钮 */
.add-btn {
  background: linear-gradient(135deg, #34C759, #32D74B);
  border-radius: 16rpx;
  padding: 30rpx;
  text-align: center;
  margin-top: 30rpx;
  box-shadow: 0 6rpx 20rpx rgba(52, 199, 89, 0.3);
  transition: all 0.3s ease;
}

.add-btn:active {
  transform: scale(0.98);
  box-shadow: 0 3rpx 10rpx rgba(52, 199, 89, 0.4);
}

.add-text {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 600;
}

/* 章节列表 */
.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.chapter-item {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.light-theme .chapter-item {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.chapter-item:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.98);
}

.light-theme .chapter-item:active {
  background: rgba(0, 0, 0, 0.04);
}

.chapter-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.chapter-title {
  font-size: 32rpx;
  font-weight: 600;
  display: block;
}

.chapter-word-count {
  font-size: 26rpx;
  opacity: 0.7;
  display: block;
}

.chapter-actions {
  display: flex;
  gap: 15rpx;
}

/* 人物网格 */
.characters-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.character-card {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.light-theme .character-card {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.character-card:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.98);
}

.light-theme .character-card:active {
  background: rgba(0, 0, 0, 0.04);
}

.character-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF9500, #FF5F6D);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
}

.character-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.character-name {
  font-size: 30rpx;
  font-weight: 600;
  display: block;
}

.character-role {
  font-size: 26rpx;
  opacity: 0.7;
  display: block;
}

.character-actions {
  display: flex;
  gap: 15rpx;
}

/* 术语列表 */
.terms-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.term-item {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.light-theme .term-item {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.term-item:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.98);
}

.light-theme .term-item:active {
  background: rgba(0, 0, 0, 0.04);
}

.term-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.term-name {
  font-size: 32rpx;
  font-weight: 600;
  display: block;
}

.term-definition {
  font-size: 26rpx;
  opacity: 0.7;
  display: block;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  box-orient: vertical;
  overflow: hidden;
}

.term-actions {
  display: flex;
  gap: 15rpx;
}

/* 地图列表 */
.maps-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.map-item {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.light-theme .map-item {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.map-item:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.98);
}

.light-theme .map-item:active {
  background: rgba(0, 0, 0, 0.04);
}

.map-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.map-name {
  font-size: 32rpx;
  font-weight: 600;
  display: block;
}

.map-desc {
  font-size: 26rpx;
  opacity: 0.7;
  display: block;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  box-orient: vertical;
  overflow: hidden;
}

.map-meta {
  font-size: 24rpx;
  opacity: 0.5;
  display: block;
}

.map-actions {
  display: flex;
  gap: 15rpx;
}

/* 通用操作按钮 */
.action-btn {
  padding: 12rpx 20rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  transition: all 0.2s ease;
}

.action-btn.edit {
  background: rgba(0, 122, 255, 0.2);
  color: #007AFF;
}

.action-btn.delete {
  background: rgba(255, 67, 54, 0.2);
  color: #FF4336;
}

.action-btn:active {
  transform: scale(0.95);
  background: rgba(255, 67, 54, 0.3);
}

/* 作品列表 */
.works-section {
  margin-bottom: 40rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
  padding: 25rpx 30rpx;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(15rpx);
  border-radius: 20rpx;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}

.light-theme .section-header {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.section-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255, 255, 255, 0.3) 20%, 
    rgba(255, 255, 255, 0.3) 80%, 
    transparent
  );
}

.section-title {
  font-size: 34rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #ffffff, #f0f0f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 2rpx 8rpx rgba(255, 255, 255, 0.3);
}

.light-theme .section-title {
  background: linear-gradient(135deg, #333333, #666666);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.work-count {
  font-size: 26rpx;
  opacity: 0.8;
  font-weight: 500;
  padding: 8rpx 16rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12rpx;
  backdrop-filter: blur(5rpx);
}

.light-theme .work-count {
  background: rgba(0, 0, 0, 0.05);
  opacity: 0.7;
}

.works-list {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  overflow: hidden;
  backdrop-filter: blur(10rpx);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .works-list {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.work-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s ease;
}

.light-theme .work-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.work-item:last-child {
  border-bottom: none;
}

.work-item.selected {
  background: rgba(0, 122, 255, 0.1);
}

.work-checkbox {
  width: 40rpx;
  height: 40rpx;
  margin-right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8rpx;
  transition: all 0.2s ease;
}

.checkbox.checked {
  background: #007AFF;
  border-color: #007AFF;
  position: relative;
}

.checkbox.checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 24rpx;
  font-weight: bold;
}

.work-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: 20rpx;
}

.work-icon image {
  width: 100%;
  height: 100%;
}

.work-info {
  flex: 1;
}

.work-title {
  font-size: 32rpx;
  display: block;
  margin-bottom: 8rpx;
}

.work-meta {
  font-size: 26rpx;
  opacity: 0.6;
  display: block;
}

.delete-btn {
  padding: 10rpx 15rpx;
  border-radius: 8rpx;
  background: rgba(255, 67, 54, 0.1);
  transition: all 0.2s ease;
}

.delete-btn:active {
  background: rgba(255, 67, 54, 0.2);
  transform: scale(0.95);
}

.delete-x {
  color: #FF4336;
  font-size: 32rpx;
  font-weight: bold;
}

/* 管理单元格样式 */
.management-cells {
  padding: 20rpx 0;
}

.management-cell {
  background: linear-gradient(135deg, #007AFF, #5AC8FA);
  border-radius: 20rpx;
  padding: 40rpx 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.3);
  transition: all 0.3s ease;
  backdrop-filter: blur(10rpx);
}

.light-theme .management-cell {
  background: linear-gradient(135deg, #007AFF, #5AC8FA);
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.25);
}

.management-cell:active {
  transform: translateY(2rpx);
  box-shadow: 0 4rpx 12rpx rgba(0, 122, 255, 0.4);
}

.cell-text {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  display: block;
}

.back-btn {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 30rpx;
  margin-top: 20rpx;
  text-align: center;
  backdrop-filter: blur(10rpx);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.light-theme .back-btn {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.back-btn:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.2);
}

.back-text {
  color: #FFFFFF;
  font-size: 28rpx;
  opacity: 0.8;
}

.light-theme .back-text {
  color: #333333;
}

/* 批量操作栏 */
.batch-toolbar {
  position: fixed;
  bottom: 120rpx;
  left: 0;
  right: 0;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(20rpx);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
}

.light-theme .batch-toolbar {
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.selected-count {
  font-size: 28rpx;
}

.batch-actions {
  display: flex;
  gap: 20rpx;
}

.batch-btn {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 15rpx 20rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
}

.batch-btn image {
  width: 24rpx;
  height: 24rpx;
}

.batch-btn text {
  font-size: 26rpx;
}

/* 状态栏 */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  height: 60rpx;
}

.status-time {
  font-size: 28rpx;
  font-weight: 600;
}

.status-icons {
  display: flex;
  gap: 15rpx;
}

.status-icon {
  width: 32rpx;
  height: 32rpx;
}

/* 页面标题 */
.page-header {
  padding: 40rpx 30rpx 30rpx;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-text {
  flex: 1;
}

.page-title {
  font-size: 48rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 10rpx;
}

.page-subtitle {
  font-size: 28rpx;
  opacity: 0.7;
}

.header-actions {
  display: flex;
  align-items: center;
}

.modern-manage-btn {
  background: linear-gradient(135deg, #FF6B35, #F7931E);
  border: none;
  border-radius: 25rpx;
  padding: 20rpx 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(255, 107, 53, 0.3);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 140rpx;
}

.modern-manage-btn:active {
  transform: translateY(2rpx);
  box-shadow: 0 4rpx 12rpx rgba(255, 107, 53, 0.4);
}

.btn-text {
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 600;
  text-align: center;
}

/* 更多菜单 */
.more-menu-container {
  position: relative;
}

.more-btn {
  padding: 15rpx 20rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15rpx;
  backdrop-filter: blur(10rpx);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.light-theme .more-btn {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.more-btn:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.2);
}

.more-dots {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
  line-height: 1;
  letter-spacing: 8rpx;
}

.light-theme .more-dots {
  color: #333333;
}

/* 菜单遮罩 */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: 999;
}

/* 下拉菜单 */
.more-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 10rpx;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(20rpx);
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
  min-width: 160rpx;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.light-theme .more-menu {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
}

.menu-item {
  padding: 25rpx 30rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
}

.light-theme .menu-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background: rgba(255, 255, 255, 0.1);
}

.light-theme .menu-item:active {
  background: rgba(0, 0, 0, 0.05);
}

.menu-text {
  color: #FFFFFF;
  font-size: 28rpx;
  text-align: center;
  display: block;
}

.light-theme .menu-text {
  color: #333333;
}

/* 管理内容 */
.manage-content {
  padding: 0 30rpx;
  padding-bottom: 140rpx; /* 为悬浮返回按钮留出空间 */
}

/* 管理区域 */
.management-section {
  min-height: 60vh;
}

.management-header {
  text-align: center;
  margin-bottom: 40rpx;
}

.management-title {
  font-size: 48rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 16rpx;
  background: linear-gradient(135deg, #ffffff, #f0f0f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.light-theme .management-title {
  background: linear-gradient(135deg, #333333, #666666);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.management-subtitle {
  font-size: 28rpx;
  opacity: 0.7;
  display: block;
}

.management-body {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24rpx;
  padding: 30rpx;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10rpx);
}

.light-theme .management-body {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

/* 管理选项页面 */
.management-options {
  padding: 30rpx 0;
}

/* 悬浮返回按钮 */
.floating-back-btn {
  position: fixed;
  bottom: 140rpx; /* 底部导航栏高度 + 间隔 */
  right: 30rpx;
  background: linear-gradient(135deg, #007AFF, #5AC8FA);
  border-radius: 50rpx;
  padding: 20rpx 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.3);
  backdrop-filter: blur(10rpx);
  display: flex;
  align-items: center;
  gap: 10rpx;
  z-index: 999;
  transition: all 0.3s ease;
}

.floating-back-btn:active {
  transform: scale(0.95);
  box-shadow: 0 4rpx 12rpx rgba(0, 122, 255, 0.4);
}

.back-icon {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
}

.back-label {
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80rpx 40rpx;
}

.empty-text {
  font-size: 32rpx;
  opacity: 0.8;
  display: block;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 28rpx;
  opacity: 0.5;
  display: block;
}

/* 添加按钮 */
.add-btn {
  background: linear-gradient(135deg, #34C759, #32D74B);
  border-radius: 16rpx;
  padding: 30rpx;
  text-align: center;
  margin-top: 30rpx;
  box-shadow: 0 6rpx 20rpx rgba(52, 199, 89, 0.3);
  transition: all 0.3s ease;
}

.add-btn:active {
  transform: scale(0.98);
  box-shadow: 0 3rpx 10rpx rgba(52, 199, 89, 0.4);
}

.add-text {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 600;
}

/* 章节列表 */
.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.chapter-item {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.light-theme .chapter-item {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.chapter-item:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.98);
}

.light-theme .chapter-item:active {
  background: rgba(0, 0, 0, 0.04);
}

.chapter-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.chapter-title {
  font-size: 32rpx;
  font-weight: 600;
  display: block;
}

.chapter-word-count {
  font-size: 26rpx;
  opacity: 0.7;
  display: block;
}

.chapter-actions {
  display: flex;
  gap: 15rpx;
}

/* 人物网格 */
.characters-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.character-card {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.light-theme .character-card {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.character-card:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.98);
}

.light-theme .character-card:active {
  background: rgba(0, 0, 0, 0.04);
}

.character-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF9500, #FF5F6D);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
}

.character-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.character-name {
  font-size: 30rpx;
  font-weight: 600;
  display: block;
}

.character-role {
  font-size: 26rpx;
  opacity: 0.7;
  display: block;
}

.character-actions {
  display: flex;
  gap: 15rpx;
}

/* 术语列表 */
.terms-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.term-item {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.light-theme .term-item {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.term-item:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.98);
}

.light-theme .term-item:active {
  background: rgba(0, 0, 0, 0.04);
}

.term-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.term-name {
  font-size: 32rpx;
  font-weight: 600;
  display: block;
}

.term-definition {
  font-size: 26rpx;
  opacity: 0.7;
  display: block;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  box-orient: vertical;
  overflow: hidden;
}

.term-actions {
  display: flex;
  gap: 15rpx;
}

/* 地图列表 */
.maps-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.map-item {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.light-theme .map-item {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.map-item:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.98);
}

.light-theme .map-item:active {
  background: rgba(0, 0, 0, 0.04);
}

.map-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.map-name {
  font-size: 32rpx;
  font-weight: 600;
  display: block;
}

.map-desc {
  font-size: 26rpx;
  opacity: 0.7;
  display: block;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  box-orient: vertical;
  overflow: hidden;
}

.map-meta {
  font-size: 24rpx;
  opacity: 0.5;
  display: block;
}

.map-actions {
  display: flex;
  gap: 15rpx;
}

/* 通用操作按钮 */
.action-btn {
  padding: 12rpx 20rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  transition: all 0.2s ease;
}

.action-btn.edit {
  background: rgba(0, 122, 255, 0.2);
  color: #007AFF;
}

.action-btn.delete {
  background: rgba(255, 67, 54, 0.2);
  color: #FF4336;
}

.action-btn:active {
  transform: scale(0.95);
  background: rgba(255, 67, 54, 0.3);
}

/* 统计卡片 */
.stats-section {
  margin-bottom: 40rpx;
}

.stats-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 30rpx;
  display: flex;
  justify-content: space-around;
  backdrop-filter: blur(10rpx);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .stats-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stats-item {
  text-align: center;
  flex: 1;
}

.stats-number {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.stats-label {
  font-size: 24rpx;
  opacity: 0.7;
}

/* 快速操作 */
.quick-actions {
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
  display: block;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.action-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15rpx;
  padding: 30rpx 20rpx;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.light-theme .action-item {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.action-item:active {
  transform: scale(0.95);
}

.action-icon {
  width: 48rpx;
  height: 48rpx;
  margin: 0 auto 15rpx;
}

.action-icon image {
  width: 100%;
  height: 100%;
}

.action-text {
  font-size: 24rpx;
  display: block;
}

/* 文件列表 */
.file-section {
  margin-bottom: 40rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.view-all {
  font-size: 28rpx;
  color: #007AFF;
  opacity: 0.8;
}

.file-list {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  overflow: hidden;
  backdrop-filter: blur(10rpx);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.light-theme .file-list {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.file-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.light-theme .file-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.file-item:last-child {
  border-bottom: none;
}

.file-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: 20rpx;
}

.file-icon image {
  width: 100%;
  height: 100%;
}

.file-info {
  flex: 1;
}

.file-name {
  font-size: 30rpx;
  display: block;
  margin-bottom: 5rpx;
}

.file-meta {
  font-size: 24rpx;
  opacity: 0.6;
  display: block;
}

.file-actions {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  width: 36rpx;
  height: 36rpx;
  padding: 8rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.1);
}

.action-btn image {
  width: 100%;
  height: 100%;
}


</style>
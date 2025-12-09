<template>
  <view class="page-container" :class="{ 'light-theme': !isDarkMode }">
    <!-- 头部占位栏 - 防止内容与手机状态栏重叠 -->
    <HeaderPlaceholder />

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
              <view class="menu-item" @tap="manualBackup">
                <text class="menu-text">备份数据</text>
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
          <view class="section-header-left">
            <view v-if="currentWork" class="inline-back-btn" @tap="backToList">
              <text class="back-icon">←</text>
            </view>
            <text class="section-title">{{
              currentWork ? currentWork.title : "作品列表"
            }}</text>
          </view>
          <text class="work-count" v-if="!currentWork"
            >共 {{ works.length }} 部作品</text
          >
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
              <view
                class="checkbox"
                :class="{ checked: selectedWorks.includes(work.id) }"
              ></view>
            </view>

            <view class="work-info">
              <text class="work-title">{{ work.title }}</text>
              <text class="work-meta"
                >{{ work.chapterCount }} 章节 · {{ work.wordCount }} 字</text
              >
            </view>

            <view class="delete-btn" @tap.stop="deleteWork(work)">
              <text class="delete-x">×</text>
            </view>
          </view>
        </view>

        <!-- 管理单元格 -->
        <view v-else class="management-content">
          <!-- 章节管理 -->
          <view
            v-if="currentManagementType === 'chapters'"
            class="management-section"
          >
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
                    <text class="chapter-title">{{
                      chapter.title || `第${index + 1}章`
                    }}</text>
                    <text class="chapter-word-count"
                      >{{ chapter.word_count || 0 }}字</text
                    >
                  </view>
                  <view class="chapter-actions">
                    <text
                      class="action-btn delete"
                      @tap.stop="deleteChapter(chapter.id)"
                      >删除</text
                    >
                  </view>
                </view>
              </view>
              <view class="add-btn" @tap="addChapter">
                <text class="add-text">+ 添加章节</text>
              </view>
            </view>
          </view>

          <!-- 人物管理 -->
          <view
            v-else-if="currentManagementType === 'characters'"
            class="management-section"
          >
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
                    <text class="avatar-text">{{
                      character.name ? character.name[0] : "?"
                    }}</text>
                  </view>
                  <view class="character-info">
                    <text class="character-name">{{
                      character.name || "未命名"
                    }}</text>
                    <text class="character-role">{{
                      character.role || character.description || "无角色"
                    }}</text>
                  </view>
                  <view class="character-actions">
                    <text
                      class="action-btn delete"
                      @tap.stop="deleteCharacter(character.id)"
                      >删除</text
                    >
                  </view>
                </view>
              </view>
              <view class="add-btn" @tap="addCharacter">
                <text class="add-text">+ 添加人物</text>
              </view>
            </view>
          </view>

          <!-- 术语管理 -->
          <view
            v-else-if="currentManagementType === 'terms'"
            class="management-section"
          >
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
                    <text class="term-name">{{ term.name || "未命名" }}</text>
                    <text class="term-definition">{{
                      term.description || term.definition || "暂无定义"
                    }}</text>
                  </view>
                  <view class="term-actions">
                    <text
                      class="action-btn delete"
                      @tap.stop="deleteTerm(term.id)"
                      >删除</text
                    >
                  </view>
                </view>
              </view>
              <view class="add-btn" @tap="addTerm">
                <text class="add-text">+ 添加术语</text>
              </view>
            </view>
          </view>

          <!-- 地图管理 -->
          <view
            v-else-if="currentManagementType === 'maps'"
            class="management-section"
          >
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
                    <text class="map-name">{{ map.name || "未命名" }}</text>
                    <text class="map-desc">{{
                      map.description || "暂无描述"
                    }}</text>
                    <text class="map-meta"
                      >{{ formatTime(map.updated_at) }} ·
                      {{ map.nodes?.length || 0 }}个节点</text
                    >
                  </view>
                  <view class="map-actions">
                    <text
                      class="action-btn edit"
                      @tap.stop="editMapDirectly(map)"
                      >编辑</text
                    >
                    <text
                      class="action-btn delete"
                      @tap.stop="deleteMap(map.id)"
                      >删除</text
                    >
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
    </view>

    <!-- 批量操作栏 -->
    <view
      class="batch-toolbar"
      v-if="isSelectionMode && selectedWorks.length > 0"
    >
      <text class="selected-count"
        >已选择 {{ selectedWorks.length }} 个作品</text
      >
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

    <!-- 通用编辑模态框 -->
    <view v-if="showEditModal" class="edit-modal-overlay" @tap="closeEditModal">
      <view class="edit-modal-content" @tap.stop>
        <view class="edit-modal-header">
          <text class="edit-modal-title">{{ editModalTitle }}</text>
          <text class="edit-modal-close" @tap="closeEditModal">×</text>
        </view>

        <view class="edit-modal-body">
          <!-- 人物编辑 -->
          <template v-if="editModalType === 'character'">
            <view class="edit-field">
              <text class="field-label required">姓名</text>
              <input
                class="field-input"
                v-model="editItemData.name"
                placeholder="请输入人物姓名"
                maxlength="50"
              />
            </view>

            <view class="edit-field">
              <text class="field-label">描述</text>
              <textarea
                class="field-textarea"
                v-model="editItemData.description"
                placeholder="人物特征和描述"
                maxlength="500"
                :auto-height="true"
              ></textarea>
            </view>

            <view class="edit-field">
              <text class="field-label">头像</text>
              <view class="avatar-upload vertical" @tap="chooseAvatar">
                <view class="avatar-box">
                  <image
                    v-if="editItemData.avatar"
                    :src="editItemData.avatar"
                    class="avatar-preview"
                    mode="aspectFill"
                  ></image>
                  <view v-else class="avatar-placeholder">暂无头像</view>
                </view>
                <text class="avatar-hint">点击选择相册</text>
              </view>
            </view>

            <view class="edit-field">
              <text class="field-label">标签</text>
              <view class="tags-row">
                <view
                  v-for="(tag, index) in editItemData.tags || []"
                  :key="index"
                  class="tag-chip"
                  @tap.stop="removeTag(index)"
                >
                  {{ tag }} ×
                </view>
                <view class="tag-add placeholder" @tap.stop="openTagPicker">
                  + 添加标签
                </view>
              </view>
            </view>

            <view class="edit-field">
              <text class="field-label">关系链接</text>
              <view class="relations-box">
                <view
                  v-for="(rel, index) in editItemData.relationships || []"
                  :key="index"
                  class="relation-item"
                  @tap.stop="removeRelation(index)"
                >
                  {{ rel.name || rel.target || "未命名人物" }} ·
                  {{ rel.relation || rel.desc || "关系未填写" }} ×
                </view>
                <view
                  class="relation-add placeholder"
                  @tap.stop="openRelationPicker"
                >
                  + 添加关系
                </view>
              </view>
            </view>
          </template>

          <!-- 设定/术语编辑 -->
          <template v-else-if="editModalType === 'term'">
            <view class="edit-field">
              <text class="field-label required">名称</text>
              <input
                class="field-input"
                v-model="editItemData.name"
                placeholder="请输入设定/术语名称"
                maxlength="80"
              />
            </view>
            <view class="edit-field">
              <text class="field-label">描述</text>
              <textarea
                class="field-textarea"
                v-model="editItemData.description"
                placeholder="详细描述或定义"
                maxlength="600"
                :auto-height="true"
              ></textarea>
            </view>
          </template>

          <!-- 地图编辑 -->
          <template v-else-if="editModalType === 'map'">
            <view class="edit-field">
              <text class="field-label">地图名称</text>
              <input
                class="field-input"
                v-model="editItemData.name"
                placeholder="请输入地图名称"
                maxlength="50"
              />
            </view>
            <view class="edit-field">
              <text class="field-label">描述</text>
              <textarea
                class="field-textarea"
                v-model="editItemData.description"
                placeholder="地图的背景和用途说明"
                maxlength="200"
                :auto-height="true"
              ></textarea>
            </view>
            <view class="edit-field">
              <text class="field-label">节点数量</text>
              <input
                class="field-input disabled-input"
                :value="(editItemData.nodes?.length || 0) + '个'"
                disabled
              />
            </view>
          </template>
        </view>

        <view class="edit-modal-footer">
          <button class="modal-btn cancel" @tap="closeEditModal">取消</button>
          <button class="modal-btn save" @tap="saveEditModal">保存</button>
        </view>
      </view>
    </view>

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
import { ref, onMounted } from "vue";
import CreateWorkModal from "@/components/CreateWorkModal.vue";
import HeaderPlaceholder from "@/components/HeaderPlaceholder.vue";
import BottomNav from "@/components/BottomNav.vue";
import FileSystemStorage from "@/utils/fileSystemStorage.js";
import { OfflineAuthService } from "@/utils/offlineAuth.js";
import themeManager, {
  isDarkMode as getIsDarkMode,
} from "@/utils/themeManager.js";

const fileStorage = FileSystemStorage;

// 响应式数据
const isDarkMode = ref(getIsDarkMode());
const currentUser = ref(null);
const showCreateWorkModal = ref(false);

const works = ref([]);
const selectedWorks = ref([]);
const isSelectionMode = ref(false);
const currentWork = ref(null);
const showMoreMenu = ref(false);

// 管理相关数据
const currentManagementType = ref("");
const chapters = ref([]);
const characters = ref([]);
const terms = ref([]);
const maps = ref([]);

// 编辑模态框状态
const showEditModal = ref(false);
const editModalType = ref(""); // "character", "term", "map"
const editModalTitle = ref("编辑内容");
const editItemData = ref({});

// 页面初始化
onMounted(async () => {
  // 初始化主题
  isDarkMode.value = themeManager.isDarkMode();

  // 监听主题变更事件
  try {
    if (typeof uni !== "undefined" && uni.$on) {
      uni.$on("theme-changed", (themeData) => {
        try {
          isDarkMode.value = themeData.isDark;
        } catch (error) {
          console.warn("主题变更处理失败:", error);
        }
      });
    }
  } catch (error) {
    console.warn("主题监听器设置失败:", error);
  }

  // 获取当前用户
  try {
    currentUser.value = await OfflineAuthService.getCurrentUser();

    if (currentUser.value && currentUser.value.id) {
      await loadWorks();
    } else {
      console.warn("未找到有效用户信息，创建默认用户");
      // 创建默认用户
      currentUser.value = {
        id: "default_user",
        username: "离线用户",
        email: "",
      };
      // 初始化默认用户存储
      await fileStorage.initUserStorage(currentUser.value.id);
      await loadWorks();
    }
  } catch (error) {
    console.error("Failed to load user data:", error);
    // 失败时创建默认用户
    currentUser.value = {
      id: "default_user",
      username: "离线用户",
      email: "",
    };
    try {
      await fileStorage.initUserStorage(currentUser.value.id);
      await loadWorks();
    } catch (initError) {
      console.error("初始化默认用户存储失败:", initError);
    }
  }
});

// 初始化原生插件
const initNativePlugin = () => {
  try {
    let plugin = uni.requireNativePlugin("export-native");

    if (plugin && Object.keys(plugin).length > 0) {
      // 标准插件注册成功
      if (typeof window !== "undefined") {
        window.exportNativePlugin = plugin;
      }
      return;
    }

    // 如果标准方式失败，尝试Android直接实例
    if (typeof plus !== "undefined" && plus.android) {
      const ExportModule = plus.android.importClass(
        "com.cwriter.export.ExportModule"
      );
      if (ExportModule) {
        const instance = new ExportModule();

        plugin = {
          exportToPDF: function (options, callback) {
            try {
              const result = instance.exportToPDFSync(
                plus.android.newObject(
                  "com.alibaba.fastjson.JSONObject",
                  JSON.stringify(options)
                )
              );

              if (callback) {
                let finalResult = result;
                if (typeof result === "string") {
                  try {
                    finalResult = JSON.parse(result);
                  } catch (parseError) {
                    finalResult = { success: false, error: "结果解析失败" };
                  }
                }
                callback(finalResult);
              }
            } catch (error) {
              if (callback) callback({ success: false, error: error.message });
            }
          },

          exportToDOCX: function (options, callback) {
            try {
              const result = instance.exportToDOCXSync(
                plus.android.newObject(
                  "com.alibaba.fastjson.JSONObject",
                  JSON.stringify(options)
                )
              );

              if (callback) {
                let finalResult = result;
                if (typeof result === "string") {
                  try {
                    finalResult = JSON.parse(result);
                  } catch (parseError) {
                    finalResult = { success: false, error: "结果解析失败" };
                  }
                }
                callback(finalResult);
              }
            } catch (error) {
              if (callback) callback({ success: false, error: error.message });
            }
          },
        };

        if (typeof window !== "undefined") {
          window.exportNativePlugin = plugin;
        }
      }
    }
  } catch (error) {
    console.error("插件初始化失败:", error);
  }
};

// 页面加载完成后初始化插件
setTimeout(initNativePlugin, 1000);

// 加载作品列表
const loadWorks = async () => {
  try {
    if (!currentUser.value || !currentUser.value.id) {
      console.warn("用户信息无效，跳过作品加载");
      works.value = [];
      return;
    }

    // 从文件系统获取作品列表
    const userWorks = await fileStorage.getUserWorks(currentUser.value.id);

    console.log("📚 管理页面加载到的作品数据:", userWorks);

    // 使用 Promise.all 来并行处理所有作品的字数计算
    const worksPromises = userWorks.map(async (work) => {
      // 计算字数：尝试从文档文件获取，如果没有则从标题和描述估算
      let wordCount = 0;
      try {
        // 尝试读取文档内容来计算字数
        const manuscriptPath = `${work.local_file_path}/settings/manuscript.json`;
        const manuscript = await fileStorage.readFile(manuscriptPath);
        if (manuscript && manuscript.word_count) {
          wordCount = manuscript.word_count;
        } else if (manuscript && manuscript.content) {
          wordCount = manuscript.content.replace(/\s/g, "").length;
        } else {
          // 估算字数：标题 + 描述
          wordCount =
            (work.title?.length || 0) + (work.description?.length || 0);
        }
      } catch (error) {
        // 如果读取失败，使用估算字数
        wordCount = (work.title?.length || 0) + (work.description?.length || 0);
      }

      return {
        id: work.id,
        title: work.title || "未命名作品",
        modifiedTime: new Date(
          work.updated_at || work.created_at
        ).toLocaleDateString(),
        chapterCount: work.chapter_count || 0,
        wordCount: wordCount,
        structure_type: work.structure_type,
        file_structure: work.file_structure,
        local_file_path: work.local_file_path,
        folderName: work.folderName,
      };
    });

    // 等待所有作品数据处理完成
    works.value = await Promise.all(worksPromises);
  } catch (error) {
    console.error("管理页面加载作品列表失败:", error);
    console.error("错误详情:", error.stack);
    works.value = [];
  }
};

// 导航功能
const handleNavSwitch = () => {
  // 管理页面不处理，由 BottomNav 组件内部处理
};

const toggleTheme = () => {
  themeManager.toggleTheme();
  isDarkMode.value = themeManager.isDarkMode();
};

// 工具栏操作
const showImport = () => {
  uni.showToast({
    title: "导入功能开发中",
    icon: "none",
  });
};

const showExport = () => {
  // 跳转到导出页面
  uni.navigateTo({
    url: "/pages/export/index",
  });
  closeMoreMenu();
};

const loadLocalWorks = async () => {
  try {
    if (!currentUser.value || !currentUser.value.id) {
      uni.showToast({
        title: "请先登录",
        icon: "none",
      });
      return;
    }

    // 获取用户的所有作品
    const userWorks = await fileStorage.getUserWorks(currentUser.value.id);
    if (userWorks && userWorks.length > 0) {
      // 更新作品列表
      works.value = userWorks.map((work) => ({
        id: work.id,
        title: work.title,
        modifiedTime: new Date(work.updated_at).toLocaleDateString(),
        chapterCount: work.chapter_count || 0,
        wordCount: work.word_count || 0,
      }));

      uni.showToast({
        title: `加载了 ${userWorks.length} 个作品`,
        icon: "success",
      });
    } else {
      uni.showToast({
        title: "未找到作品",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("Failed to load user works:", error);
    uni.showToast({
      title: "加载作品失败",
      icon: "error",
    });
  }
};

// 作品操作
const openWorkDetail = (work) => {
  if (isSelectionMode.value) {
    toggleWorkSelection(work.id);
  } else {
    // 选择作品进入管理模式
    selectWork(work);
  }
};

const deleteWork = async (work) => {
  try {
    uni.showModal({
      title: "确认删除",
      content: `确定要删除作品"${work.title}"吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          // 传递userId和workId两个参数
          await fileStorage.deleteWork(
            currentUser.value?.id || "default_user",
            work.id
          );
          uni.showToast({
            title: "删除成功",
            icon: "success",
          });
          await loadWorks();
        }
      },
    });
  } catch (error) {
    console.error("Failed to delete work:", error);
    uni.showToast({
      title: "删除失败",
      icon: "error",
    });
  }
};

const toggleWorkSelection = (workId) => {
  const index = selectedWorks.value.indexOf(workId);
  if (index > -1) {
    selectedWorks.value.splice(index, 1);
  } else {
    selectedWorks.value.push(workId);
  }

  if (selectedWorks.value.length === 0) {
    isSelectionMode.value = false;
  }
};

const deleteSelected = async () => {
  if (selectedWorks.value.length === 0) return;

  try {
    uni.showModal({
      title: "确认删除",
      content: `确定要删除选中的 ${selectedWorks.value.length} 个作品吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          for (const workId of selectedWorks.value) {
            await fileStorage.deleteWork(
              currentUser.value?.id || "default_user",
              workId
            );
          }

          uni.showToast({
            title: `删除成功`,
            icon: "success",
          });

          selectedWorks.value = [];
          isSelectionMode.value = false;
          await loadWorks();
        }
      },
    });
  } catch (error) {
    console.error("Failed to delete selected works:", error);
    uni.showToast({
      title: "删除失败",
      icon: "error",
    });
  }
};

const exportSelected = () => {
  // 如果有选中的作品，传递作品ID
  if (selectedWorks.value.length > 0) {
    const workIds = selectedWorks.value.join(",");
    uni.navigateTo({
      url: `/pages/export/index?workIds=${workIds}`,
    });
  } else {
    // 没有选中作品，直接跳转
    uni.navigateTo({
      url: "/pages/export/index",
    });
  }
};

const handleWorkCreated = () => {
  uni.showToast({
    title: "作品创建成功",
    icon: "success",
  });
  loadWorks();
};

// 选择作品
const selectWork = (work) => {
  if (isSelectionMode.value) {
    toggleWorkSelection(work.id);
  } else {
    currentWork.value = work;
  }
};

// 返回列表
const backToList = () => {
  currentWork.value = null;
  currentManagementType.value = "";
  chapters.value = [];
  characters.value = [];
  terms.value = [];
  maps.value = [];
};

// 开始管理
const startManagement = async (type) => {
  currentManagementType.value = type;
  await loadManagementData(type);
};

// 加载管理数据
const loadManagementData = async (type) => {
  if (!currentUser.value || !currentWork.value) return;

  try {
    switch (type) {
      case "chapters":
        await loadChapters();
        break;
      case "characters":
        await loadCharacters();
        break;
      case "terms":
        await loadTerms();
        break;
      case "maps":
        await loadMaps();
        break;
    }
  } catch (error) {
    console.error(`加载${type}数据失败:`, error);
    uni.showToast({
      title: "加载失败",
      icon: "error",
    });
  }
};

// 加载章节数据
const loadChapters = async () => {
  try {
    const result = await fileStorage.getChapters(
      currentUser.value.id,
      currentWork.value.id
    );
    chapters.value = Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("加载章节数据失败:", error);
    chapters.value = [];
  }
};

// 加载人物数据
const loadCharacters = async () => {
  try {
    const result = await fileStorage.getCharacters(
      currentUser.value.id,
      currentWork.value.id
    );
    characters.value = Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("加载人物数据失败:", error);
    characters.value = [];
  }
};

// 加载术语数据
const loadTerms = async () => {
  try {
    const result = await fileStorage.getTerms(
      currentUser.value.id,
      currentWork.value.id
    );
    terms.value = Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("加载术语数据失败:", error);
    terms.value = [];
  }
};

// 加载地图数据
const loadMaps = async () => {
  try {
    const mapsData = await fileStorage.getMapList(
      currentUser.value.id,
      currentWork.value.id
    );
    maps.value = mapsData && Array.isArray(mapsData.maps) ? mapsData.maps : [];
    console.log("地图数据:", maps.value);
  } catch (error) {
    console.error("加载地图数据失败:", error);
    maps.value = [];
  }
};

// 章节操作
const addChapter = () => {
  uni.navigateTo({
    url: `/pages/editor/chapter?workId=${currentWork.value.id}&mode=create`,
  });
};

const editChapter = (chapter) => {
  uni.navigateTo({
    url: `/pages/editor/chapter?workId=${currentWork.value.id}&chapterId=${chapter.id}&mode=edit`,
  });
};

const deleteChapter = (chapterId) => {
  uni.showModal({
    title: "确认删除",
    content: "确定要删除这个章节吗？此操作不可恢复。",
    success: async (res) => {
      if (res.confirm) {
        try {
          await fileStorage.deleteChapter(
            currentUser.value.id,
            currentWork.value.id,
            chapterId
          );
          await loadChapters();
          uni.showToast({
            title: "删除成功",
            icon: "success",
          });
        } catch (error) {
          console.error("删除章节失败:", error);
          uni.showToast({
            title: "删除失败",
            icon: "error",
          });
        }
      }
    },
  });
};

// 人物操作
const addCharacter = () => {
  uni.navigateTo({
    url: `/pages/create?type=character&workId=${currentWork.value.id}`,
  });
};

const editCharacter = (character) => {
  openEditModal("character", character);
};

const deleteCharacter = (characterId) => {
  uni.showModal({
    title: "确认删除",
    content: "确定要删除这个人物吗？此操作不可恢复。",
    success: async (res) => {
      if (res.confirm) {
        try {
          await fileStorage.deleteCharacter(
            currentUser.value.id,
            currentWork.value.id,
            characterId
          );
          await loadCharacters();
          uni.showToast({
            title: "删除成功",
            icon: "success",
          });
        } catch (error) {
          console.error("删除人物失败:", error);
          uni.showToast({
            title: "删除失败",
            icon: "error",
          });
        }
      }
    },
  });
};

// 术语操作
const addTerm = () => {
  uni.navigateTo({
    url: `/pages/create?type=setting&workId=${currentWork.value.id}`,
  });
};

const editTerm = (term) => {
  openEditModal("term", term);
};

const deleteTerm = (termId) => {
  uni.showModal({
    title: "确认删除",
    content: "确定要删除这个术语吗？此操作不可恢复。",
    success: async (res) => {
      if (res.confirm) {
        try {
          await fileStorage.deleteTerm(
            currentUser.value.id,
            currentWork.value.id,
            termId
          );
          await loadTerms();
          uni.showToast({
            title: "删除成功",
            icon: "success",
          });
        } catch (error) {
          console.error("删除术语失败:", error);
          uni.showToast({
            title: "删除失败",
            icon: "error",
          });
        }
      }
    },
  });
};

// 地图操作
const addMap = () => {
  uni.navigateTo({
    url: `/pages/create?type=map&workId=${currentWork.value.id}`,
  });
};

const editMap = (map) => {
  // 这里可以扩展为查看地图详情
  console.log("查看地图:", map);
};

const editMapDirectly = (map) => {
  openEditModal("map", map);
};

const deleteMap = (mapId) => {
  uni.showModal({
    title: "确认删除",
    content: "确定要删除这个地图吗？此操作不可恢复。",
    success: async (res) => {
      if (res.confirm) {
        try {
          await fileStorage.deleteMap(
            currentUser.value.id,
            currentWork.value.id,
            mapId
          );
          await loadMaps();
          uni.showToast({
            title: "删除成功",
            icon: "success",
          });
        } catch (error) {
          console.error("删除地图失败:", error);
          uni.showToast({
            title: "删除失败",
            icon: "error",
          });
        }
      }
    },
  });
};

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return "未知时间";

  try {
    const now = new Date();
    const time = new Date(timestamp);

    if (isNaN(time.getTime())) {
      return "未知时间";
    }

    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diff < 60) return "刚刚";
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;

    return time.toLocaleDateString();
  } catch (error) {
    return "未知时间";
  }
};

// 编辑模态框相关方法
const openEditModal = (type, data) => {
  editModalType.value = type;
  editModalTitle.value = getModalTitle(type);
  const baseData = { ...data };

  if (type === "character") {
    baseData.avatar = baseData.avatar || "";
    baseData.tags = Array.isArray(baseData.tags) ? baseData.tags : [];
    baseData.relationships = Array.isArray(baseData.relationships)
      ? baseData.relationships
      : [];
    baseData.attributes = baseData.attributes || {};
    baseData.description = baseData.description || "";
  }

  if (type === "term") {
    baseData.description = baseData.description || baseData.definition || "";
  }

  editItemData.value = baseData; // 深拷贝与默认值补齐
  showEditModal.value = true;
};

// 头像上传（App 环境优先 plus.io）
const chooseAvatar = () => {
  if (editModalType.value !== "character" || !currentWork.value) return;
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album"],
    success: (res) => {
      const srcPath = res.tempFilePaths?.[0];
      if (!srcPath) return;
      try {
        const workPath = fileStorage.getWorkPath(
          currentUser.value.id,
          currentWork.value.id
        );
        const avatarDir = `${workPath}/characters/avatars`;
        fileStorage.mkdirIfNotExists(avatarDir);
        const target = `${avatarDir}/${
          editItemData.value.id || Date.now()
        }.png`;

        if (
          typeof plus !== "undefined" &&
          plus.io &&
          plus.io.resolveLocalFileSystemURL
        ) {
          plus.io.resolveLocalFileSystemURL(
            srcPath,
            (entry) => {
              plus.io.resolveLocalFileSystemURL(
                avatarDir,
                (dstDir) => {
                  entry.copyTo(
                    dstDir,
                    target.split("/").pop(),
                    () => {
                      editItemData.value.avatar = target;
                      uni.showToast({ title: "已更新头像", icon: "success" });
                    },
                    (e) => {
                      console.error("copyTo 失败", e);
                      uni.showToast({ title: "保存头像失败", icon: "error" });
                    }
                  );
                },
                (e) => {
                  console.error("resolve avatarDir 失败", e);
                  uni.showToast({ title: "保存头像失败", icon: "error" });
                }
              );
            },
            (e) => {
              console.error("resolve srcPath 失败", e);
              uni.showToast({ title: "保存头像失败", icon: "error" });
            }
          );
        } else {
          const fs = uni.getFileSystemManager && uni.getFileSystemManager();
          if (fs && fs.copyFileSync) {
            fs.copyFileSync(srcPath, target);
            editItemData.value.avatar = target;
            uni.showToast({ title: "已更新头像", icon: "success" });
          } else {
            uni.showToast({ title: "当前平台不支持文件操作", icon: "none" });
          }
        }
      } catch (error) {
        console.error("保存头像失败:", error);
        uni.showToast({ title: "保存头像失败", icon: "error" });
      }
    },
    fail: () => {
      uni.showToast({ title: "未选择图片", icon: "none" });
    },
  });
};

// 标签选择
const openTagPicker = () => {
  if (!currentWork.value || !currentUser.value) return;
  const selected = encodeURIComponent(
    JSON.stringify(editItemData.value.tags || [])
  );
  const url = `/pages/manage/tag-picker?userId=${currentUser.value.id}&workId=${currentWork.value.id}&selected=${selected}`;
  uni.$once("tagsSelected", (data) => {
    editItemData.value.tags = data?.tags || [];
  });
  uni.navigateTo({
    url,
    events: {
      tagsSelected: (data) => {
        editItemData.value.tags = data?.tags || [];
      },
    },
  });
};

// 关系选择
const openRelationPicker = () => {
  if (!currentWork.value || !currentUser.value) return;
  const selected = encodeURIComponent(
    JSON.stringify(editItemData.value.relationships || [])
  );
  const url = `/pages/manage/relation-picker?userId=${
    currentUser.value.id
  }&workId=${currentWork.value.id}&selfId=${
    editItemData.value.id || ""
  }&selected=${selected}`;
  uni.navigateTo({
    url,
    events: {
      relationSelected: (data) => {
        if (!data || !data.relation) return;
        const list = Array.isArray(editItemData.value.relationships)
          ? [...editItemData.value.relationships]
          : [];
        list.push(data);
        editItemData.value.relationships = list;
      },
    },
  });
};

const removeTag = (index) => {
  if (!Array.isArray(editItemData.value.tags)) return;
  const list = [...editItemData.value.tags];
  list.splice(index, 1);
  editItemData.value.tags = list;
};

const removeRelation = (index) => {
  if (!Array.isArray(editItemData.value.relationships)) return;
  const list = [...editItemData.value.relationships];
  list.splice(index, 1);
  editItemData.value.relationships = list;
};

const closeEditModal = () => {
  showEditModal.value = false;
  editModalType.value = "";
  editItemData.value = {};
};

const getModalTitle = (type) => {
  const titles = {
    character: "编辑人物",
    term: "编辑设定/术语",
    map: "编辑地图",
  };
  return titles[type] || "编辑内容";
};

const saveEditModal = async () => {
  try {
    const type = editModalType.value;
    const data = editItemData.value;

    if (!data.name || !data.name.trim()) {
      uni.showToast({
        title: "请输入名称",
        icon: "none",
      });
      return;
    }

    // 确保有ID（编辑时已有，新建时生成）
    if (!data.id) {
      data.id = Date.now().toString();
    }

    // 添加时间戳
    data.updated_at = new Date().toISOString();
    if (!data.created_at) {
      data.created_at = data.updated_at;
    }

    if (type === "character") {
      await fileStorage.saveCharacter(
        currentUser.value.id,
        currentWork.value.id,
        data
      );
      await loadCharacters();
    } else if (type === "term") {
      await fileStorage.saveTerm(
        currentUser.value.id,
        currentWork.value.id,
        data
      );
      await loadTerms();
    } else if (type === "map") {
      await fileStorage.saveMapData(
        currentUser.value.id,
        currentWork.value.id,
        data
      );
      await loadMaps();
    }

    uni.showToast({
      title: "保存成功",
      icon: "success",
    });
    closeEditModal();
  } catch (error) {
    console.error("保存编辑失败:", error);
    uni.showToast({
      title: "保存失败",
      icon: "error",
    });
  }
};

// 处理管理选项点击（保留原有功能）
const handleManagement = (type) => {
  if (type === "drafts") {
    uni.showToast({
      title: "草稿管理功能开发中",
      icon: "none",
    });
  } else {
    startManagement(type);
  }
};

// 手动备份数据
const manualBackup = async () => {
  try {
    const app = getApp();
    if (app && app.manualBackup) {
      const result = await app.manualBackup();
      if (result.success) {
        closeMoreMenu();
      }
    } else {
      uni.showToast({
        title: "备份功能不可用",
        icon: "error",
      });
    }
  } catch (error) {
    console.error("手动备份失败:", error);
    uni.showToast({
      title: "备份失败",
      icon: "error",
    });
  }
};

// 切换更多菜单
const toggleMoreMenu = () => {
  showMoreMenu.value = !showMoreMenu.value;
};

// 关闭菜单
const closeMoreMenu = () => {
  showMoreMenu.value = false;
};
</script>

<style scoped>
.page-container {
  --accent: #ff6b35;
  --accent-strong: #ff8d5c;
  --accent-soft: rgba(255, 107, 53, 0.14);
  --surface-1: #151515;
  --surface-2: #1f1f1f;
  --border: rgba(255, 255, 255, 0.08);
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.72);
  min-height: 100vh;
  background: radial-gradient(
      circle at 20% 20%,
      rgba(255, 138, 45, 0.08),
      transparent 36%
    ),
    radial-gradient(
      circle at 80% 10%,
      rgba(255, 138, 45, 0.06),
      transparent 30%
    ),
    linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
  color: var(--text-primary);
  padding-bottom: 120rpx;
}

.page-container.light-theme {
  --accent: #ff6b35;
  --accent-strong: #ff8d5c;
  --accent-soft: rgba(255, 107, 53, 0.12);
  --surface-1: #ffffff;
  --surface-2: #f7f7f7;
  --border: rgba(0, 0, 0, 0.06);
  --text-primary: #1c1c1c;
  --text-secondary: rgba(0, 0, 0, 0.62);
  background: radial-gradient(
      circle at 20% 20%,
      rgba(255, 138, 45, 0.07),
      transparent 34%
    ),
    radial-gradient(circle at 80% 0%, rgba(255, 138, 45, 0.05), transparent 30%),
    linear-gradient(135deg, #ffffff 0%, #f3f3f3 100%);
  color: var(--text-primary);
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
  font-weight: 800;
  letter-spacing: 1rpx;
  display: block;
  margin-bottom: 16rpx;
  background: linear-gradient(135deg, var(--accent-strong), #ffd9b1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.management-subtitle {
  font-size: 28rpx;
  color: var(--text-secondary);
  display: block;
}

.management-body {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 24rpx;
  padding: 30rpx;
  border: 1px solid var(--border);
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12rpx);
}

.light-theme .management-body {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border);
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.08);
}

/* 管理选项页面 */
.management-options {
  padding: 30rpx 0;
}

/* 悬浮返回按钮 */
.floating-back-btn {
  display: none; /* inline back button now in header */
}

.back-icon {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: bold;
}

.back-label {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
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
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border-radius: 18rpx;
  padding: 30rpx;
  text-align: center;
  margin-top: 30rpx;
  box-shadow: 0 8rpx 22rpx rgba(255, 138, 45, 0.32);
  transition: all 0.28s ease;
}

.add-btn:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 12rpx rgba(255, 138, 45, 0.45);
}

.add-text {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

/* 章节列表 */
.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.chapter-item {
  background: var(--surface-2);
  border-radius: 18rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border);
  transition: all 0.2s ease;
}

.light-theme .chapter-item {
  background: var(--surface-2);
}

.chapter-item:active {
  background: rgba(255, 138, 45, 0.08);
  transform: scale(0.99);
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

/* 人物列表 - 改为一行显示一个 */
.characters-grid {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.character-card {
  background: var(--surface-2);
  border-radius: 20rpx;
  padding: 24rpx 30rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  border: 1px solid var(--border);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.light-theme .character-card {
  background: var(--surface-2);
}

.character-card:active {
  background: rgba(255, 138, 45, 0.08);
  transform: scale(0.98);
}

.character-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6rpx;
  background: linear-gradient(135deg, var(--accent), #ffb774);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.character-card:active::before {
  opacity: 1;
}

.character-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, var(--accent), #ffb774);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(255, 138, 45, 0.25);
  flex-shrink: 0;
}

.avatar-text {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: bold;
}

.character-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0; /* 允许文字截断 */
}

.character-name {
  font-size: 32rpx;
  font-weight: 600;
  display: block;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.character-role {
  font-size: 26rpx;
  opacity: 0.7;
  display: block;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.character-actions {
  display: flex;
  gap: 12rpx;
  flex-shrink: 0;
}

/* 术语列表 */
.terms-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.term-item {
  background: var(--surface-2);
  border-radius: 18rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border);
  transition: all 0.2s ease;
}

.light-theme .term-item {
  background: var(--surface-2);
}

.term-item:active {
  background: rgba(255, 138, 45, 0.08);
  transform: scale(0.99);
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
  background: var(--surface-2);
  border-radius: 18rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border);
  transition: all 0.2s ease;
}

.light-theme .map-item {
  background: var(--surface-2);
}

.map-item:active {
  background: rgba(255, 138, 45, 0.08);
  transform: scale(0.99);
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
  background: rgba(255, 138, 45, 0.18);
  color: var(--accent);
}

.action-btn.delete {
  background: rgba(255, 67, 54, 0.15);
  color: #ff4336;
}

.action-btn:active {
  transform: scale(0.95);
  background: rgba(255, 138, 45, 0.28);
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
  background: var(--surface-2);
  backdrop-filter: blur(15rpx);
  border-radius: 20rpx;
  border: 1px solid var(--border);
  box-shadow: 0 6rpx 24rpx rgba(0, 0, 0, 0.18);
  position: relative;
  overflow: hidden;
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.inline-back-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background: var(--accent-soft);
  border: 1px solid rgba(255, 107, 53, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.18);
  transition: all 0.22s ease;
}

.inline-back-btn:active {
  transform: scale(0.95);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.24);
}

.light-theme .section-header {
  box-shadow: 0 6rpx 24rpx rgba(0, 0, 0, 0.06);
}

.section-header::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3) 20%,
    rgba(255, 255, 255, 0.3) 80%,
    transparent
  );
}

.section-title {
  font-size: 34rpx;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent-strong), #ffd8ac);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 2rpx 10rpx rgba(255, 138, 45, 0.4);
}

.work-count {
  font-size: 26rpx;
  font-weight: 600;
  padding: 10rpx 20rpx;
  background: var(--accent-soft);
  border-radius: 14rpx;
  border: 1px solid rgba(255, 138, 45, 0.3);
  color: var(--accent);
}

.works-list {
  background: var(--surface-2);
  border-radius: 20rpx;
  overflow: hidden;
  backdrop-filter: blur(10rpx);
  border: 1px solid var(--border);
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
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px rgba(255, 138, 45, 0.35);
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
  background: var(--accent);
  border-color: var(--accent);
  position: relative;
}

.checkbox.checked::after {
  content: "✓";
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
  border-radius: 10rpx;
  background: rgba(255, 67, 54, 0.12);
  transition: all 0.2s ease;
}

.delete-btn:active {
  background: rgba(255, 67, 54, 0.22);
  transform: scale(0.95);
}

.delete-x {
  color: #ff4336;
  font-size: 32rpx;
  font-weight: bold;
}

/* 管理单元格样式 */
.management-cells {
  padding: 20rpx 0;
}

.management-cell {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border-radius: 22rpx;
  padding: 40rpx 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 10rpx 26rpx rgba(255, 138, 45, 0.32);
  transition: all 0.25s ease;
  backdrop-filter: blur(10rpx);
}

.management-cell:active {
  transform: translateY(2rpx);
  box-shadow: 0 6rpx 16rpx rgba(255, 138, 45, 0.45);
}

.cell-text {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 700;
  text-align: center;
  display: block;
  letter-spacing: 0.5rpx;
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
  color: #ffffff;
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
  background: rgba(18, 18, 18, 0.94);
  backdrop-filter: blur(20rpx);
  border-top: 1px solid var(--border);
  padding: 22rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
}

.light-theme .batch-toolbar {
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid var(--border);
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
  background: var(--accent-soft);
  border: 1px solid rgba(255, 138, 45, 0.28);
  border-radius: 18rpx;
  color: var(--accent);
}

.batch-btn image {
  width: 24rpx;
  height: 24rpx;
}

.batch-btn text {
  font-size: 26rpx;
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
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border: none;
  border-radius: 26rpx;
  padding: 20rpx 30rpx;
  box-shadow: 0 10rpx 26rpx rgba(255, 138, 45, 0.32);
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 140rpx;
}

.modern-manage-btn:active {
  transform: translateY(2rpx);
  box-shadow: 0 6rpx 14rpx rgba(255, 138, 45, 0.45);
}

.btn-text {
  color: #ffffff;
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
  background: var(--surface-2);
  border-radius: 16rpx;
  backdrop-filter: blur(10rpx);
  border: 1px solid var(--border);
  transition: all 0.25s ease;
}

.more-btn:active {
  transform: scale(0.95);
  background: rgba(255, 138, 45, 0.08);
}

.more-dots {
  color: var(--text-primary);
  font-size: 32rpx;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 8rpx;
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
  background: var(--surface-2);
  backdrop-filter: blur(20rpx);
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.28);
  border: 1px solid var(--border);
  z-index: 1000;
  min-width: 180rpx;
  animation: slideDown 0.25s ease-out;
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
  border-bottom: 1px solid var(--border);
  transition: all 0.2s ease;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background: rgba(255, 138, 45, 0.08);
}

.menu-text {
  color: var(--text-primary);
  font-size: 28rpx;
  text-align: center;
  display: block;
}

/* 管理内容 */
/* 下方旧的重复样式块已被上方橙黑/橙白主题替换，保留结构无需重复 */

/* 统计卡片 */
.stats-section {
  margin-bottom: 40rpx;
}

.stats-card {
  background: var(--surface-2);
  border-radius: 20rpx;
  padding: 30rpx;
  display: flex;
  justify-content: space-around;
  backdrop-filter: blur(10rpx);
  border: 1px solid var(--border);
  box-shadow: 0 10rpx 26rpx rgba(0, 0, 0, 0.16);
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
  font-weight: 700;
  margin-bottom: 20rpx;
  display: block;
  background: linear-gradient(135deg, var(--accent-strong), #ffd8ac);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.action-item {
  background: var(--surface-2);
  border-radius: 15rpx;
  padding: 30rpx 20rpx;
  text-align: center;
  border: 1px solid var(--border);
  transition: all 0.25s ease;
}

.action-item:active {
  transform: scale(0.98);
  background: rgba(255, 138, 45, 0.08);
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
  color: var(--accent);
  font-weight: 600;
}

.file-list {
  background: var(--surface-2);
  border-radius: 20rpx;
  overflow: hidden;
  backdrop-filter: blur(10rpx);
  border: 1px solid var(--border);
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

.file-actions .action-btn {
  width: 36rpx;
  height: 36rpx;
  padding: 8rpx;
  border-radius: 10rpx;
  background: var(--accent-soft);
  border: 1px solid rgba(255, 138, 45, 0.26);
}

.file-actions .action-btn image {
  width: 100%;
  height: 100%;
}

/* 编辑模态框样式 */
.edit-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 40rpx;
}

.edit-modal-content {
  background: linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%);
  border-radius: 24rpx;
  width: 100%;
  max-width: 600rpx;
  max-height: 80vh;
  overflow-y: auto;
  border: 2px solid rgba(255, 107, 53, 0.3);
  box-shadow: 0 30rpx 80rpx rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  animation: modalSlideUp 0.3s ease-out;
}

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(40rpx) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.edit-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 107, 53, 0.05);
  border-radius: 24rpx 24rpx 0 0;
}

.edit-modal-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.edit-modal-close {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.edit-modal-close:active {
  transform: scale(0.9);
  background: rgba(255, 107, 53, 0.2);
  border-color: rgba(255, 107, 53, 0.4);
}

.edit-modal-body {
  padding: 32rpx;
  background: rgba(255, 255, 255, 0.02);
}

.edit-field {
  margin-bottom: 32rpx;
}

.field-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #ff6b35;
  margin-bottom: 12rpx;
}

.field-input {
  width: 100%;
  height: 88rpx;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  font-size: 30rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  transition: all 0.3s ease;
}

.field-input:focus {
  border-color: #ff6b35;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.2);
}

.field-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.field-textarea {
  width: 100%;
  min-height: 120rpx;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  font-size: 30rpx;
  padding: 20rpx 24rpx;
  box-sizing: border-box;
  transition: all 0.3s ease;
  line-height: 1.5;
}

.field-textarea:focus {
  border-color: #ff6b35;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.2);
}

.field-textarea::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.avatar-upload {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.avatar-upload.vertical {
  flex-direction: column;
  align-items: flex-start;
  gap: 12rpx;
}

.avatar-preview {
  width: 120rpx;
  height: 120rpx;
  border-radius: 16rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.15);
  object-fit: cover;
}

.avatar-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: 16rpx;
  border: 2rpx dashed rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 26rpx;
}

.upload-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-chip {
  padding: 10rpx 16rpx;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 26rpx;
}

.tag-add,
.relation-add {
  padding: 10rpx 16rpx;
  border-radius: 12rpx;
  border: 1px dashed rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.7);
  font-size: 26rpx;
}

.relations-box {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 12rpx;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.04);
}

.relation-item {
  padding: 10rpx 14rpx;
  border-radius: 10rpx;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 26rpx;
}

.disabled-input {
  background: rgba(255, 255, 255, 0.05) !important;
  color: rgba(255, 255, 255, 0.3) !important;
  cursor: not-allowed;
  opacity: 0.6;
}

.edit-modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 24rpx 32rpx 32rpx;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.1);
  border-radius: 0 0 24rpx 24rpx;
}

.modal-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 16rpx;
  border: none;
  font-size: 32rpx;
  font-weight: 500;
  transition: all 0.3s ease;
}

.modal-btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.modal-btn.cancel:active {
  transform: scale(0.96);
  background: rgba(255, 255, 255, 0.15);
}

.modal-btn.save {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  color: #ffffff;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(255, 107, 53, 0.4);
}

.modal-btn.save:active {
  transform: scale(0.96);
  box-shadow: 0 4rpx 12rpx rgba(255, 107, 53, 0.5);
}

.modal-btn:disabled {
  opacity: 0.5;
  transform: none !important;
  box-shadow: none !important;
}

/* 亮色主题适配 */
.light-theme .edit-modal-overlay {
  background: rgba(0, 0, 0, 0.6);
}

.light-theme .edit-modal-content {
  background: linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%);
  border: 2px solid rgba(255, 107, 53, 0.2);
  box-shadow: 0 30rpx 80rpx rgba(0, 0, 0, 0.15);
}

.light-theme .edit-modal-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 107, 53, 0.03);
}

.light-theme .edit-modal-title {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.light-theme .edit-modal-close {
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #333333;
}

.light-theme .edit-modal-close:active {
  background: rgba(255, 107, 53, 0.1);
  border-color: rgba(255, 107, 53, 0.3);
}

.light-theme .edit-modal-body {
  background: rgba(0, 0, 0, 0.01);
}

.light-theme .field-label {
  color: #ff6b35;
}

.light-theme .field-input {
  border: 2px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.02);
  color: #333333;
}

.light-theme .field-input:focus {
  border-color: #ff6b35;
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.15);
}

.light-theme .field-input::placeholder {
  color: rgba(0, 0, 0, 0.3);
}

.light-theme .field-textarea {
  border: 2px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.02);
  color: #333333;
}

.light-theme .field-textarea:focus {
  border-color: #ff6b35;
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.15);
}

.light-theme .field-textarea::placeholder {
  color: rgba(0, 0, 0, 0.3);
}

.light-theme .disabled-input {
  background: rgba(0, 0, 0, 0.03) !important;
  color: rgba(0, 0, 0, 0.3) !important;
}

.light-theme .edit-modal-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.01);
}

.light-theme .modal-btn.cancel {
  background: rgba(0, 0, 0, 0.05);
  color: #333333;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.light-theme .modal-btn.cancel:active {
  background: rgba(0, 0, 0, 0.1);
}
</style>

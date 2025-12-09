<template>
  <view class="create-page" :class="{ 'light-theme': !isDarkMode }">
    <!-- 头部占位栏 - 防止内容与手机状态栏重叠 -->
    <HeaderPlaceholder />
    
    <view class="header">
      <view class="header-titles">
        <text class="title">新增人物\n</text>
        <text class="subtitle">快速记录核心信息，其他细节在编辑页补充</text>
      </view>
      <button class="back-link" @tap="goBack"><</button>
    </view>

    <view class="form-card">
      <view class="section">
        <view class="section-label">
          <text class="label">关联作品</text>
          <text class="badge required">必选</text>
        </view>
        <picker
          mode="selector"
          :range="workOptions"
          range-key="title"
          :value="workIndex"
          @change="handleWorkPick"
          :disabled="worksLoading"
        >
          <view class="picker-field">
            <text v-if="selectedWorkLabel">{{ selectedWorkLabel }}</text>
            <text v-else class="placeholder">请选择作品</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
        <text v-if="workError" class="hint error">{{ workError }}</text>
      </view>
    </view>

    <view class="content-card simple-card">
      <view class="content-header">
        <text class="content-title">人物信息</text>
        <text class="content-hint">仅保留必需字段，稍后可在管理页补充</text>
      </view>

      <view class="field-item">
        <text class="field-label required">姓名</text>
        <textarea
          class="textarea single-line"
          placeholder="请输入姓名"
          auto-height
          maxlength="50"
          v-model="characterForm.name"
        ></textarea>
      </view>

      <view class="field-item">
        <text class="field-label">描述 / 背景（可选）</text>
        <textarea
          class="textarea"
          placeholder="简介、背景或角色定位"
          auto-height
          maxlength="500"
          v-model="characterForm.description"
        ></textarea>
      </view>
    </view>

    <view class="actions-fixed">
      <button
        class="primary-btn"
        :disabled="!canSubmit || isSaving"
        @tap="handleSubmit"
      >
        {{ isSaving ? "保存中..." : "保存" }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import HeaderPlaceholder from "@/components/HeaderPlaceholder.vue";
import FileSystemStorage from "@/utils/fileSystemStorage.js";
import themeManager from "@/utils/themeManager.js";

const fileStorage = FileSystemStorage;

const isDarkMode = ref(themeManager.isDarkMode());
const worksLoading = ref(true);
const workError = ref("");
const works = ref([]);
const workIndex = ref(0);
const selectedWorkId = ref("");
const userId = ref("default_user");

const characterSeedId = ref(`char_${Date.now()}`);

const isSaving = ref(false);

const characterForm = reactive({
  name: "",
  description: "",
});

const workOptions = computed(() =>
  works.value.map((work) => ({
    id: work.id,
    title: work.title || "未命名作品",
  }))
);

const selectedWorkLabel = computed(() => {
  const current = workOptions.value.find(
    (work) => work.id === selectedWorkId.value
  );
  return current ? current.title : "";
});

const characterPayload = computed(() => ({
  id: characterSeedId.value,
  type: "character",
  work_id: selectedWorkId.value || null,
  user_id: userId.value,
  name: characterForm.name.trim(),
  description: characterForm.description.trim() || "",
  avatar: "",
  tags: [],
  relationships: [],
  attributes: {},
  reserved_slots: {
    slot_alpha: null,
    slot_beta: null,
    slot_gamma: null,
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  status: "draft",
}));

const canSubmit = computed(() => {
  return !!selectedWorkId.value && characterForm.name.trim().length > 0;
});

const goBack = () => {
  uni.navigateBack({ delta: 1 });
};

const handleWorkPick = (event) => {
  const index = Number(event.detail.value);
  workIndex.value = index;
  selectedWorkId.value = workOptions.value[index]?.id || "";
};

const loadWorks = async () => {
  worksLoading.value = true;
  workError.value = "";
  try {
    await fileStorage.initUserStorage(userId.value);
    const list = await fileStorage.getUserWorks(userId.value);
    works.value = list || [];
    if (!selectedWorkId.value && list.length > 0) {
      selectedWorkId.value = list[0].id;
      workIndex.value = 0;
    }
  } catch (error) {
    console.error("加载作品失败:", error);
    workError.value = "无法获取作品列表，请稍后重试";
  } finally {
    worksLoading.value = false;
  }
};

const handleSubmit = () => {
  if (!selectedWorkId.value) {
    uni.showToast({
      title: "请选择作品",
      icon: "none",
    });
    return;
  }
  if (isSaving.value) return;
  isSaving.value = true;
  persistCharacter(characterPayload.value)
    .then(() => {
      uni.showToast({
        title: "已保存",
        icon: "success",
      });
      setTimeout(() => {
        goBack();
      }, 800);
    })
    .catch((error) => {
      console.error("保存人物失败:", error);
      uni.showToast({
        title: "保存失败，请重试",
        icon: "none",
      });
    })
    .finally(() => {
      isSaving.value = false;
    });
};

const persistCharacter = async (data) => {
  if (!selectedWorkId.value) throw new Error("缺少作品 ID");
  const workPath = fileStorage.getWorkPath(userId.value, selectedWorkId.value);
  if (!workPath) throw new Error("无法定位作品路径");

  const characterDir = `${workPath}/characters`;
  const characterFile = `${characterDir}/characters.json`;

  fileStorage.mkdirIfNotExists(characterDir);

  let list = await fileStorage.readFile(characterFile);
  if (!Array.isArray(list)) {
    list = [];
  }

  const index = list.findIndex((item) => item.id === data.id);
  if (index >= 0) {
    list[index] = data;
  } else {
    list.push(data);
  }

  fileStorage.writeFile(characterFile, list);
};

onLoad((options) => {
  if (options?.userId) {
    userId.value = options.userId;
  }
  if (options?.workId) {
    selectedWorkId.value = options.workId;
  }
});

onMounted(() => {
  loadWorks();
  try {
    if (typeof uni !== "undefined" && uni.$on) {
      uni.$on("theme-changed", (themeData) => {
        isDarkMode.value = themeData.isDark;
      });
    }
  } catch (error) {
    console.warn("主题监听失败:", error);
  }
});
</script>

<style scoped>
.create-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  padding: 16px;
  box-sizing: border-box;
  color: #e0e0e0;
}

.create-page.light-theme {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  color: #333;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.title {
  font-size: 26px;
  font-weight: 700;
  color: inherit;
}

.subtitle {
  font-size: 14px;
  opacity: 0.6;
  line-height: 1.5;
  color: inherit;
}

.back-link {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: inherit;
  font-size: 16px;
  padding: 8px 16px;
  border-radius: 16px;
  min-width: 44px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.create-page.light-theme .back-link {
  border: 1px solid rgba(0, 0, 0, 0.2);
  color: inherit;
}

.form-card,
.content-card {
  background: rgba(26, 26, 26, 0.7);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
}

.create-page.light-theme .form-card,
.create-page.light-theme .content-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(20px);
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.label {
  font-size: 14px;
  font-weight: 500;
  color: inherit;
}

.badge {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
  background: rgba(255, 107, 53, 0.2);
  color: #ff6b35;
  font-weight: 500;
}

.picker-field {
  height: 48px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 14px;
  background: rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
  color: inherit;
}

.create-page.light-theme .picker-field {
  border-color: rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.8);
}

.placeholder {
  opacity: 0.6;
  color: inherit;
}

.picker-arrow {
  font-size: 20px;
  opacity: 0.4;
  color: inherit;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.content-title {
  font-size: 16px;
  font-weight: 600;
  color: inherit;
}

.content-hint {
  font-size: 12px;
  opacity: 0.6;
  color: inherit;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: inherit;
}

.field-label.required::after {
  content: " *";
  color: #ff6b35;
}

.textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.2);
  color: inherit;
  padding: 10px 12px;
  font-size: 14px;
  box-sizing: border-box;
}

.textarea.single-line {
  min-height: 48px;
}

.create-page.light-theme .textarea {
  border-color: rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.9);
}

.actions-fixed {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 0 8px;
  background: inherit;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.primary-btn {
  height: 44px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  border: none;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
  transition: all 0.3s ease;
}

.primary-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
}

.primary-btn:disabled {
  opacity: 0.5;
  transform: none;
  box-shadow: none;
}

.create-page.light-theme .primary-btn {
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}
</style>

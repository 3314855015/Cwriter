<template>
  <view class="page" :class="{ 'light-theme': !isDarkMode }">
    <HeaderPlaceholder />
    <view class="header">
      <text class="title">选择关系人物</text>
      <text class="subtitle">选择人物并填写关系描述（必填）</text>
    </view>

    <scroll-view scroll-y class="list">
      <view
        v-for="char in characters"
        :key="char.id"
        class="item"
        :class="{ active: selectedId === char.id }"
        @tap="select(char)"
      >
        <text class="name">{{ char.name || '未命名人物' }}</text>
        <text class="desc">{{ char.description || '暂无描述' }}</text>
        <text class="check">{{ selectedId === char.id ? '✔' : '' }}</text>
      </view>
      <view v-if="characters.length === 0" class="empty">暂无人物可选</view>
    </scroll-view>

    <view class="input-box">
      <text class="label">关系描述（必填）</text>
      <textarea
        class="relation-input"
        v-model="relationText"
        placeholder="如：师徒 / 同事 / 亲属..."
        maxlength="100"
        :auto-height="true"
      ></textarea>
    </view>

    <view class="footer">
      <button class="btn cancel" @tap="goBack">取消</button>
      <button class="btn primary" :disabled="!canSubmit" @tap="confirm">
        确定
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import HeaderPlaceholder from "@/components/HeaderPlaceholder.vue";
import FileSystemStorage from "@/utils/fileSystemStorage.js";
import themeManager from "@/utils/themeManager.js";

const fileStorage = FileSystemStorage;

const isDarkMode = ref(themeManager.isDarkMode());
const userId = ref("");
const workId = ref("");
const selfId = ref("");
const characters = ref([]);
const selectedId = ref("");
const selectedName = ref("");
const relationText = ref("");
let eventChannel = null;

const canSubmit = computed(
  () => !!selectedId.value && relationText.value.trim().length > 0
);

onLoad((options) => {
  userId.value = options?.userId || "default_user";
  workId.value = options?.workId || "";
  selfId.value = options?.selfId || "";
  const selected = options?.selected
    ? JSON.parse(decodeURIComponent(options.selected))
    : [];
  if (Array.isArray(selected) && selected.length > 0) {
    const first = selected[0];
    selectedId.value = first.id || "";
    selectedName.value = first.name || "";
    relationText.value = first.relation || first.desc || "";
  }
  eventChannel = getOpenerEventChannel && getOpenerEventChannel();
});

onMounted(async () => {
  try {
    const list = await fileStorage.getCharacters(userId.value, workId.value);
    characters.value = Array.isArray(list)
      ? list.filter((c) => c.id !== selfId.value)
      : [];
  } catch (e) {
    console.error("加载人物失败", e);
    characters.value = [];
  }
});

const select = (char) => {
  selectedId.value = char.id;
  selectedName.value = char.name || "未命名人物";
};

const confirm = () => {
  if (!canSubmit.value) {
    uni.showToast({ title: "请选择人物并填写关系", icon: "none" });
    return;
  }
  eventChannel?.emit("relationSelected", {
    id: selectedId.value,
    name: selectedName.value,
    relation: relationText.value.trim(),
  });
  goBack();
};

const goBack = () => {
  uni.navigateBack();
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  color: #e0e0e0;
  padding: 16px;
  box-sizing: border-box;
}

.light-theme {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  color: #333;
}

.header {
  margin: 12px 0 16px;
}

.title {
  font-size: 20px;
  font-weight: 700;
}

.subtitle {
  font-size: 14px;
  opacity: 0.7;
  display: block;
  margin-top: 4px;
}

.list {
  max-height: calc(100vh - 240px);
}

.item {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item.active {
  border-color: #ff6b35;
  background: rgba(255, 107, 53, 0.12);
}

.name {
  font-size: 16px;
  font-weight: 600;
  color: inherit;
}

.desc {
  font-size: 13px;
  opacity: 0.7;
}

.check {
  align-self: flex-end;
  color: #ff6b35;
}

.empty {
  text-align: center;
  opacity: 0.6;
  padding: 30px 0;
}

.input-box {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 14px;
  font-weight: 500;
}

.relation-input {
  min-height: 80px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.2);
  color: inherit;
  padding: 10px 12px;
  box-sizing: border-box;
}

.footer {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.btn {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  border: none;
}

.btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
}

.btn.primary {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
  color: #fff;
}
</style>


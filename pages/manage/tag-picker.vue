<template>
  <view class="page" :class="{ 'light-theme': !isDarkMode }">
    <HeaderPlaceholder />
    <view class="header">
      <text class="title">选择标签</text>
      <text class="subtitle">从设定列表多选</text>
    </view>

    <scroll-view scroll-y class="list">
      <view
        v-for="term in terms"
        :key="term.id"
        class="item"
        :class="{ active: selectedSet.has(term.name) }"
        @tap="toggle(term.name)"
      >
        <text class="name">{{ term.name || '未命名设定' }}</text>
        <text class="desc">{{ term.description || '暂无描述' }}</text>
        <text class="check">{{ selectedSet.has(term.name) ? '✔' : '' }}</text>
      </view>
      <view v-if="terms.length === 0" class="empty">暂无设定可选</view>
    </scroll-view>

    <view class="footer">
      <button class="btn cancel" @tap="goBack">取消</button>
      <button class="btn primary" @tap="confirm">确定</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import HeaderPlaceholder from "@/components/HeaderPlaceholder.vue";
import FileSystemStorage from "@/utils/fileSystemStorage.js";
import themeManager from "@/utils/themeManager.js";

const fileStorage = FileSystemStorage;

const isDarkMode = ref(themeManager.isDarkMode());
const userId = ref("");
const workId = ref("");
const terms = ref([]);
const selectedSet = ref(new Set());
let eventChannel = null;

onLoad((options) => {
  userId.value = options?.userId || "default_user";
  workId.value = options?.workId || "";
  const preSelected = options?.selected
    ? JSON.parse(decodeURIComponent(options.selected))
    : [];
  selectedSet.value = new Set(preSelected);

  eventChannel = getOpenerEventChannel && getOpenerEventChannel();
});

onMounted(async () => {
  try {
    const list = await fileStorage.getTerms(userId.value, workId.value);
    terms.value = Array.isArray(list) ? list : [];
  } catch (e) {
    console.error("加载设定失败", e);
    terms.value = [];
  }
});

const toggle = (name) => {
  if (!name) return;
  if (selectedSet.value.has(name)) {
    selectedSet.value.delete(name);
  } else {
    selectedSet.value.add(name);
  }
  selectedSet.value = new Set(selectedSet.value);
};

const confirm = () => {
  eventChannel?.emit("tagsSelected", {
    tags: Array.from(selectedSet.value),
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
  max-height: calc(100vh - 180px);
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

.footer {
  display: flex;
  gap: 10px;
  margin-top: 12px;
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


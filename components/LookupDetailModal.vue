<template>
  <view class="lookup-overlay" @tap="onClose">
    <view class="lookup-modal" @tap.stop>
      <view class="lookup-header">
        <text class="lookup-title">{{
          type === "character" ? "人物详情" : "设定详情"
        }}</text>
        <view class="lookup-close-btn" @tap="onClose">
          <text>关闭</text>
        </view>
      </view>

      <view v-if="type === 'character'" class="lookup-body">
        <view class="lookup-row avatar-row">
          <image
            v-if="item.avatar"
            class="lookup-avatar"
            :src="item.avatar"
            mode="aspectFill"
          />
          <view v-else class="lookup-avatar placeholder">
            <text>无头像</text>
          </view>
          <view class="lookup-main">
            <text class="lookup-name">{{
              item.name || item.title || "未命名"
            }}</text>
            <text class="lookup-desc">{{
              item.description || "暂无描述"
            }}</text>
          </view>
        </view>

        <view class="lookup-section">
          <text class="section-label">标签</text>
          <view v-if="item.tags && item.tags.length" class="tag-list">
            <view v-for="tag in item.tags" :key="tag" class="tag-pill">
              <text>{{ tag }}</text>
            </view>
          </view>
          <text v-else class="section-empty">暂无标签</text>
        </view>

        <view class="lookup-section">
          <text class="section-label">关系</text>
          <view
            v-if="item.relationships && item.relationships.length"
            class="relation-list"
          >
            <view
              v-for="rel in item.relationships"
              :key="rel.id || rel.name || rel.relation"
              class="relation-item"
            >
              <text class="relation-name">{{ rel.name || "未命名" }}</text>
              <text class="relation-type">{{
                rel.relation || "关系未知"
              }}</text>
            </view>
          </view>
          <text v-else class="section-empty">暂无关系</text>
        </view>
      </view>

      <view v-else class="lookup-body">
        <view class="lookup-row">
          <view class="lookup-main">
            <text class="lookup-name">{{
              item.name || item.title || "未命名"
            }}</text>
            <text class="lookup-desc">{{
              item.description || "暂无描述"
            }}</text>
          </view>
        </view>
      </view>

      <view class="lookup-footer">
        <view class="lookup-close" @tap="onClose">
          <text>我知道了</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  show: { type: Boolean, default: false },
  type: { type: String, default: "character" }, // character | term
  item: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["close"]);

const onClose = () => emit("close");
</script>

<style scoped>
.lookup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lookup-modal {
  width: 88%;
  max-width: 620px;
  background: rgba(26, 26, 26, 0.96);
  border-radius: 16px;
  padding: 16px;
  box-sizing: border-box;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.lookup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.lookup-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.lookup-close-btn {
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 12px;
}

.lookup-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lookup-row {
  display: flex;
  gap: 12px;
}

.avatar-row {
  align-items: center;
}

.lookup-avatar {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
}

.lookup-avatar.placeholder {
  align-items: center;
  justify-content: center;
  display: flex;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.lookup-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lookup-name {
  font-size: 17px;
  font-weight: 700;
  color: #fff;
}

.lookup-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
}

.lookup-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.section-empty {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-pill {
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(0, 122, 255, 0.15);
  border: 1px solid rgba(0, 122, 255, 0.25);
  color: #80b8ff;
  font-size: 12px;
}

.relation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relation-item {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.relation-name {
  font-size: 14px;
  color: #fff;
}

.relation-type {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.lookup-footer {
  margin-top: 12px;
}

.lookup-close {
  padding: 12px 0;
  text-align: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

@media (prefers-color-scheme: light) {
  .lookup-modal {
    background: rgba(255, 255, 255, 0.96);
  }
  .lookup-title,
  .lookup-name {
    color: #111;
  }
  .lookup-close-btn,
  .lookup-close {
    background: rgba(0, 0, 0, 0.06);
    color: #111;
  }
  .lookup-desc,
  .section-label {
    color: rgba(0, 0, 0, 0.75);
  }
  .section-empty {
    color: rgba(0, 0, 0, 0.55);
  }
  .relation-item {
    background: rgba(0, 0, 0, 0.04);
  }
  .relation-name {
    color: #111;
  }
  .relation-type {
    color: rgba(0, 0, 0, 0.65);
  }
}
</style>

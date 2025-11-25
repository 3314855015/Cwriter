<template>
  <view class="map-visualizer" :class="{ 'light-theme': !isDarkMode }">
    <!-- 工具栏 -->
    <view class="toolbar">
      <button class="tool-btn" @tap="addNewNode">
        <text>添加</text>
      </button>
      <button class="tool-btn" @tap="showTextInput = true">
        <text>生成</text>
      </button>
      <button class="tool-btn" @tap="showRoutePanel = true">
        <text>路线</text>
      </button>
      <button class="tool-btn" @tap="resetView">
        <text>重置</text>
      </button>
    </view>

    <!-- 画布容器 -->
    <view
      class="canvas-container"
      @touchstart="handleCanvasTouch"
      @touchmove="handleCanvasMove"
      @touchend="handleCanvasEnd"
    >
      <canvas
        canvas-id="mapCanvas"
        :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
      ></canvas>
    </view>

    <!-- 节点详情面板（悬浮模态框） -->
    <view v-if="selectedNode" class="node-panel-modal" @tap.stop>
      <view class="modal-content">
        <view class="panel-header">
          <view class="info-item">
            <text class="info-label">节点名称：</text>
            <input
              v-model="selectedNode.name"
              class="info-input"
              placeholder="输入节点名称"
              @blur="updateNode"
            />
          </view>
          <button class="close-btn" @tap="selectedNode = null">×</button>
        </view>
        <view class="panel-content">
          <view class="info-item">
            <text class="info-label">描述：</text>
            <textarea
              v-model="selectedNode.description"
              class="info-input"
              placeholder="输入节点描述"
              @blur="updateNode"
            ></textarea>
          </view>
          <view class="panel-actions">
            <button class="action-btn primary" @tap="addSiblingNode">
              <text>+ 同级节点</text>
            </button>
            <button class="action-btn primary" @tap="addChildNode">
              <text>+ 子节点</text>
            </button>
            <button class="action-btn danger" @tap="deleteNode">
              <text>删除节点</text>
            </button>
          </view>
        </view>
      </view>
    </view>

    <!-- 文本输入模态框 -->
    <view
      v-if="showTextInput"
      class="modal-overlay"
      @tap="showTextInput = false"
    >
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">描述生成节点</text>
          <button class="close-btn" @tap="showTextInput = false">×</button>
        </view>
        <view class="modal-body">
          <textarea
            v-model="textInput"
            class="text-input"
            placeholder="例如：教学楼连着食堂，食堂旁边是操场"
            :auto-height="true"
          ></textarea>
        </view>
        <view class="modal-footer">
          <button class="modal-btn" @tap="generateFromText">生成节点</button>
          <button class="modal-btn secondary" @tap="showTextInput = false">
            取消
          </button>
        </view>
      </view>
    </view>

    <!-- 路线规划面板 -->
    <view
      v-if="showRoutePanel"
      class="modal-overlay"
      @tap="showRoutePanel = false"
    >
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">智能路线规划</text>
          <button class="close-btn" @tap="showRoutePanel = false">×</button>
        </view>
        <view class="modal-body">
          <view class="route-selector">
            <text class="selector-label">起点：</text>
            <picker
              mode="selector"
              :range="topLevelNodes"
              range-key="name"
              :value="routeStartIndex"
              @change="handleRouteStartChange"
            >
              <view class="picker-display">{{
                routeStart?.name || "选择起点"
              }}</view>
            </picker>
          </view>
          <view class="route-selector">
            <text class="selector-label">终点：</text>
            <picker
              mode="selector"
              :range="topLevelNodes"
              range-key="name"
              :value="routeEndIndex"
              @change="handleRouteEndChange"
            >
              <view class="picker-display">{{
                routeEnd?.name || "选择终点"
              }}</view>
            </picker>
          </view>
          <view v-if="routePath.length > 0" class="route-result">
            <text class="result-label">路线：</text>
            <text class="result-path">{{ routePath.join(" → ") }}</text>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn" @tap="calculateRoute">计算路线</button>
          <button class="modal-btn secondary" @tap="showRoutePanel = false">
            关闭
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  getCurrentInstance,
} from "vue";
import themeManager from "@/utils/themeManager.js";

const instance = getCurrentInstance();

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false,
  },
  initialData: {
    type: Object,
    default: () => null,
  },
});

const emit = defineEmits(["update:data"]);

// 画布相关
const canvasWidth = ref(750);
const canvasHeight = ref(600);
let ctx = null;
let canvas = null;

// 数据模型
const nodes = ref([]);
const edges = ref([]);
const selectedNode = ref(null);
const draggedNode = ref(null);
const dragOffset = ref({ x: 0, y: 0 });

// UI状态
const showTextInput = ref(false);
const showRoutePanel = ref(false);
const textInput = ref("");

// 路线规划
const routeStart = ref(null);
const routeEnd = ref(null);
const routeStartIndex = ref(0);
const routeEndIndex = ref(0);
const routePath = ref([]);

// 计算属性
const topLevelNodes = computed(() => {
  return nodes.value.filter((node) => !node.parentId);
});

// 初始化画布
const initCanvas = () => {
  nextTick(() => {
    // 创建canvas上下文
    canvas = uni.createCanvasContext("mapCanvas", instance);
    ctx = canvas;

    // 延迟绘制确保canvas已初始化
    setTimeout(() => {
      // 先更新位置信息，获取实际 Canvas 尺寸
      updateCanvasRect(() => {
        // 确保 canvasWidth 和 canvasHeight 已更新
        if (canvasRect.value.width > 0) {
          canvasWidth.value = canvasRect.value.width;
        }
        if (canvasRect.value.height > 0) {
          canvasHeight.value = canvasRect.value.height;
        }

        // 然后初始化数据（使用实际尺寸）
        if (props.initialData) {
          loadData(props.initialData);
        } else {
          // 默认示例数据（此时 canvasWidth 和 canvasHeight 已更新）
          initDefaultData();
        }

        // 标准化所有节点位置
        normalizePositions();

        // 绘制
        draw();

        // 再次更新，确保位置准确（使用 nextTick 确保 DOM 已更新）
        nextTick(() => {
          updateCanvasRect(() => {
            // 再次标准化，确保所有节点都在画布内
            normalizePositions();
            draw();
            console.log("Canvas初始化完成，位置:", canvasRect.value, "尺寸:", {
              w: canvasWidth.value,
              h: canvasHeight.value,
            });
          });
        });
      });
    }, 300);
  });
};

// 初始化默认数据
const initDefaultData = () => {
  // 使用实际 Canvas 尺寸来设置节点位置
  const width = canvasWidth.value;
  const height = canvasHeight.value;
  const margin = 50;

  nodes.value = [
    {
      id: "1",
      name: "教学楼",
      x: Math.max(margin, Math.min(width - margin, width * 0.3)),
      y: Math.max(margin, Math.min(height - margin, height * 0.5)),
      description: "",
      parentId: null,
      collapsed: false,
    },
    {
      id: "2",
      name: "食堂",
      x: Math.max(margin, Math.min(width - margin, width * 0.7)),
      y: Math.max(margin, Math.min(height - margin, height * 0.5)),
      description: "",
      parentId: null,
      collapsed: false,
    },
  ];
  edges.value = [{ id: "e1", source: "1", target: "2", type: "sibling" }];
};

// 加载数据
const loadData = (data) => {
  if (data.nodes) nodes.value = data.nodes;
  if (data.edges) edges.value = data.edges;
  normalizePositions();
};

// 标准化位置（确保节点在画布内）
const normalizePositions = () => {
  // 确保使用实际 Canvas 尺寸
  const width = canvasWidth.value;
  const height = canvasHeight.value;
  const margin = 30;
  const maxX = width - margin;
  const maxY = height - margin;

  console.log("标准化位置 - Canvas尺寸:", {
    width,
    height,
    maxX,
    maxY,
    nodeCount: nodes.value.length,
  });

  nodes.value.forEach((node, index) => {
    const beforeX = node.x;
    const beforeY = node.y;

    if (!node.x || node.x <= 0) node.x = Math.random() * (width - 100) + 50;
    if (!node.y || node.y <= 0) node.y = Math.random() * (height - 100) + 50;

    // 确保节点在画布内，留出边距
    node.x = Math.max(margin, Math.min(maxX, node.x));
    node.y = Math.max(margin, Math.min(maxY, node.y));

    // 如果节点超出边界，强制拉回并记录
    if (
      beforeX > maxX ||
      beforeX < margin ||
      beforeY > maxY ||
      beforeY < margin
    ) {
      console.log(`修复节点 ${index} (${node.name}) 位置:`, {
        before: { x: beforeX, y: beforeY },
        after: { x: node.x, y: node.y },
        canvasSize: { w: width, h: height },
        maxX,
        maxY,
        margin,
      });
      node.x = Math.max(margin, Math.min(maxX, node.x));
      node.y = Math.max(margin, Math.min(maxY, node.y));
    }
  });

  console.log(
    "标准化完成，所有节点位置:",
    nodes.value.map((n) => ({ name: n.name, x: n.x, y: n.y }))
  );
};

// 绘制
const draw = () => {
  if (!ctx) return;

  // 清空画布
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);

  // 应用缩放和偏移变换
  ctx.save();
  ctx.translate(viewOffsetX.value, viewOffsetY.value);
  ctx.scale(viewScale.value, viewScale.value);

  // 绘制背景
  ctx.setFillStyle(props.isDarkMode ? "#1a1a1a" : "#f5f5f5");
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);

  // 绘制边
  edges.value.forEach((edge) => {
    const sourceNode = nodes.value.find((n) => n.id === edge.source);
    const targetNode = nodes.value.find((n) => n.id === edge.target);
    if (sourceNode && targetNode) {
      drawEdge(sourceNode, targetNode, edge);
    }
  });

  // 绘制节点
  nodes.value.forEach((node) => {
    if (!node.parentId || !isParentCollapsed(node.parentId)) {
      drawNode(node);
    }
  });

  // 绘制路线高亮
  if (routePath.value.length > 1) {
    drawRouteHighlight();
  }

  // 恢复变换
  ctx.restore();

  ctx.draw();
};

// 绘制节点
const drawNode = (node) => {
  const isSelected = selectedNode.value?.id === node.id;
  const radius = 30;

  // 节点背景
  ctx.setFillStyle(
    isSelected ? "#ff6b35" : props.isDarkMode ? "#4a4a4a" : "#ffffff"
  );
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
  ctx.fill();

  // 节点边框
  ctx.setStrokeStyle(
    isSelected ? "#ff8a65" : props.isDarkMode ? "#666" : "#ddd"
  );
  ctx.setLineWidth(2);
  ctx.stroke();

  // 节点文字
  ctx.setFillStyle(props.isDarkMode ? "#fff" : "#333");
  ctx.setFontSize(12);
  ctx.setTextAlign("center");
  ctx.setTextBaseline("middle");
  ctx.fillText(node.name, node.x, node.y);

  // 如果有子节点，显示折叠/展开标记
  const hasChildren = nodes.value.some((n) => n.parentId === node.id);
  if (hasChildren) {
    ctx.setFillStyle(props.isDarkMode ? "#fff" : "#333");
    ctx.setFontSize(16);
    ctx.fillText(
      node.collapsed ? "+" : "-",
      node.x + radius - 8,
      node.y - radius + 8
    );
  }
};

// 绘制边
const drawEdge = (source, target, edge) => {
  ctx.setStrokeStyle(props.isDarkMode ? "#666" : "#999");
  ctx.setLineWidth(2);
  ctx.beginPath();
  ctx.moveTo(source.x, source.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();

  // 绘制箭头
  const angle = Math.atan2(target.y - source.y, target.x - source.x);
  const arrowLength = 10;
  const arrowAngle = Math.PI / 6;

  ctx.beginPath();
  ctx.moveTo(target.x, target.y);
  ctx.lineTo(
    target.x - arrowLength * Math.cos(angle - arrowAngle),
    target.y - arrowLength * Math.sin(angle - arrowAngle)
  );
  ctx.moveTo(target.x, target.y);
  ctx.lineTo(
    target.x - arrowLength * Math.cos(angle + arrowAngle),
    target.y - arrowLength * Math.sin(angle + arrowAngle)
  );
  ctx.stroke();
};

// 绘制路线高亮
const drawRouteHighlight = () => {
  for (let i = 0; i < routePath.value.length - 1; i++) {
    const sourceId = routePath.value[i];
    const targetId = routePath.value[i + 1];
    const sourceNode = nodes.value.find((n) => n.id === sourceId);
    const targetNode = nodes.value.find((n) => n.id === targetId);

    if (sourceNode && targetNode) {
      ctx.setStrokeStyle("#ff6b35");
      ctx.setLineWidth(4);
      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.stroke();
    }
  }
};

// 检查父节点是否折叠
const isParentCollapsed = (parentId) => {
  const parent = nodes.value.find((n) => n.id === parentId);
  return parent?.collapsed || false;
};

// Canvas 元素位置信息
const canvasRect = ref({ left: 0, top: 0, width: 750, height: 600 });

// 触摸状态
const touchState = ref({
  startTime: 0,
  startX: 0,
  startY: 0,
  isDragging: false,
  longPressTimer: null,
  dragTimer: null,
  // 缩放相关
  isZooming: false,
  initialDistance: 0,
  initialScale: 1,
});

// 视图缩放和偏移
const viewScale = ref(1);
const viewOffsetX = ref(0);
const viewOffsetY = ref(0);

// 获取 Canvas 实际位置
const updateCanvasRect = (callback) => {
  const query = uni.createSelectorQuery().in(instance);
  query
    .select("canvas")
    .boundingClientRect((rect) => {
      if (rect) {
        canvasRect.value = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
        // 如果 canvas 尺寸未设置，使用容器尺寸
        if (canvasWidth.value === 750) {
          canvasWidth.value = rect.width || 750;
        }
        if (canvasHeight.value === 600) {
          canvasHeight.value = rect.height || 600;
        }

      }
      if (callback) callback();
    })
    .exec();
};

// 将触摸坐标转换为 Canvas 坐标
const getCanvasCoordinates = (e, touch) => {
  if (!e && !touch) return { x: 0, y: 0 };

  let x = 0;
  let y = 0;

  // uni-app Canvas 触摸事件的坐标获取方式
  // 方法1: 直接从 e.detail 获取（Canvas 特有，坐标相对于 Canvas）
  if (e && e.detail) {
    x = e.detail.x !== undefined ? e.detail.x : 0;
    y = e.detail.y !== undefined ? e.detail.y : 0;
    if (x > 0 || y > 0) {
      console.log("从 e.detail 获取坐标:", { x, y });
      return {
        x: Math.max(0, Math.min(canvasWidth.value, x)),
        y: Math.max(0, Math.min(canvasHeight.value, y)),
      };
    }
  }

  // 方法2: 从 touch 对象获取
  if (touch) {
    // 优先使用 x, y（Canvas 相对坐标，uni-app Canvas 直接提供）
    if (touch.x !== undefined && touch.x > 0) {
      x = touch.x;
      y = touch.y !== undefined ? touch.y : 0;
      console.log("从 touch.x/y 获取坐标:", { x, y });
      return {
        x: Math.max(0, Math.min(canvasWidth.value, x)),
        y: Math.max(0, Math.min(canvasHeight.value, y)),
      };
    }

    // 如果没有 x, y，尝试 clientX, clientY（页面坐标）
    if (touch.clientX !== undefined && touch.clientX > 0) {
      x = touch.clientX;
      y = touch.clientY !== undefined ? touch.clientY : 0;

      // 转换为 Canvas 相对坐标
      if (canvasRect.value.width > 0 && canvasRect.value.height > 0) {
        x = x - canvasRect.value.left;
        y = y - canvasRect.value.top;

        // 考虑 Canvas 的实际渲染尺寸（如果 Canvas 有缩放）
        const scaleX = canvasWidth.value / canvasRect.value.width;
        const scaleY = canvasHeight.value / canvasRect.value.height;
        x = x * scaleX;
        y = y * scaleY;

        // console.log("从 touch.clientX/Y 转换坐标:", {
        //   client: { x: touch.clientX, y: touch.clientY },
        //   canvas: { x, y },
        //   rect: canvasRect.value,
        // });
      }
    }
  }

  // 方法3: 从 changedTouches 获取
  if (
    x === 0 &&
    y === 0 &&
    e &&
    e.changedTouches &&
    e.changedTouches.length > 0
  ) {
    const changedTouch = e.changedTouches[0];
    if (changedTouch.x !== undefined && changedTouch.x > 0) {
      x = changedTouch.x;
      y = changedTouch.y !== undefined ? changedTouch.y : 0;
      console.log("从 changedTouches 获取坐标:", { x, y });
    } else if (changedTouch.clientX !== undefined && changedTouch.clientX > 0) {
      x = changedTouch.clientX - (canvasRect.value.left || 0);
      y = changedTouch.clientY - (canvasRect.value.top || 0);
      console.log("从 changedTouches.clientX/Y 转换坐标:", { x, y });
    }
  }

  return {
    x: Math.max(0, Math.min(canvasWidth.value, x)),
    y: Math.max(0, Math.min(canvasHeight.value, y)),
  };
};

// 计算两点之间的距离
const getDistance = (touch1, touch2) => {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

// 触摸事件处理
const handleCanvasTouch = (e) => {
  if (!e) {
    console.log("触摸事件为空");
    return;
  }

  // 阻止默认行为
  e.preventDefault && e.preventDefault();

  // 检测双指触摸（缩放）
  if (e.touches && e.touches.length === 2) {
    touchState.value.isZooming = true;
    touchState.value.isDragging = false;

    // 清除拖动相关定时器
    if (touchState.value.longPressTimer) {
      clearTimeout(touchState.value.longPressTimer);
      touchState.value.longPressTimer = null;
    }
    if (touchState.value.dragTimer) {
      clearTimeout(touchState.value.dragTimer);
      touchState.value.dragTimer = null;
    }

    // 记录初始距离和缩放
    touchState.value.initialDistance = getDistance(e.touches[0], e.touches[1]);
    touchState.value.initialScale = viewScale.value;
    console.log("双指缩放开始:", {
      distance: touchState.value.initialDistance,
      scale: touchState.value.initialScale,
    });
    return;
  }

  // 单指触摸处理
  touchState.value.isZooming = false;
  console.log("触摸事件触发:", e);

  // uni-app Canvas 的触摸事件坐标可能在 e.detail 中，而不是 e.touches
  let x = 0;
  let y = 0;
  let touch = null;

  // 方法1: 直接从 e.detail 获取（Canvas 特有，坐标相对于 Canvas）
  if (e.detail) {
    x = e.detail.x !== undefined ? e.detail.x : 0;
    y = e.detail.y !== undefined ? e.detail.y : 0;
    console.log("从 e.detail 获取坐标:", { x, y, detail: e.detail });
  }

  // 方法2: 从 touches 获取
  if (x === 0 && y === 0 && e.touches && e.touches.length > 0) {
    touch = e.touches[0];
    // 优先使用 x, y（Canvas 相对坐标）
    if (touch.x !== undefined && touch.x > 0) {
      x = touch.x;
      y = touch.y !== undefined ? touch.y : 0;
    } else if (touch.clientX !== undefined) {
      // clientX/clientY 是页面坐标，需要转换
      x = touch.clientX;
      y = touch.clientY !== undefined ? touch.clientY : 0;
    }
    console.log("从 e.touches 获取坐标:", {
      x,
      y,
      touch,
      isPageCoordinate: !!touch.clientX,
    });
  }

  // 方法3: 从 changedTouches 获取
  if (x === 0 && y === 0 && e.changedTouches && e.changedTouches.length > 0) {
    touch = e.changedTouches[0];
    x =
      touch.x !== undefined
        ? touch.x
        : touch.clientX !== undefined
        ? touch.clientX
        : 0;
    y =
      touch.y !== undefined
        ? touch.y
        : touch.clientY !== undefined
        ? touch.clientY
        : 0;
    console.log("从 e.changedTouches 获取坐标:", { x, y, touch });
  }

  if (x === 0 && y === 0) {
    // uni-app 的触摸事件在容器上时，应该能从 touches 获取
    // 如果还是找不到，尝试从事件对象的其他属性获取
    const possibleX =
      e.x || e.clientX || e.pageX || e.offsetX || e.layerX || e.detail?.x;
    const possibleY =
      e.y || e.clientY || e.pageY || e.offsetY || e.layerY || e.detail?.y;

    if (possibleX !== undefined && possibleX !== null && possibleX > 0) {
      x = possibleX;
      y = possibleY !== undefined && possibleY !== null ? possibleY : 0;
      console.log("从事件对象直接属性获取坐标:", {
        x,
        y,
        possibleX,
        possibleY,
      });
    } else {
      console.log("无法从事件对象获取坐标");
      console.log("事件对象详情:", {
        hasDetail: !!e.detail,
        detailContent: e.detail,
        hasTouches: !!(e.touches && e.touches.length > 0),
        hasChangedTouches: !!(e.changedTouches && e.changedTouches.length > 0),
        eventKeys: Object.keys(e),
        type: e.type,
        timeStamp: e.timeStamp,
        touches: e.touches,
        changedTouches: e.changedTouches,
      });
      return;
    }
  }

  console.log("获取到的坐标（原始）:", {
    x,
    y,
    canvasRect: canvasRect.value,
    hasTouch: !!touch,
    touchClientX: touch?.clientX,
  });

  // 如果坐标是页面坐标（clientX/clientY），需要转换为 Canvas 坐标
  if (canvasRect.value.width > 0 && canvasRect.value.height > 0) {
    // 判断是否是页面坐标：如果 touch 对象存在且包含 clientX，说明是页面坐标
    const isPageCoordinate = touch && touch.clientX !== undefined;

    if (isPageCoordinate) {
      // 转换为相对于 Canvas 的坐标
      const beforeConvert = { x, y };
      x = x - canvasRect.value.left;
      y = y - canvasRect.value.top;
      console.log("转换为 Canvas 相对坐标:", {
        before: beforeConvert,
        after: { x, y },
        rect: canvasRect.value,
      });
    }

    // 考虑 Canvas 的实际渲染尺寸（如果 Canvas 有缩放）
    const scaleX = canvasWidth.value / canvasRect.value.width;
    const scaleY = canvasHeight.value / canvasRect.value.height;
    if (Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01) {
      const beforeScale = { x, y };
      x = x * scaleX;
      y = y * scaleY;
      console.log("缩放后的坐标:", {
        beforeScale,
        afterScale: { x, y },
        scale: { scaleX, scaleY },
      });
    }
  }

  // 如果 canvasRect 未初始化，先更新并等待完成
  if (canvasRect.value.width === 0 || canvasRect.value.height === 0) {
    console.log("Canvas位置未初始化，正在更新...");
    updateCanvasRect(() => {
      // 位置更新后，重新处理触摸事件
      processTouchAt(x, y);
    });
    return;
  }

  console.log("最终坐标:", { x, y, canvasRect: canvasRect.value });
  processTouchAt(x, y);
};

// 处理指定坐标的触摸
const processTouchAt = (x, y) => {
  console.log("处理触摸坐标:", { x, y });

  // 将屏幕坐标转换为画布坐标（考虑缩放和偏移）
  const canvasX = (x - viewOffsetX.value) / viewScale.value;
  const canvasY = (y - viewOffsetY.value) / viewScale.value;

  // 记录触摸开始信息（使用屏幕坐标）
  touchState.value.startTime = Date.now();
  touchState.value.startX = x;
  touchState.value.startY = y;
  touchState.value.isDragging = false;

  // 清除之前的长按定时器和拖动定时器
  if (touchState.value.longPressTimer) {
    clearTimeout(touchState.value.longPressTimer);
    touchState.value.longPressTimer = null;
  }
  if (touchState.value.dragTimer) {
    clearTimeout(touchState.value.dragTimer);
    touchState.value.dragTimer = null;
  }

  // 查找点击的节点（使用画布坐标）
  const clickedNode = nodes.value.find((node) => {
    if (node.parentId && isParentCollapsed(node.parentId)) {
      return false; // 跳过被折叠的节点
    }
    const distance = Math.sqrt(
      Math.pow(node.x - canvasX, 2) + Math.pow(node.y - canvasY, 2)
    );
    return distance <= 30; // 节点检测半径保持30画布单位
  });

  console.log("查找节点结果（含缩放）:", {
    clickedNode: clickedNode ? clickedNode.name : null,
    nodes: nodes.value.map((n) => ({ name: n.name, x: n.x, y: n.y })),
    screenPos: { x, y },
    canvasPos: { x: canvasX, y: canvasY },
    viewScale: viewScale.value,
    viewOffset: { x: viewOffsetX.value, y: viewOffsetY.value },
  });

  if (clickedNode) {
    // 检查是否点击了折叠/展开按钮（使用画布坐标）
    const radius = 30;
    const btnX = clickedNode.x + radius - 8;
    const btnY = clickedNode.y - radius + 8;
    const btnDistance = Math.sqrt(
      Math.pow(btnX - canvasX, 2) + Math.pow(btnY - canvasY, 2)
    );
    const hasChildren = nodes.value.some((n) => n.parentId === clickedNode.id);

    if (btnDistance <= 15 && hasChildren) {
      // 切换折叠状态
      clickedNode.collapsed = !clickedNode.collapsed;
      draw();
      saveData();
      return;
    }

    // 选中节点并准备拖动
    draggedNode.value = clickedNode;
    dragOffset.value = {
      x: canvasX - clickedNode.x, // 使用画布坐标计算偏移
      y: canvasY - clickedNode.y,
    };

    console.log("设置拖动偏移:", {
      nodeName: clickedNode.name,
      canvasPos: { x: canvasX, y: canvasY },
      nodePos: { x: clickedNode.x, y: clickedNode.y },
      dragOffset: dragOffset.value,
    });

    // 设置长按定时器，1秒后显示详情面板
    touchState.value.longPressTimer = setTimeout(() => {
      selectedNode.value = JSON.parse(JSON.stringify(clickedNode)); // 深拷贝
      console.log("显示节点详情:", clickedNode.name);
    }, 1000);

    // 设置拖动定时器，300ms 后开始拖动
    touchState.value.dragTimer = setTimeout(() => {
      touchState.value.isDragging = true;
      console.log("开始拖动节点:", clickedNode.name);
    }, 300);
  } else {
    // 点击空白区域，取消选中
    selectedNode.value = null;
    draggedNode.value = null;
  }

  draw();
};

const handleCanvasMove = (e) => {
  if (!e) return;

  // 阻止默认滚动
  e.preventDefault && e.preventDefault();

  // 处理双指缩放
  if (e.touches && e.touches.length === 2 && touchState.value.isZooming) {
    const currentDistance = getDistance(e.touches[0], e.touches[1]);
    const scaleChange = currentDistance / touchState.value.initialDistance;
    viewScale.value = Math.max(
      0.5,
      Math.min(3, touchState.value.initialScale * scaleChange)
    );
    draw();
    return;
  }

  // 单指拖动处理
  if (!draggedNode.value) return;

  // 获取触摸点
  const touch =
    e.touches && e.touches.length > 0
      ? e.touches[0]
      : e.changedTouches && e.changedTouches.length > 0
      ? e.changedTouches[0]
      : null;

  if (!touch) return;

  // 如果 canvasRect 未初始化，先更新
  if (canvasRect.value.width === 0 || canvasRect.value.height === 0) {
    updateCanvasRect(() => {
      const coords = getCanvasCoordinates(e, touch);
      updateNodePosition(coords.x, coords.y);
    });
    return;
  }

  const coords = getCanvasCoordinates(e, touch);
  const x = coords.x;
  const y = coords.y;

  // 如果 y 坐标仍然是 0，尝试使用页面坐标转换
  if (y === 0 && touch.clientY !== undefined && touch.clientY > 0) {
    const query = uni.createSelectorQuery().in(instance);
    query
      .select("canvas")
      .boundingClientRect((rect) => {
        if (rect) {
          const realY = touch.clientY - rect.top;
          const realX = touch.clientX - rect.left;
          const scaleX = canvasWidth.value / rect.width;
          const scaleY = canvasHeight.value / rect.height;
          const finalX = realX * scaleX;
          const finalY = realY * scaleY;
          // 更新 canvasRect 缓存
          canvasRect.value = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          };
          updateNodePosition(finalX, finalY);
        }
      })
      .exec();
    return;
  }

  updateNodePosition(x, y);
};

// 更新节点位置
const updateNodePosition = (x, y) => {
  if (!draggedNode.value) return;

  // 计算移动距离
  const moveDistance = Math.sqrt(
    Math.pow(x - touchState.value.startX, 2) +
      Math.pow(y - touchState.value.startY, 2)
  );

  // 如果移动距离超过 10px，认为是拖动操作
  if (moveDistance > 10) {
    // 清除长按定时器和拖动定时器
    if (touchState.value.longPressTimer) {
      clearTimeout(touchState.value.longPressTimer);
      touchState.value.longPressTimer = null;
    }
    if (touchState.value.dragTimer) {
      clearTimeout(touchState.value.dragTimer);
      touchState.value.dragTimer = null;
    }
    touchState.value.isDragging = true;

    // 更新节点位置，考虑缩放变换
    const margin = 30;
    const width = canvasWidth.value;
    const height = canvasHeight.value;
    const maxX = width - margin;
    const maxY = height - margin;

    // 将屏幕坐标转换为画布坐标（考虑缩放和偏移）
    const canvasX = (x - viewOffsetX.value) / viewScale.value;
    const canvasY = (y - viewOffsetY.value) / viewScale.value;
    
    // 同样将起始位置转换为画布坐标
    const startCanvasX = (touchState.value.startX - viewOffsetX.value) / viewScale.value;
    const startCanvasY = (touchState.value.startY - viewOffsetY.value) / viewScale.value;

    const newX = canvasX - dragOffset.value.x;
    const newY = canvasY - dragOffset.value.y;

    draggedNode.value.x = Math.max(margin, Math.min(maxX, newX));
    draggedNode.value.y = Math.max(margin, Math.min(maxY, newY));

    // 调试日志
    // console.log("拖动节点位置更新（含缩放）:", {
    //   node: draggedNode.value.name,
    //   screenX: x,
    //   screenY: y,
    //   canvasX,
    //   canvasY,
    //   startCanvasX,
    //   startCanvasY,
    //   newX: draggedNode.value.x,
    //   newY: draggedNode.value.y,
    //   viewScale: viewScale.value,
    //   viewOffsetX: viewOffsetX.value,
    //   viewOffsetY: viewOffsetY.value,
    //   maxX,
    //   maxY,
    //   margin,
    //   canvasSize: { w: width, h: height },
    // });

    // 同步更新选中节点的位置
    if (selectedNode.value && selectedNode.value.id === draggedNode.value.id) {
      selectedNode.value.x = draggedNode.value.x;
      selectedNode.value.y = draggedNode.value.y;
      console.log("同步更新选中节点位置:", {
        nodeId: selectedNode.value.id,
        x: selectedNode.value.x,
        y: selectedNode.value.y,
      });
    }

    draw();
  }
};

const handleCanvasEnd = (e) => {
  // 清除所有定时器
  if (touchState.value.longPressTimer) {
    clearTimeout(touchState.value.longPressTimer);
    touchState.value.longPressTimer = null;
  }
  if (touchState.value.dragTimer) {
    clearTimeout(touchState.value.dragTimer);
    touchState.value.dragTimer = null;
  }

  // 如果是拖动操作，保存数据
  if (touchState.value.isDragging && draggedNode.value) {
    saveData();
  }

  // 重置状态
  touchState.value.isDragging = false;
  touchState.value.isZooming = false;
  draggedNode.value = null;
  touchState.value.startTime = 0;
};

// 节点操作
const updateNode = () => {
  if (selectedNode.value) {
    const node = nodes.value.find((n) => n.id === selectedNode.value.id);
    if (node) {
      // 更新节点名称和描述
      node.name = selectedNode.value.name;
      node.description = selectedNode.value.description;
      draw(); // 重新绘制以更新节点名称显示
      saveData();
    }
  }
};

// 添加新节点（顶级节点）
const addNewNode = () => {
  // 先更新 Canvas 尺寸，确保使用最新值
  updateCanvasRect(() => {
    // 确保使用实际 Canvas 尺寸
    const width = canvasWidth.value;
    const height = canvasHeight.value;
    const margin = 30; // 边距

    console.log("添加节点 - Canvas尺寸:", {
      width,
      height,
      canvasRect: canvasRect.value,
    });

    // 在画布中心或随机位置添加新节点
    const centerX = width / 2;
    const centerY = height / 2;

    // 找一个不与其他节点重叠的位置
    let x = Math.max(margin, Math.min(width - margin, centerX));
    let y = Math.max(margin, Math.min(height - margin, centerY));
    let attempts = 0;
    while (attempts < 10) {
      const overlap = nodes.value.some((node) => {
        const distance = Math.sqrt(
          Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2)
        );
        return distance < 100; // 如果距离小于100，认为重叠
      });
      if (!overlap) break;
      // 确保随机位置在画布范围内
      x = Math.max(
        margin,
        Math.min(width - margin, Math.random() * (width - margin * 2) + margin)
      );
      y = Math.max(
        margin,
        Math.min(
          height - margin,
          Math.random() * (height - margin * 2) + margin
        )
      );
      attempts++;
    }

    // 最终确保位置在画布内
    x = Math.max(margin, Math.min(width - margin, x));
    y = Math.max(margin, Math.min(height - margin, y));

    console.log("新节点位置:", {
      x,
      y,
      width,
      height,
      margin,
      maxX: width - margin,
      maxY: height - margin,
    });

    const newNode = {
      id: Date.now().toString(),
      name: "新节点",
      x: x,
      y: y,
      description: "",
      parentId: null, // 顶级节点
      collapsed: false,
    };

    nodes.value.push(newNode);

    // 再次标准化位置，确保在画布内
    normalizePositions();

    draw();
    saveData();

    uni.showToast({ title: "已添加节点", icon: "success" });
  });
};

const addSiblingNode = () => {
  if (!selectedNode.value) {
    uni.showToast({ title: "请先选择一个节点", icon: "none" });
    return;
  }

  // 从 nodes 数组中找到当前选中的节点
  const currentNode = nodes.value.find((n) => n.id === selectedNode.value.id);
  if (!currentNode) return;

  const newNode = {
    id: Date.now().toString(),
    name: "新节点",
    x: currentNode.x + 100,
    y: currentNode.y,
    description: "",
    parentId: currentNode.parentId,
    collapsed: false,
  };

  nodes.value.push(newNode);

  // 创建连接
  edges.value.push({
    id: "e" + Date.now(),
    source: currentNode.id,
    target: newNode.id,
    type: "sibling",
  });

  // 更新选中节点为新节点
  selectedNode.value = JSON.parse(JSON.stringify(newNode));
  draw();
  saveData();

  uni.showToast({ title: "已添加同级节点", icon: "success" });
};

const addChildNode = () => {
  if (!selectedNode.value) {
    uni.showToast({ title: "请先选择一个节点", icon: "none" });
    return;
  }

  // 从 nodes 数组中找到当前选中的节点
  const currentNode = nodes.value.find((n) => n.id === selectedNode.value.id);
  if (!currentNode) return;

  const newNode = {
    id: Date.now().toString(),
    name: "子节点",
    x: currentNode.x + 50,
    y: currentNode.y + 80,
    description: "",
    parentId: currentNode.id,
    collapsed: false,
  };

  nodes.value.push(newNode);

  // 创建连接
  edges.value.push({
    id: "e" + Date.now(),
    source: currentNode.id,
    target: newNode.id,
    type: "parent-child",
  });

  // 更新选中节点为新节点
  selectedNode.value = JSON.parse(JSON.stringify(newNode));
  draw();
  saveData();

  uni.showToast({ title: "已添加子节点", icon: "success" });
};

const deleteNode = () => {
  if (!selectedNode.value) {
    uni.showToast({ title: "请先选择一个节点", icon: "none" });
    return;
  }

  uni.showModal({
    title: "确认删除",
    content: `确定要删除节点"${selectedNode.value.name}"吗？此操作将同时删除其所有子节点。`,
    success: (res) => {
      if (res.confirm) {
        const nodeId = selectedNode.value.id;

        // 删除节点及其子节点
        const deleteNodeRecursive = (id) => {
          // 先删除所有子节点
          const children = nodes.value.filter((n) => n.parentId === id);
          children.forEach((child) => {
            deleteNodeRecursive(child.id);
          });

          // 删除节点
          nodes.value = nodes.value.filter((n) => n.id !== id);
          // 删除相关边
          edges.value = edges.value.filter(
            (e) => e.source !== id && e.target !== id
          );
        };

        deleteNodeRecursive(nodeId);
        selectedNode.value = null;
        draw();
        saveData();

        uni.showToast({ title: "节点已删除", icon: "success" });
      }
    },
  });
};

// 从文本生成节点
const generateFromText = () => {
  // 简单的文本解析（后续可接入n8n）
  const text = textInput.value.trim();
  if (!text) {
    uni.showToast({ title: "请输入描述", icon: "none" });
    return;
  }

  // 示例解析逻辑：识别"连着"、"旁边"等关键词
  const parts = text.split(/[，,。.；;]/);
  const newNodes = [];
  const newEdges = [];
  let lastNodeId = null;

  parts.forEach((part, index) => {
    const trimmed = part.trim();
    if (!trimmed) return;

    // 提取节点名称（简化处理）
    let nodeName = trimmed;
    if (trimmed.includes("连着")) {
      const match = trimmed.match(/(.+?)连着(.+)/);
      if (match) {
        const node1 = match[1].trim();
        const node2 = match[2].trim();

        let node1Id = nodes.value.find((n) => n.name === node1)?.id;
        let node2Id = nodes.value.find((n) => n.name === node2)?.id;

        if (!node1Id) {
          node1Id = Date.now() + index + "a";
          newNodes.push({
            id: node1Id,
            name: node1,
            x: 200 + index * 150,
            y: 200,
            description: "",
            parentId: null,
            collapsed: false,
          });
        }

        if (!node2Id) {
          node2Id = Date.now() + index + "b";
          newNodes.push({
            id: node2Id,
            name: node2,
            x: 200 + (index + 1) * 150,
            y: 200,
            description: "",
            parentId: null,
            collapsed: false,
          });
        }

        newEdges.push({
          id: "e" + Date.now() + index,
          source: node1Id,
          target: node2Id,
          type: "sibling",
        });

        lastNodeId = node2Id;
        return;
      }
    }

    // 普通节点
    const nodeId = Date.now() + index;
    newNodes.push({
      id: nodeId.toString(),
      name: nodeName,
      x: 200 + index * 150,
      y: 200,
      description: "",
      parentId: lastNodeId,
      collapsed: false,
    });

    if (lastNodeId) {
      newEdges.push({
        id: "e" + Date.now() + index,
        source: lastNodeId,
        target: nodeId.toString(),
        type: lastNodeId ? "parent-child" : "sibling",
      });
    }

    lastNodeId = nodeId.toString();
  });

  // 合并到现有数据
  nodes.value.push(...newNodes);
  edges.value.push(...newEdges);
  normalizePositions();

  showTextInput.value = false;
  textInput.value = "";
  draw();
  saveData();

  uni.showToast({ title: `生成了${newNodes.length}个节点`, icon: "success" });
};

// 路线规划
const handleRouteStartChange = (e) => {
  routeStartIndex.value = e.detail.value;
  routeStart.value = topLevelNodes.value[e.detail.value];
  routePath.value = [];
};

const handleRouteEndChange = (e) => {
  routeEndIndex.value = e.detail.value;
  routeEnd.value = topLevelNodes.value[e.detail.value];
  routePath.value = [];
};

const calculateRoute = () => {
  if (!routeStart.value || !routeEnd.value) {
    uni.showToast({ title: "请选择起点和终点", icon: "none" });
    return;
  }

  if (routeStart.value.id === routeEnd.value.id) {
    routePath.value = [routeStart.value.id];
    draw();
    return;
  }

  // 使用BFS算法查找最短路径（仅同级节点）
  const queue = [[routeStart.value.id]];
  const visited = new Set([routeStart.value.id]);

  while (queue.length > 0) {
    const path = queue.shift();
    const currentNodeId = path[path.length - 1];

    if (currentNodeId === routeEnd.value.id) {
      routePath.value = path;
      draw();
      return;
    }

    // 查找同级节点的连接
    const currentNode = nodes.value.find((n) => n.id === currentNodeId);
    if (!currentNode) continue;

    const siblingEdges = edges.value.filter((e) => {
      const isSource = e.source === currentNodeId;
      const isTarget = e.target === currentNodeId;
      if (!isSource && !isTarget) return false;

      const otherNodeId = isSource ? e.target : e.source;
      const otherNode = nodes.value.find((n) => n.id === otherNodeId);

      // 只考虑同级节点（都没有parentId或parentId相同）
      return (
        otherNode &&
        ((!currentNode.parentId && !otherNode.parentId) ||
          currentNode.parentId === otherNode.parentId)
      );
    });

    for (const edge of siblingEdges) {
      const nextNodeId =
        edge.source === currentNodeId ? edge.target : edge.source;
      if (!visited.has(nextNodeId)) {
        visited.add(nextNodeId);
        queue.push([...path, nextNodeId]);
      }
    }
  }

  uni.showToast({ title: "未找到路径", icon: "none" });
  routePath.value = [];
  draw();
};

const resetView = () => {
  normalizePositions();
  selectedNode.value = null;
  routePath.value = [];
  draw();
};

// 重置缩放
const resetZoom = () => {
  viewScale.value = 1;
  viewOffsetX.value = 0;
  viewOffsetY.value = 0;
  draw();
  uni.showToast({ title: "已重置缩放", icon: "success" });
};

// 保存数据
const saveData = () => {
  emit("update:data", {
    nodes: nodes.value,
    edges: edges.value,
  });
};

// 导出数据为 JSON（用于保存到文件系统）
const exportData = () => {
  return {
    nodes: nodes.value,
    edges: edges.value,
    version: "1.0",
    timestamp: Date.now(),
  };
};

// 从 JSON 数据加载（用于从文件系统加载）
const importData = (data) => {
  if (data.nodes) {
    nodes.value = data.nodes;
  }
  if (data.edges) {
    edges.value = data.edges;
  }
  normalizePositions();
  draw();
  saveData();
};

// 暴露方法供外部调用
defineExpose({
  exportData,
  importData,
  saveData,
});

// 监听主题变化
watch(
  () => props.isDarkMode,
  () => {
    draw();
  }
);

// 监听页面滚动，更新 Canvas 位置
const handlePageScroll = () => {
  updateCanvasRect();
};

onMounted(() => {
  initCanvas();

  // 监听页面滚动事件
  uni.onPageScroll && uni.onPageScroll(handlePageScroll);

  // 定期更新 Canvas 位置（防止滚动后位置不准确）
  setInterval(() => {
    updateCanvasRect();
  }, 1000);
});

// 组件卸载时清理
onUnmounted(() => {
  if (touchState.value.longPressTimer) {
    clearTimeout(touchState.value.longPressTimer);
  }
  if (touchState.value.dragTimer) {
    clearTimeout(touchState.value.dragTimer);
  }
});
</script>

<style scoped>
.map-visualizer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
}

.map-visualizer.light-theme {
  background: #f5f5f5;
}

.toolbar {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.map-visualizer.light-theme .toolbar {
  background: rgba(0, 0, 0, 0.02);
  border-bottom-color: rgba(0, 0, 0, 0.1);
}

.tool-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 12px;
}

.map-visualizer.light-theme .tool-btn {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.1);
  color: #333;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  touch-action: none;
}

.node-panel-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.node-panel-modal .modal-content {
  width: 80%;
  max-width: 400px;
  background: rgba(30, 30, 30, 0.95);
  border-radius: 16px;
  padding: 20px;
  max-height: 70%;
  overflow-y: auto;
}

.map-visualizer.light-theme .node-panel-modal .modal-content {
  background: rgba(255, 255, 255, 0.95);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.map-visualizer.light-theme .panel-title {
  color: #333;
}

.close-btn {
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 20px;
  line-height: 1;
}

.map-visualizer.light-theme .close-btn {
  color: #333;
}

.info-item {
  margin-bottom: 12px;
}

.info-label {
  font-size: 12px;
  color: #999;
  display: block;
  margin-bottom: 4px;
}

.info-input {
  width: 100%;
  min-height: 60px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
}

.map-visualizer.light-theme .info-input {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.1);
  color: #333;
}

.panel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.action-btn {
  flex: 1;
  min-width: 80px;
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  color: #fff;
}

.action-btn.primary {
  background: #ff6b35;
}

.action-btn.danger {
  background: #ff4757;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 80%;
  max-width: 500px;
  background: #2a2a2a;
  border-radius: 16px;
  padding: 20px;
}

.map-visualizer.light-theme .modal-content {
  background: #fff;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.map-visualizer.light-theme .modal-title {
  color: #333;
}

.text-input {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
}

.map-visualizer.light-theme .text-input {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.1);
  color: #333;
}

.modal-footer {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.modal-btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: #ff6b35;
  color: #fff;
  font-size: 14px;
}

.modal-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
}

.route-selector {
  margin-bottom: 12px;
}

.selector-label {
  font-size: 14px;
  color: #fff;
  display: block;
  margin-bottom: 8px;
}

.map-visualizer.light-theme .selector-label {
  color: #333;
}

.picker-display {
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
}

.map-visualizer.light-theme .picker-display {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.1);
  color: #333;
}

.route-result {
  margin-top: 16px;
  padding: 12px;
  background: rgba(255, 107, 53, 0.2);
  border-radius: 8px;
}

.result-label {
  font-size: 12px;
  color: #ff6b35;
  display: block;
  margin-bottom: 4px;
}

.result-path {
  font-size: 14px;
  color: #fff;
  font-weight: 500;
}

.map-visualizer.light-theme .result-path {
  color: #333;
}
</style>

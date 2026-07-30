<script setup lang="ts">
import { computed, ref } from 'vue';
import type { WeightRecord } from '../types';

const props = withDefaults(defineProps<{
  records: WeightRecord[];
  height?: number;
  showStats?: boolean;
}>(), {
  height: 200,
  showStats: true,
});

// 点击带批注的数据点 → 通知父组件定位到对应打卡记录
const emit = defineEmits<{
  (e: 'select-comment', payload: { date: string; recordId: string }): void;
}>();

// 批注日期集合（yyyy-MM-dd）与记录级映射
const commentDateSet = computed(() => {
  const s = new Set<string>();
  props.records.forEach((r) => {
    if (r.dietitianComment) s.add(r.date.substring(0, 10));
  });
  return s;
});
const hasComment = (r: WeightRecord) => !!r.dietitianComment;
const hasUnreadComment = (r: WeightRecord) => !!r.dietitianComment && !r.commentRead;

const onPointClick = (r: WeightRecord) => {
  if (r.dietitianComment) {
    emit('select-comment', { date: r.date.substring(0, 10), recordId: r.id });
  }
};

// Sort records by date ascending
const sortedRecords = computed(() =>
  [...props.records].sort((a, b) => a.date.localeCompare(b.date)),
);

// Chart dimensions
const itemWidth = 60; // width per data point (wider for labels)
const chartPadding = { top: 32, bottom: 35, left: 10, right: 30 };
const chartHeight = computed(() => props.height);
const chartWidth = computed(() => {
  const min = 300;
  const needed = sortedRecords.value.length * itemWidth + chartPadding.left + chartPadding.right;
  return Math.max(min, needed);
});

// Y axis range
const yMin = computed(() => {
  if (sortedRecords.value.length === 0) return 0;
  const min = Math.min(...sortedRecords.value.map((r) => r.weight));
  return Math.floor(min - 2);
});
const yMax = computed(() => {
  if (sortedRecords.value.length === 0) return 100;
  const max = Math.max(...sortedRecords.value.map((r) => r.weight));
  return Math.ceil(max + 2);
});
const yRange = computed(() => yMax.value - yMin.value || 1);

// Convert data to SVG coordinates
const points = computed(() =>
  sortedRecords.value.map((r, i) => {
    const x = chartPadding.left + i * itemWidth + itemWidth / 2;
    const y = chartPadding.top + (1 - (r.weight - yMin.value) / yRange.value) * (chartHeight.value - chartPadding.top - chartPadding.bottom);
    return { x, y, ...r };
  }),
);

// Polyline path
const linePath = computed(() =>
  points.value.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '),
);

// Area path (filled below line)
const areaPath = computed(() => {
  if (points.value.length === 0) return '';
  const first = points.value[0];
  const last = points.value[points.value.length - 1];
  const baseY = chartHeight.value - chartPadding.bottom;
  return `M ${first.x} ${baseY} ` + points.value.map((p) => `L ${p.x} ${p.y}`).join(' ') + ` L ${last.x} ${baseY} Z`;
});

// Y axis grid lines (5 levels)
const gridLines = computed(() => {
  const lines: { y: number; value: number }[] = [];
  for (let i = 0; i <= 4; i++) {
    const value = yMin.value + (yRange.value * i) / 4;
    const y = chartPadding.top + (1 - i / 4) * (chartHeight.value - chartPadding.top - chartPadding.bottom);
    lines.push({ y, value: Math.round(value * 10) / 10 });
  }
  return lines;
});

// Date label formatter
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// Stats
const stats = computed(() => {
  if (sortedRecords.value.length === 0) return null;
  const first = sortedRecords.value[0].weight;
  const last = sortedRecords.value[sortedRecords.value.length - 1].weight;
  const diff = Math.round((last - first) * 10) / 10;
  const min = Math.min(...sortedRecords.value.map((r) => r.weight));
  const max = Math.max(...sortedRecords.value.map((r) => r.weight));
  return { first, last, diff, min, max, count: sortedRecords.value.length };
});

// Tooltip - track hovered/active index for highlight
const hoveredIndex = ref<number | null>(null);
const activatePoint = (idx: number) => { hoveredIndex.value = idx; };
const deactivatePoint = () => { hoveredIndex.value = null; };
</script>

<template>
  <div class="w-full">
    <!-- Stats Summary -->
    <div v-if="showStats && stats" class="grid grid-cols-3 gap-2 mb-4">
      <div class="bg-gray-50 rounded-xl p-3 text-center">
        <div class="text-[10px] text-gray-500 mb-1">当前体重</div>
        <div class="text-lg font-bold text-gray-900">{{ stats.last }}<span class="text-xs font-normal text-gray-400 ml-0.5">kg</span></div>
      </div>
      <div class="bg-gray-50 rounded-xl p-3 text-center">
        <div class="text-[10px] text-gray-500 mb-1">累计变化</div>
        <div :class="['text-lg font-bold', stats.diff < 0 ? 'text-[#07C160]' : stats.diff > 0 ? 'text-orange-500' : 'text-gray-700']">
          {{ stats.diff > 0 ? '+' : '' }}{{ stats.diff }}<span class="text-xs font-normal ml-0.5">kg</span>
        </div>
      </div>
      <div class="bg-gray-50 rounded-xl p-3 text-center">
        <div class="text-[10px] text-gray-500 mb-1">打卡天数</div>
        <div class="text-lg font-bold text-gray-900">{{ stats.count }}<span class="text-xs font-normal text-gray-400 ml-0.5">天</span></div>
      </div>
    </div>

    <!-- Chart Container - Horizontal Scroll -->
    <div class="relative">
      <div
        class="overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style="-webkit-overflow-scrolling: touch; touch-action: pan-x;"
      >
        <svg :width="chartWidth" :height="chartHeight" class="block select-none">
          <defs>
            <linearGradient id="grad-weight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1677FF" stop-opacity="0.15" />
              <stop offset="100%" stop-color="#1677FF" stop-opacity="0.01" />
            </linearGradient>
          </defs>

          <!-- Grid lines -->
          <g v-for="(line, i) in gridLines" :key="`grid-${i}`">
            <line
              :x1="chartPadding.left"
              :y1="line.y"
              :x2="chartWidth - chartPadding.right"
              :y2="line.y"
              stroke="#f0f0f0"
              stroke-width="1"
              stroke-dasharray="4 4"
            />
            <text
              :x="chartWidth - chartPadding.right + 2"
              :y="line.y + 3"
              font-size="9"
              fill="#bbb"
              text-anchor="start"
            >{{ line.value }}</text>
          </g>

          <!-- Area fill -->
          <path
            v-if="areaPath"
            :d="areaPath"
            fill="url(#grad-weight)"
          />

          <!-- Line -->
          <path
            v-if="linePath"
            :d="linePath"
            fill="none"
            stroke="#1677FF"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
          />

          <!-- Data points - always show value labels -->
          <g v-for="(p, i) in points" :key="`pt-${i}`">
            <!-- Vertical guide line when active -->
            <line
              v-if="hoveredIndex === i"
              :x1="p.x"
              :y1="chartPadding.top"
              :x2="p.x"
              :y2="chartHeight - chartPadding.bottom"
              stroke="#1677FF"
              stroke-width="1"
              stroke-dasharray="3 3"
              opacity="0.5"
            />

            <!-- Weight value label - always visible for all points -->
            <g>
              <rect
                :x="p.x - 24"
                :y="p.y - 26"
                width="48"
                height="17"
                rx="4"
                :fill="hoveredIndex === i ? '#1677FF' : (i === points.length - 1 ? '#1677FF' : '#fff')"
                :stroke="hoveredIndex === i || i === points.length - 1 ? 'none' : '#1677FF'"
                stroke-width="1"
              />
              <text
                :x="p.x"
                :y="p.y - 14"
                font-size="10"
                font-weight="bold"
                :fill="hoveredIndex === i || i === points.length - 1 ? '#fff' : '#1677FF'"
                text-anchor="middle"
              >{{ p.weight }}</text>
            </g>

            <!-- Point circle -->
            <circle
              :cx="p.x"
              :cy="p.y"
              :r="hoveredIndex === i ? 5 : 3.5"
              :fill="hoveredIndex === i ? '#1677FF' : '#fff'"
              :stroke="hasUnreadComment(p) ? '#EF4444' : '#1677FF'"
              stroke-width="2"
              @touchstart.prevent="activatePoint(i)"
              @touchend="deactivatePoint"
              @mouseenter="activatePoint(i)"
              @mouseleave="deactivatePoint"
              @click="onPointClick(p)"
              style="cursor: pointer;"
            />

            <!-- 批注标记：点上方小气泡（红=未读，蓝=已读） -->
            <g v-if="hasComment(p)" @click="onPointClick(p)" style="cursor: pointer;">
              <circle
                :cx="p.x + 7"
                :cy="p.y - 7"
                r="4"
                :fill="hasUnreadComment(p) ? '#EF4444' : '#1677FF'"
                stroke="#fff"
                stroke-width="1.2"
              />
              <text
                :x="p.x + 7"
                :y="p.y - 4.5"
                font-size="7"
                fill="#fff"
                text-anchor="middle"
                font-weight="bold"
              >评</text>
            </g>

            <!-- Date label below -->
            <text
              :x="p.x"
              :y="chartHeight - chartPadding.bottom + 15"
              font-size="9"
              :fill="i === points.length - 1 ? '#1677FF' : '#999'"
              text-anchor="middle"
              :font-weight="i === points.length - 1 ? 'bold' : 'normal'"
            >{{ formatDate(p.date) }}</text>
          </g>
        </svg>
      </div>

      <!-- Scroll hint -->
      <div v-if="chartWidth > 300" class="flex items-center justify-center gap-1 mt-1 text-[10px] text-gray-400">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
        <span>左右滑动查看更多</span>
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
      </div>
    </div>
  </div>
</template>

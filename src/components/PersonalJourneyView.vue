<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAppStore } from '../store/app';
import { NavBar, Card } from './ui';
import { Activity, Flame, TrendingDown, Calendar, Dumbbell, Coffee, Trophy, Award, Download, Lock, CheckCircle2, BookOpen } from 'lucide-vue-next';
import { Tabbar as VanTabbar, TabbarItem as VanTabbarItem, Popup as VanPopup } from 'vant';
import { MOCK_STUDENT_METRIC_VALUES } from '../mock/data';
import { generatePersonalJourney } from '../lib/journey';
import { generateStudentReport, weightTrendToSvgPoints } from '../lib/campReport';
import { exportElementAsImage } from '../lib/exportImage';
import type { Achievement } from '../types';

const store = useAppStore();

// 获取当前学员数据
const studentId = computed(() => store.user?.id || 's1');
const studentName = computed(() => store.user?.name || '学员');
const studentGender = computed(() => store.user?.gender);

// 体重记录
const studentWeights = computed(() => {
  const id = studentId.value;
  return store.weightRecords.filter((r) => r.studentId === id || !r.studentId);
});

// 饮食记录
const studentDiets = computed(() =>
  store.dietRecords.filter((r) => r.studentId === studentId.value || (studentId.value === 's1' && !r.studentId)),
);

// 运动记录
const studentExercises = computed(() =>
  store.exerciseRecords.filter((r) => r.studentId === studentId.value || (studentId.value === 's1' && !r.studentId)),
);

// 生成个人历程数据
const journey = computed(() =>
  generatePersonalJourney(studentDiets.value, studentExercises.value, studentWeights.value, studentId.value),
);

// 生成成就（复用结营报告的成就计算）
const report = computed(() =>
  generateStudentReport(
    { id: studentId.value, name: studentName.value, gender: studentGender.value },
    store.metricConfigs,
    MOCK_STUDENT_METRIC_VALUES[studentId.value] || {},
    studentDiets.value,
    studentExercises.value,
    studentWeights.value,
  ),
);
const unlockedCount = computed(() => report.value.achievements.filter((a) => a.unlocked).length);

// 体重趋势 SVG
const svgPoints = computed(() => weightTrendToSvgPoints(journey.value.weightTrend, 280, 100, 20));

// 热力图颜色 - 使用明显不同的颜色区分各等级
const heatmapColor = (completionCount: number, isComplete: boolean): string => {
  if (isComplete) return 'bg-[#07C160]';       // 全部完成：绿色
  if (completionCount === 0) return 'bg-gray-100';  // 无打卡：灰色
  if (completionCount <= 2) return 'bg-amber-300';   // 1-2项：琥珀色
  return 'bg-sky-400';                               // 3-4项：天蓝色
};

// 格式化
const fmt = (v: number | null, digits = 1): string => v === null ? '--' : v.toFixed(digits);
const fmtDate = (d: string): string => {
  const date = new Date(d);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

// 成就弹窗
const selectedAchievement = ref<Achievement | null>(null);
const showAchievementPopup = ref(false);
const openAchievementDetail = (ach: Achievement) => {
  selectedAchievement.value = ach;
  showAchievementPopup.value = true;
};

// 长图导出（微信可用；未装 html2canvas 时自动降级为打印）
const exportRef = ref<HTMLElement | null>(null);
const exportPDF = () => {
  if (exportRef.value) {
    exportElementAsImage(exportRef.value, `个人历程_${studentName.value}_${new Date().toISOString().split('T')[0]}`);
  }
};

// 饮食得分图表最大值
const dietScoreMax = computed(() => Math.max(...journey.value.dailyDietScores.map((d) => d.score), 3));

// 每周完成率图表最大值
const weeklyMax = computed(() => Math.max(...journey.value.weeklyStats.map((w) => w.completionRate), 1));
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] pb-20 font-sans">
    <NavBar title="个人历程" :on-back="store.goBack">
      <template #right>
        <button class="text-[#07C160] hover:bg-green-50 p-2 rounded-full transition-colors" @click="exportPDF">
          <Download class="h-5 w-5" />
        </button>
      </template>
    </NavBar>

    <div ref="exportRef" class="p-4 space-y-4">
      <!-- 顶部概览卡片 -->
      <div class="bg-gradient-to-br from-[#07C160] to-[#06A952] rounded-2xl p-5 text-white shadow-lg">
        <div class="flex items-center gap-2 mb-4">
          <BookOpen class="w-6 h-6" />
          <h2 class="text-lg font-bold">{{ studentName }}的个人历程</h2>
        </div>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="bg-black/15 rounded-lg py-3">
            <div class="text-2xl font-bold drop-shadow">{{ journey.totalCheckinDays }}</div>
            <div class="text-[10px] mt-0.5">打卡天数</div>
            <div class="text-[8px] opacity-70 mt-0.5 leading-tight">有任意打卡记录的天数</div>
          </div>
          <div class="bg-black/15 rounded-lg py-3">
            <div class="text-2xl font-bold drop-shadow">{{ journey.completeDays }}</div>
            <div class="text-[10px] mt-0.5">完成天数</div>
            <div class="text-[8px] opacity-70 mt-0.5 leading-tight">三餐+运动全部完成</div>
          </div>
          <div class="bg-black/15 rounded-lg py-3">
            <div class="text-2xl font-bold drop-shadow">{{ journey.currentStreak }}</div>
            <div class="text-[10px] mt-0.5">当前连续</div>
            <div class="text-[8px] opacity-70 mt-0.5 leading-tight">从今天往前连续完成</div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mt-3 text-center">
          <div class="bg-black/10 rounded-lg py-2">
            <span class="text-xs">最长连续 </span>
            <span class="text-sm font-bold drop-shadow">{{ journey.longestStreak }}</span>
            <span class="text-xs"> 天</span>
            <div class="text-[8px] opacity-70 mt-0.5">营期内最高连续记录</div>
          </div>
          <div class="bg-black/10 rounded-lg py-2">
            <span class="text-xs">累计运动 </span>
            <span class="text-sm font-bold drop-shadow">{{ journey.totalExerciseDuration }}</span>
            <span class="text-xs"> 分钟</span>
            <div class="text-[8px] opacity-70 mt-0.5">所有运动记录时长之和</div>
          </div>
        </div>
      </div>

      <!-- 打卡热力图 -->
      <Card>
        <h3 class="font-bold text-gray-900 mb-2 flex items-center gap-2 border-b pb-2">
          <Calendar class="h-4 w-4 text-[#07C160]" />
          打卡热力图
        </h3>
        <p class="text-[10px] text-gray-400 mb-3">从首次打卡日起逐日统计，颜色越深=完成项数越多</p>
        <div class="flex flex-wrap gap-1.5">
          <div
            v-for="day in journey.dailyCheckins"
            :key="day.date"
            class="w-6 h-6 rounded-md cursor-pointer transition-transform hover:scale-125"
            :class="heatmapColor(day.completionCount, day.isComplete)"
            :title="`${day.date} ${day.isComplete ? '完成全部' : `完成${day.completionCount}/5项`}`"
          ></div>
        </div>
        <div class="flex items-center gap-3 mt-3 text-[10px] text-gray-500">
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-[#07C160]"></span>全部完成(5/5)</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-sky-400"></span>完成3-4项</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-300"></span>完成1-2项</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-gray-100"></span>未打卡</span>
        </div>
        <div class="mt-2 text-[10px] text-gray-400">
          统计区间：{{ journey.startDate }} 至今，共 {{ journey.journeyDays }} 天
        </div>
      </Card>

      <!-- 体重趋势 -->
      <Card>
        <h3 class="font-bold text-gray-900 mb-2 flex items-center gap-2 border-b pb-2">
          <TrendingDown class="h-4 w-4 text-[#07C160]" />
          体重趋势
        </h3>
        <p class="text-[10px] text-gray-400 mb-3">每次体重打卡记录连线，展示体重变化趋势</p>
        <template v-if="journey.weightTrend.records.length > 0">
          <div class="flex items-center justify-between mb-4">
            <div class="text-center">
              <div class="text-xs text-gray-500 mb-1">初始</div>
              <div class="text-xl font-bold text-gray-900">{{ fmt(journey.weightTrend.startWeight) }} <span class="text-xs text-gray-400">kg</span></div>
            </div>
            <div class="flex-1 mx-4 text-center">
              <div class="text-2xl font-bold" :class="journey.weightTrend.totalChange !== null && journey.weightTrend.totalChange < 0 ? 'text-[#07C160]' : 'text-orange-500'">
                {{ journey.weightTrend.totalChange !== null ? `${journey.weightTrend.totalChange > 0 ? '+' : ''}${journey.weightTrend.totalChange.toFixed(1)} kg` : '--' }}
              </div>
              <div class="text-xs text-gray-400 mt-1">{{ journey.weightTrend.changePercent !== null ? `${Math.abs(journey.weightTrend.changePercent).toFixed(1)}%` : '--' }}</div>
            </div>
            <div class="text-center">
              <div class="text-xs text-gray-500 mb-1">最新</div>
              <div class="text-xl font-bold text-gray-900">{{ fmt(journey.weightTrend.endWeight) }} <span class="text-xs text-gray-400">kg</span></div>
            </div>
          </div>
          <div v-if="svgPoints" class="w-full">
            <svg viewBox="0 0 280 100" class="w-full" preserveAspectRatio="none" style="height: 100px;">
              <defs>
                <linearGradient id="weightGradJourney" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#07C160" stop-opacity="0.2" />
                  <stop offset="100%" stop-color="#07C160" stop-opacity="0" />
                </linearGradient>
              </defs>
              <polygon :points="`20,80 ${svgPoints} 260,80`" fill="url(#weightGradJourney)" />
              <polyline :points="svgPoints" fill="none" stroke="#07C160" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
              <circle
                v-for="(r, i) in journey.weightTrend.records"
                :key="i"
                :cx="20 + (i / (journey.weightTrend.records.length - 1)) * 240"
                :cy="100 - 20 - ((r.weight - Math.min(...journey.weightTrend.records.map(x => x.weight))) / (Math.max(...journey.weightTrend.records.map(x => x.weight)) - Math.min(...journey.weightTrend.records.map(x => x.weight)) || 1)) * 60"
                r="3"
                fill="#07C160"
              />
            </svg>
          </div>
        </template>
        <div v-else class="text-center text-sm text-gray-400 py-6">暂无体重记录</div>
      </Card>

      <!-- 每周打卡对比 -->
      <Card v-if="journey.weeklyStats.length > 0">
        <h3 class="font-bold text-gray-900 mb-2 flex items-center gap-2 border-b pb-2">
          <Activity class="h-4 w-4 text-[#1677FF]" />
          每周打卡完成率
        </h3>
        <p class="text-[10px] text-gray-400 mb-3">按自然周（周一至周日）统计，首周可能不足7天</p>
        <div class="flex items-end justify-between gap-2 h-32">
          <div
            v-for="week in journey.weeklyStats"
            :key="week.weekLabel"
            class="flex-1 flex flex-col items-center justify-end h-full"
          >
            <div class="text-[10px] font-bold text-gray-700 mb-1">{{ Math.round(week.completionRate * 100) }}%</div>
            <div
              class="w-full rounded-t-md transition-all min-h-[4px]"
              :class="week.completionRate >= 0.8 ? 'bg-[#07C160]' : week.completionRate >= 0.5 ? 'bg-[#FF976A]' : 'bg-gray-300'"
              :style="{ height: `${Math.max(week.completionRate / weeklyMax * 100, 4)}%` }"
            ></div>
            <div class="text-[10px] text-gray-500 mt-1">{{ week.weekLabel }}</div>
            <div class="text-[9px] text-gray-400">{{ week.completeDays }}/{{ week.totalDays }}天</div>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-gray-50 space-y-1 text-xs text-gray-500">
          <div v-for="week in journey.weeklyStats" :key="week.weekLabel" class="flex justify-between">
            <span>{{ week.weekLabel }}（{{ fmtDate(week.weekStart) }}-{{ fmtDate(week.weekEnd) }}）</span>
            <span>运动{{ week.exerciseDuration }}分钟 · 饮食{{ week.dietScore }}分</span>
          </div>
        </div>
      </Card>

      <!-- 运动统计 -->
      <Card v-if="journey.exerciseBreakdown.length > 0">
        <h3 class="font-bold text-gray-900 mb-2 flex items-center gap-2 border-b pb-2">
          <Dumbbell class="h-4 w-4 text-[#FF976A]" />
          运动统计
        </h3>
        <p class="text-[10px] text-gray-400 mb-3">总时长=所有运动记录时长累加，平均每次=总时长÷运动次数</p>
        <div class="grid grid-cols-2 gap-3 mb-4 text-center">
          <div class="bg-gray-50 rounded-lg py-3">
            <div class="text-xl font-bold text-gray-900">{{ journey.totalExerciseDuration }}</div>
            <div class="text-[10px] text-gray-500 mt-1">总运动时长（分钟）</div>
          </div>
          <div class="bg-[#FF976A]/5 rounded-lg py-3">
            <div class="text-xl font-bold text-[#FF976A]">{{ journey.avgExerciseDuration.toFixed(0) }}</div>
            <div class="text-[10px] text-gray-500 mt-1">平均每次（分钟）</div>
          </div>
        </div>
        <div class="text-[10px] text-gray-400 mb-2">按运动类型分布：</div>
        <div class="space-y-2">
          <div
            v-for="(item, idx) in journey.exerciseBreakdown"
            :key="idx"
            class="flex items-center gap-3"
          >
            <span class="text-xs text-gray-700 w-16 shrink-0 truncate">{{ item.type }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
              <div
                class="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#FF976A] to-orange-400"
                :style="{ width: `${(item.totalDuration / journey.totalExerciseDuration) * 100}%` }"
              ></div>
            </div>
            <span class="text-[10px] text-gray-500 w-20 text-right shrink-0">{{ item.totalDuration }}分钟 / {{ item.count }}次</span>
          </div>
        </div>
      </Card>

      <!-- 饮食得分趋势 -->
      <Card v-if="journey.dailyDietScores.length > 0">
        <h3 class="font-bold text-gray-900 mb-2 flex items-center gap-2 border-b pb-2">
          <Coffee class="h-4 w-4 text-[#07C160]" />
          每日饮食得分
        </h3>
        <p class="text-[10px] text-gray-400 mb-3">每日封顶3分，左右滑动查看更多日期</p>
        <div class="overflow-x-auto -mx-1 px-1" style="-webkit-overflow-scrolling: touch;">
          <div class="flex items-end gap-1.5 h-28 mb-1" :style="{ minWidth: `${journey.dailyDietScores.length * 32}px` }">
            <div
              v-for="day in journey.dailyDietScores"
              :key="day.date"
              class="flex flex-col items-center justify-end h-full shrink-0"
              style="width: 28px;"
            >
              <div class="text-[8px] font-bold mb-0.5" :class="day.score >= 2 ? 'text-[#07C160]' : 'text-gray-400'">{{ day.score }}</div>
              <div
                class="w-5 rounded-t-sm transition-all min-h-[2px]"
                :class="day.score >= 3 ? 'bg-[#07C160]' : day.score >= 2 ? 'bg-[#07C160]/60' : day.score >= 1 ? 'bg-[#FF976A]' : 'bg-gray-300'"
                :style="{ height: `${(day.score / dietScoreMax) * 80}px` }"
                :title="`${day.date}: ${day.score}分 (${day.meals}餐)`"
              ></div>
              <div class="text-[7px] text-gray-400 mt-0.5 leading-none transform -rotate-45 origin-center whitespace-nowrap">{{ fmtDate(day.date) }}</div>
            </div>
          </div>
        </div>
      </Card>

      <!-- 成就墙 -->
      <Card>
        <h3 class="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
          <Award class="h-4 w-4 text-[#FF976A]" />
          里程里程碑
          <span class="ml-auto text-xs text-gray-400 font-normal">{{ unlockedCount }}/{{ report.achievements.length }}</span>
        </h3>
        <div class="grid grid-cols-4 gap-3">
          <div
            v-for="ach in report.achievements"
            :key="ach.id"
            class="flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-transform"
            :class="ach.unlocked ? '' : 'opacity-30 grayscale'"
            @click="openAchievementDetail(ach)"
          >
            <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-1"
              :class="ach.unlocked ? 'bg-gradient-to-br from-yellow-100 to-orange-100' : 'bg-gray-100'"
            >{{ ach.icon }}</div>
            <div class="text-[10px] font-medium text-gray-700 leading-tight">{{ ach.title }}</div>
          </div>
        </div>
        <p class="text-[10px] text-gray-400 mt-3 text-center">点击图标查看说明</p>
      </Card>
    </div>

    <!-- 成就说明弹窗 -->
    <VanPopup v-model:show="showAchievementPopup" position="center" round closeable close-icon-position="top-right" class="custom-popup !w-[80%] !max-w-[320px]">
      <div v-if="selectedAchievement" class="p-6 text-center">
        <div class="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl mb-3"
          :class="selectedAchievement.unlocked ? 'bg-gradient-to-br from-yellow-100 to-orange-100' : 'bg-gray-100'"
        >{{ selectedAchievement.icon }}</div>
        <h3 class="font-bold text-gray-900 text-lg mb-2">{{ selectedAchievement.title }}</h3>
        <p class="text-sm text-gray-500 mb-4 leading-relaxed">{{ selectedAchievement.description }}</p>
        <div class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium"
          :class="selectedAchievement.unlocked ? 'bg-[#07C160]/10 text-[#07C160]' : 'bg-gray-100 text-gray-400'"
        >
          <CheckCircle2 v-if="selectedAchievement.unlocked" class="w-3.5 h-3.5" />
          <Lock v-else class="w-3.5 h-3.5" />
          {{ selectedAchievement.unlocked ? '已解锁' : '尚未解锁' }}
        </div>
      </div>
    </VanPopup>

    <VanTabbar class="custom-tabbar print:hidden" :model-value="0">
      <VanTabbarItem @click="store.setCurrentView('dashboard')">
        <template #icon><Activity class="h-6 w-6" /></template>
        首页
      </VanTabbarItem>
      <VanTabbarItem @click="store.setCurrentView('health-profile')">
        <template #icon><BookOpen class="h-6 w-6" /></template>
        档案
      </VanTabbarItem>
    </VanTabbar>
  </div>
</template>

<style>
@media print {
  .print\:hidden { display: none !important; }
  .custom-nav { display: none !important; }
  .custom-tabbar { display: none !important; }
  .van-overlay { display: none !important; }
  body { background: white !important; }
  .shadow-lg, .shadow-sm, .shadow-md { box-shadow: none !important; }
  .grid { break-inside: avoid; }
  .max-w-md { max-width: 100% !important; }
  .mx-auto { margin: 0 !important; }
  .fixed { position: static !important; }
  .overflow-y-auto { overflow: visible !important; }
  .pb-20 { padding-bottom: 1rem !important; }
  .pt-12 { padding-top: 0 !important; }
}
</style>

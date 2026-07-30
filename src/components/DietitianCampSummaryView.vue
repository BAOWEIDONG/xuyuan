<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAppStore } from '../store/app';
import { NavBar, Card } from './ui';
import { BarChart3, TrendingDown, TrendingUp, Users, Trophy, Activity, ChevronRight, Download, UserCheck, Building2 } from 'lucide-vue-next';
import { Tabbar as VanTabbar, TabbarItem as VanTabbarItem } from 'vant';
import { MOCK_STUDENTS, MOCK_STUDENT_METRIC_VALUES } from '../mock/data';
import { generateDietitianSummary } from '../lib/campReport';
import { exportElementAsImage } from '../lib/exportImage';
import type { DietitianCampSummary } from '../types';

const store = useAppStore();

// 所有体重记录（store 已包含全部学员数据）
const allWeightRecords = computed(() => store.weightRecords);

// 生成结营统计
const summary = computed<DietitianCampSummary>(() =>
  generateDietitianSummary(
    MOCK_STUDENTS,
    store.metricConfigs,
    MOCK_STUDENT_METRIC_VALUES,
    store.dietRecords,
    store.exerciseRecords,
    allWeightRecords.value,
  ),
);

// 按分类分组的指标聚合
const metricCategories = computed(() => {
  const cats = new Map<string, typeof summary.value.metricAggregates>();
  for (const m of summary.value.metricAggregates) {
    if (!cats.has(m.category)) cats.set(m.category, []);
    cats.get(m.category)!.push(m);
  }
  return Array.from(cats.entries());
});

// 打开学员详情
const openStudent = (id: string) => {
  store.setSelectedStudentId(id);
  store.setCurrentView('dietitian-student-detail');
};

// 长图导出（微信可用；未装 html2canvas 时自动降级为打印）
const exportRef = ref<HTMLElement | null>(null);
const exportPDF = () => {
  if (exportRef.value) {
    exportElementAsImage(exportRef.value, `结营统计_${new Date().toISOString().split('T')[0]}`);
  }
};

// 格式化数字
const fmt = (v: number | null, digits = 1): string => {
  if (v === null) return '--';
  return v.toFixed(digits);
};

// 格式化百分比
const fmtPct = (v: number | null): string => {
  if (v === null) return '--';
  return `${(v * 100).toFixed(0)}%`;
};

// 格式化变化量（带正负号）
const fmtChange = (v: number | null, unit = ''): string => {
  if (v === null) return '--';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}${unit ? ' ' + unit : ''}`;
};
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] pb-20 font-sans">
    <NavBar title="结营统计" :on-back="store.goBack">
      <template #right>
        <button class="text-[#FF976A] hover:bg-orange-50 p-2 rounded-full transition-colors" @click="exportPDF">
          <Download class="h-5 w-5" />
        </button>
      </template>
    </NavBar>

    <div ref="exportRef" class="p-4 space-y-4">
      <!-- 企业汇报版入口 -->
      <Card
        class="bg-gradient-to-r from-[#07C160]/10 to-[#07C160]/5 border-[#07C160]/20 cursor-pointer hover:shadow-md transition-shadow"
        @click="store.setCurrentView('enterprise-report')"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-[#07C160]/15 flex items-center justify-center shrink-0">
            <Building2 class="w-5 h-5 text-[#07C160]" />
          </div>
          <div class="flex-1">
            <div class="font-bold text-gray-900 text-sm">企业汇报版</div>
            <div class="text-xs text-gray-500 mt-0.5">匿名聚合数据 + 本期亮点，可直接导出发给 HR</div>
          </div>
          <ChevronRight class="w-4 h-4 text-[#07C160]" />
        </div>
      </Card>

      <!-- 概览卡片 -->
      <div class="grid grid-cols-2 gap-3">
        <Card class="p-4 text-center">
          <div class="flex items-center justify-center mb-2">
            <Users class="w-5 h-5 text-[#FF976A] mr-1" />
          </div>
          <div class="text-2xl font-bold text-gray-900">{{ summary.totalStudents }}</div>
          <div class="text-xs text-gray-500 mt-1">参营学员</div>
        </Card>
        <Card class="p-4 text-center">
          <div class="flex items-center justify-center mb-2">
            <UserCheck class="w-5 h-5 text-[#07C160] mr-1" />
          </div>
          <div class="text-2xl font-bold text-[#07C160]">{{ summary.validStudentCount }}</div>
          <div class="text-xs text-gray-500 mt-1">有效人数<span class="text-[10px] text-gray-400">（有前后体成分数据）</span></div>
        </Card>
        <Card class="p-4 text-center">
          <div class="flex items-center justify-center mb-2">
            <TrendingDown class="w-5 h-5 text-[#07C160] mr-1" />
          </div>
          <div class="text-2xl font-bold text-[#07C160]">{{ fmtChange(summary.avgWeightChange, 'kg') }}</div>
          <div class="text-xs text-gray-500 mt-1">平均体重变化<span class="text-[10px] text-gray-400">（按有效人数）</span></div>
        </Card>
        <Card class="p-4 text-center">
          <div class="flex items-center justify-center mb-2">
            <Activity class="w-5 h-5 text-[#1677FF] mr-1" />
          </div>
          <div class="text-2xl font-bold text-[#1677FF]">{{ fmtPct(summary.avgCompletionRate) }}</div>
          <div class="text-xs text-gray-500 mt-1">平均完成率<span class="text-[10px] text-gray-400">（按有效人数）</span></div>
        </Card>
        <Card class="p-4 text-center">
          <div class="flex items-center justify-center mb-2">
            <Trophy class="w-5 h-5 text-[#FF976A] mr-1" />
          </div>
          <div class="text-2xl font-bold text-[#FF976A]">{{ fmt(summary.avgAbnormalImproved, 0) }}</div>
          <div class="text-xs text-gray-500 mt-1">平均异常改善数<span class="text-[10px] text-gray-400">（按有效人数）</span></div>
        </Card>
        <Card class="p-4 text-center">
          <div class="flex items-center justify-center mb-2">
            <BarChart3 class="w-5 h-5 text-[#1677FF] mr-1" />
          </div>
          <div class="text-2xl font-bold text-[#1677FF]">{{ fmt(summary.avgCheckinDays, 0) }}</div>
          <div class="text-xs text-gray-500 mt-1">平均打卡天数<span class="text-[10px] text-gray-400">（按有效人数）</span></div>
        </Card>
      </div>

      <!-- 学员列表 -->
      <Card>
        <h3 class="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
          <BarChart3 class="h-4 w-4 text-[#FF976A]" />
          学员结营概况
        </h3>
        <div class="space-y-3">
          <div
            v-for="report in summary.studentReports"
            :key="report.studentId"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
            @click="openStudent(report.studentId)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-bold text-gray-900 text-sm">{{ report.studentName }}</span>
                <span class="text-[10px] text-gray-500">{{ report.gender === 'male' ? '男' : '女' }}</span>
                <span
                  v-if="report.metricChanges.filter(m => m.category === '身体测量数据' && typeof m.beforeValue === 'number' && typeof m.afterValue === 'number').length > 0"
                  class="text-[9px] bg-[#07C160]/10 text-[#07C160] px-1.5 py-0.5 rounded font-medium"
                >有效</span>
              </div>
              <div class="flex flex-wrap gap-2 text-[10px] text-gray-500">
                <span class="flex items-center gap-0.5">
                  <TrendingDown class="w-3 h-3" :class="report.summary.weightLossKg !== null && report.summary.weightLossKg > 0 ? 'text-[#07C160]' : 'text-gray-400'" />
                  {{ report.summary.weightLossKg !== null ? `${fmt(report.summary.weightLossKg)}kg` : '--' }}
                </span>
                <span>完成率 {{ fmtPct(report.checkinStats.completionRate) }}</span>
                <span>连续{{ report.summary.longestStreak }}天</span>
                <span v-if="report.summary.abnormalImprovedCount > 0" class="text-[#07C160]">
                  改善{{ report.summary.abnormalImprovedCount }}项
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0 ml-2">
              <div class="flex flex-wrap gap-0.5 max-w-[80px]">
                <span
                  v-for="ach in report.achievements.filter(a => a.unlocked).slice(0, 4)"
                  :key="ach.id"
                  class="text-sm"
                  :title="ach.title"
                >{{ ach.icon }}</span>
              </div>
              <ChevronRight class="w-4 h-4 text-gray-300" />
            </div>
          </div>
        </div>
      </Card>

      <!-- 指标聚合统计 -->
      <Card v-for="[catName, metrics] in metricCategories" :key="catName">
        <h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2 text-sm">
          <Activity class="h-4 w-4 text-[#1677FF]" />
          {{ catName }}
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="text-gray-500 border-b border-gray-100">
                <th class="text-left py-2 font-medium">指标</th>
                <th class="text-right py-2 font-medium">营前(均)</th>
                <th class="text-right py-2 font-medium">营后(均)</th>
                <th class="text-right py-2 font-medium">变化</th>
                <th class="text-right py-2 font-medium">改善率</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="m in metrics"
                :key="m.configId"
                class="border-b border-gray-50 last:border-0"
              >
                <td class="py-2 text-left text-gray-900 font-medium">{{ m.name }}</td>
                <td class="py-2 text-right text-gray-600">
                  {{ m.avgBefore !== null ? m.avgBefore.toFixed(1) : '--' }}
                  <span class="text-gray-400">{{ m.unit }}</span>
                </td>
                <td class="py-2 text-right text-gray-600">
                  {{ m.avgAfter !== null ? m.avgAfter.toFixed(1) : '--' }}
                  <span class="text-gray-400">{{ m.unit }}</span>
                </td>
                <td class="py-2 text-right font-medium" :class="m.avgChange !== null && m.avgChange < 0 ? 'text-[#07C160]' : m.avgChange !== null && m.avgChange > 0 ? 'text-orange-500' : 'text-gray-400'">
                  {{ fmtChange(m.avgChange) }}
                </td>
                <td class="py-2 text-right">
                  <span v-if="m.improvementRate !== null" :class="m.improvementRate > 0 ? 'text-[#07C160] font-medium' : 'text-gray-400'">
                    {{ fmtPct(m.improvementRate) }}
                  </span>
                  <span v-else class="text-gray-400">--</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <!-- 打卡频率统计 -->
      <Card>
        <h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
          <BarChart3 class="h-4 w-4 text-[#FF976A]" />
          打卡频率统计
        </h3>
        <div class="space-y-2">
          <div
            v-for="report in summary.studentReports"
            :key="report.studentId"
            class="flex items-center gap-3"
          >
            <span class="text-xs text-gray-700 w-12 shrink-0">{{ report.studentName }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
              <div
                class="absolute left-0 top-0 h-full rounded-full transition-all"
                :class="report.checkinStats.completionRate >= 0.8 ? 'bg-[#07C160]' : report.checkinStats.completionRate >= 0.5 ? 'bg-[#FF976A]' : 'bg-gray-400'"
                :style="{ width: `${Math.min(report.checkinStats.completionRate * 100, 100)}%` }"
              ></div>
              <span class="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white">
                {{ report.checkinStats.completeDays }}/{{ report.checkinStats.campDays }}天 ({{ fmtPct(report.checkinStats.completionRate) }})
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <VanTabbar class="custom-tabbar tabbar-orange print:hidden" :model-value="0">
      <VanTabbarItem @click="store.setCurrentView('dietitian-dashboard')">
        <template #icon><Users class="h-6 w-6" /></template>
        返回工作台
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
  .overflow-x-auto { overflow: visible !important; }
  .pb-20 { padding-bottom: 1rem !important; }
  .pt-12 { padding-top: 0 !important; }
}
</style>

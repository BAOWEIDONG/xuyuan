<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAppStore } from '../store/app';
import { NavBar, Card } from './ui';
import { Building2, TrendingDown, Users, Activity, Trophy, Flame, Sparkles, Download, ShieldCheck, ChevronRight } from 'lucide-vue-next';
import { Tabbar as VanTabbar, TabbarItem as VanTabbarItem } from 'vant';
import { MOCK_STUDENTS, MOCK_STUDENT_METRIC_VALUES } from '../mock/data';
import { generateDietitianSummary, generateEnterpriseReport } from '../lib/campReport';
import { exportElementAsImage } from '../lib/exportImage';

const store = useAppStore();

// 营养师端聚合统计（与结营统计页同一数据源）
const summary = computed(() =>
  generateDietitianSummary(
    MOCK_STUDENTS,
    store.metricConfigs,
    MOCK_STUDENT_METRIC_VALUES,
    store.dietRecords,
    store.exerciseRecords,
    store.weightRecords,
  ),
);

// 企业汇报版（匿名聚合）
const report = computed(() => generateEnterpriseReport(summary.value));

const fmt = (v: number | null, digits = 1): string => (v === null ? '--' : v.toFixed(digits));
const fmtPct = (v: number | null): string => (v === null ? '--' : `${Math.round(v * 100)}%`);

// 导出长图
const exportRef = ref<HTMLElement | null>(null);
const handleExport = () => {
  if (exportRef.value) {
    exportElementAsImage(exportRef.value, `企业汇报_健康训练营_${new Date().toISOString().split('T')[0]}`);
  }
};
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] pb-20 font-sans">
    <NavBar title="企业汇报版" :on-back="store.goBack">
      <template #right>
        <button class="text-[#07C160] hover:bg-green-50 p-2 rounded-full transition-colors" @click="handleExport">
          <Download class="h-5 w-5" />
        </button>
      </template>
    </NavBar>

    <div ref="exportRef" class="p-4 space-y-4">
      <!-- 隐私提示（导出时隐藏） -->
      <div class="flex items-start gap-2 bg-[#07C160]/5 border border-[#07C160]/15 rounded-xl px-3 py-2.5" data-html2canvas-ignore>
        <ShieldCheck class="w-4 h-4 text-[#07C160] shrink-0 mt-0.5" />
        <p class="text-[11px] text-gray-500 leading-relaxed">
          本页仅含匿名聚合数据，无任何学员个人健康信息，可放心导出发送给企业 HR。
        </p>
      </div>

      <!-- 顶部品牌卡片 -->
      <div class="bg-gradient-to-br from-[#07C160] to-[#06A952] rounded-2xl p-5 text-white shadow-lg">
        <div class="flex items-center gap-2 mb-1">
          <Building2 class="w-5 h-5" />
          <h2 class="text-lg font-bold">健康训练营 · 结营汇报</h2>
        </div>
        <p class="text-xs opacity-85 mb-4">{{ report.campDays }} 天 · {{ report.totalStudents }} 名员工参营</p>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="bg-white/15 rounded-lg py-3">
            <div class="text-2xl font-bold">{{ fmt(report.avgWeightLoss) }}<span class="text-xs font-normal">kg</span></div>
            <div class="text-[10px] opacity-80 mt-0.5">人均减重</div>
          </div>
          <div class="bg-white/15 rounded-lg py-3">
            <div class="text-2xl font-bold">{{ fmtPct(report.avgCompletionRate) }}</div>
            <div class="text-[10px] opacity-80 mt-0.5">平均打卡完成率</div>
          </div>
          <div class="bg-white/15 rounded-lg py-3">
            <div class="text-2xl font-bold">{{ report.abnormalImprovedTotal }}</div>
            <div class="text-[10px] opacity-80 mt-0.5">异常指标恢复(项次)</div>
          </div>
        </div>
      </div>

      <!-- 本期亮点 -->
      <Card v-if="report.highlights.length > 0">
        <h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
          <Sparkles class="h-4 w-4 text-[#FF976A]" />
          本期亮点
        </h3>
        <div class="space-y-2.5">
          <div v-for="(h, i) in report.highlights" :key="i" class="flex items-start gap-2.5">
            <span class="w-5 h-5 rounded-full bg-[#07C160]/10 text-[#07C160] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{{ i + 1 }}</span>
            <p class="text-sm text-gray-700 leading-relaxed">{{ h }}</p>
          </div>
        </div>
      </Card>

      <!-- 参与度 -->
      <Card>
        <h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
          <Users class="h-4 w-4 text-[#1677FF]" />
          参与情况
        </h3>
        <div class="grid grid-cols-2 gap-3 text-center">
          <div class="bg-gray-50 rounded-xl py-3">
            <div class="text-xl font-bold text-gray-900">{{ report.highCompletionCount }}<span class="text-xs text-gray-400 font-normal">/{{ report.totalStudents }}人</span></div>
            <div class="text-[10px] text-gray-500 mt-1">完成率≥80%的学员</div>
          </div>
          <div class="bg-gray-50 rounded-xl py-3">
            <div class="text-xl font-bold text-gray-900">{{ report.totalCheckinRecords }}</div>
            <div class="text-[10px] text-gray-500 mt-1">累计打卡次数</div>
          </div>
          <div class="bg-gray-50 rounded-xl py-3">
            <div class="text-xl font-bold text-gray-900">{{ (report.totalExerciseMinutes / 60).toFixed(0) }}<span class="text-xs text-gray-400 font-normal">小时</span></div>
            <div class="text-[10px] text-gray-500 mt-1">全员累计运动时长</div>
          </div>
          <div class="bg-gray-50 rounded-xl py-3">
            <div class="text-xl font-bold text-gray-900">{{ report.weightLossCount }}<span class="text-xs text-gray-400 font-normal">/{{ report.weightRecordCount }}人</span></div>
            <div class="text-[10px] text-gray-500 mt-1">体重下降的学员</div>
          </div>
        </div>
      </Card>

      <!-- 减重成果 -->
      <Card>
        <h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
          <TrendingDown class="h-4 w-4 text-[#07C160]" />
          减重成果
        </h3>
        <div class="flex items-center justify-between py-2 border-b border-gray-50">
          <span class="text-sm text-gray-500">人均减重</span>
          <span class="text-sm font-bold text-[#07C160]">{{ fmt(report.avgWeightLoss) }} kg</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-gray-50">
          <span class="text-sm text-gray-500">减重≥3kg 人数</span>
          <span class="text-sm font-bold text-gray-900">
            {{ report.weightGoalCount }} 人
            <span v-if="report.weightGoalRate !== null" class="text-xs text-[#07C160]">（{{ fmtPct(report.weightGoalCount / Math.max(report.totalStudents, 1)) }}）</span>
          </span>
        </div>
        <div class="flex items-center justify-between py-2">
          <span class="text-sm text-gray-500">异常指标恢复正常</span>
          <span class="text-sm font-bold text-[#07C160]">{{ report.abnormalImprovedTotal }} 项次</span>
        </div>
      </Card>

      <!-- 改善最好的指标 -->
      <Card v-if="report.topImprovedMetrics.length > 0">
        <h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
          <Trophy class="h-4 w-4 text-[#FF976A]" />
          改善最显著的指标
        </h3>
        <div class="space-y-3">
          <div v-for="(m, i) in report.topImprovedMetrics" :key="i" class="flex items-center gap-3">
            <span class="text-sm text-gray-700 w-28 shrink-0 truncate">{{ m.name }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
              <div
                class="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#07C160] to-[#4ade80]"
                :style="{ width: `${(m.improvementRate ?? 0) * 100}%` }"
              ></div>
            </div>
            <span class="text-xs font-bold text-[#07C160] w-10 text-right shrink-0">{{ fmtPct(m.improvementRate) }}</span>
          </div>
        </div>
        <p class="text-[10px] text-gray-400 mt-3">改善率 = 该指标改善人数 ÷ 有前后检测数据人数</p>
      </Card>

      <!-- 页脚 -->
      <div class="text-center py-3">
        <div class="flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Flame class="w-3.5 h-3.5" />
          <span>{{ report.campDays }}天健康训练营 · 专业营养师全程指导</span>
        </div>
        <p class="text-[10px] text-gray-300 mt-1">本报告仅含群体统计数据，不涉及任何个人健康信息</p>
      </div>
    </div>

    <!-- 入口：查看营养师明细版 -->
    <div class="px-4 pb-4" data-html2canvas-ignore>
      <button
        @click="store.setCurrentView('camp-summary')"
        class="w-full py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 flex items-center justify-center gap-1 active:bg-gray-50 transition-colors"
      >
        查看学员明细统计（仅营养师可见）
        <ChevronRight class="w-4 h-4 text-gray-400" />
      </button>
    </div>

    <VanTabbar class="custom-tabbar print:hidden" :model-value="0">
      <VanTabbarItem @click="store.setCurrentView('dietitian-dashboard')">
        <template #icon><Activity class="h-6 w-6" /></template>
        返回工作台
      </VanTabbarItem>
    </VanTabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAppStore } from '../store/app';
import { MOCK_STUDENTS } from '../mock/data';
import { NavBar, Card } from './ui';
import { rankStudents, rankStudentsThisWeek, getCurrentWeekRange } from '../lib/scoring';
import { Trophy, Download, ChevronRight, Info, RefreshCw } from 'lucide-vue-next';
import { Popup as VanPopup, showToast } from 'vant';

const store = useAppStore();
const highlightedId = ref<string | null>(null);
const showRules = ref(false);
const isRefreshing = ref(false);

// 总榜 / 周榜切换（仅展示维度，计分规则不变）
const rankMode = ref<'total' | 'week'>('total');

// 当前自然周日期范围（周一~周日），用于周榜展示
const weekRangeText = computed(() => {
  const { mondayStr, sundayStr } = getCurrentWeekRange();
  const [, m1, d1] = mondayStr.split('-');
  const [, m2, d2] = sundayStr.split('-');
  return `${parseInt(m1)}月${parseInt(d1)}日 - ${parseInt(m2)}月${parseInt(d2)}日`;
});

const handleRefresh = () => {
  isRefreshing.value = true;
  setTimeout(() => {
    isRefreshing.value = false;
    showToast({ message: '排名数据已更新', position: 'middle', duration: 2000 });
  }, 800);
};

const rankedStudents = computed(() =>
  rankMode.value === 'week'
    ? rankStudentsThisWeek(MOCK_STUDENTS, store.dietRecords, store.exerciseRecords)
    : rankStudents(MOCK_STUDENTS, store.dietRecords, store.exerciseRecords)
);

const handleExportCSV = () => {
  const BOM = '﻿';
  let csvContent = '排名,姓名,总积分,饮食积分,运动积分\n';

  rankedStudents.value.forEach((row) => {
    csvContent += `${row.rank},${row.name},${row.totalScore},${row.dietScore},${row.exerciseScore}\n`;
  });

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `学员积分排名_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handleRowClick = (studentId: string) => {
  if (store.user?.role === 'student' && store.user.id !== studentId) {
    showToast({ message: '仅可查看自己的明细', position: 'middle', duration: 2000 });
    return;
  }
  store.setSelectedStudentId(studentId);
  store.setCurrentView('pointsDetail');
};

const handleScrollToMe = () => {
  if (!store.user) return;
  const el = document.getElementById(`rank-row-${store.user.id}`);
  if (el) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    highlightedId.value = store.user.id;
    setTimeout(() => {
      highlightedId.value = null;
    }, 1500);
  }
};

const currentUserRank = computed(() => rankedStudents.value.find((s) => s.studentId === store.user?.id));

const medalConfig = (rank: number) =>
  rank === 1
    ? { bg: '#FDE047', border: '#EAB308' }
    : rank === 2
    ? { bg: '#E2E8F0', border: '#94A3B8' }
    : { bg: '#FDBA74', border: '#F97316' };

const rankNumberCls = (rank: number) =>
  rank === 1
    ? 'text-yellow-500 drop-shadow-md'
    : rank === 2
    ? 'text-gray-400 drop-shadow-md'
    : rank === 3
    ? 'text-amber-600 drop-shadow-md'
    : 'text-gray-300';
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] relative">
    <NavBar title="积分排行" :on-back="store.goBack">
      <template #right>
        <div class="flex items-center gap-2">
          <button @click="handleRefresh" :disabled="isRefreshing" class="text-gray-500 hover:text-gray-900 p-2">
            <RefreshCw :class="['w-5 h-5', isRefreshing ? 'animate-spin' : '']" />
          </button>
          <button v-if="store.user?.role === 'dietitian'" @click="handleExportCSV" class="text-gray-500 hover:text-gray-900 p-2">
            <Download class="w-5 h-5" />
          </button>
        </div>
      </template>
    </NavBar>

    <div class="flex-1 p-4 space-y-3 pb-8">
      <div class="bg-gradient-to-r from-[#FF976A] to-[#ffb191] rounded-2xl p-6 text-white shadow-lg mb-6 relative overflow-hidden">
        <div class="relative z-10">
          <template v-if="store.user?.role === 'dietitian'">
            <h2 class="text-xl font-bold mb-1">共 {{ rankedStudents.length }} 名学员参与排名</h2>
          </template>
          <template v-else>
            <h2 class="text-lg font-bold mb-1 leading-snug">
              当前我的排名位于 <span @click="handleScrollToMe" class="text-white border-b border-white/60 cursor-pointer pb-0.5">{{ currentUserRank?.rank || '--' }}</span> 位，<br />
              总积分 <span @click="store.user && handleRowClick(store.user.id)" class="text-white border-b border-white/60 cursor-pointer pb-0.5">{{ currentUserRank?.totalScore || 0 }}</span> 分
            </h2>
            <p class="text-xs opacity-90 mt-2">坚持打卡，健康生活每一天！</p>
          </template>
        </div>
        <Trophy class="absolute right-4 -bottom-4 w-24 h-24 text-white opacity-20" />
      </div>

      <div class="flex items-center justify-between -mt-3 mb-1">
        <!-- 周榜/总榜切换 -->
        <div class="flex bg-gray-100 rounded-full p-1">
          <button
            @click="rankMode = 'total'"
            :class="['px-4 py-1.5 rounded-full text-xs font-bold transition-all', rankMode === 'total' ? 'bg-white text-[#FF976A] shadow-sm' : 'text-gray-500']"
          >
            总榜
          </button>
          <button
            @click="rankMode = 'week'"
            :class="['px-4 py-1.5 rounded-full text-xs font-bold transition-all', rankMode === 'week' ? 'bg-white text-[#FF976A] shadow-sm' : 'text-gray-500']"
          >
            本周榜
          </button>
        </div>
        <button @click="showRules = true" class="flex items-center gap-1 text-xs text-gray-500 hover:text-[#FF976A] transition-colors">
          <Info class="w-3.5 h-3.5" />
          积分规则
        </button>
      </div>

      <!-- 周榜日期范围提示 -->
      <div v-if="rankMode === 'week'" class="flex items-center gap-1.5 text-xs text-[#FF976A] -mt-1 mb-2 pl-1">
        <span class="inline-block w-1 h-1 rounded-full bg-[#FF976A]"></span>
        <span>当前自然周：{{ weekRangeText }}（周一至周日）</span>
      </div>

      <!-- 周榜下积分标签提示 -->
      <div v-if="rankMode === 'week'" class="text-[10px] text-gray-400 text-right -mt-2 mb-1 pr-1">以下为本周积分</div>

      <Card
        v-for="student in rankedStudents"
        :key="student.studentId"
        :id="`rank-row-${student.studentId}`"
        :class="['p-4 flex items-center transition-all duration-300', store.user?.id === student.studentId ? 'bg-green-50/30' : '', highlightedId === student.studentId ? 'ring-2 ring-[#FF976A] bg-orange-50/50 scale-[1.02]' : '']"
      >
        <div class="w-12 mr-3 flex items-center justify-center shrink-0 relative">
          <span :class="['text-4xl font-black italic tracking-tighter', rankNumberCls(student.rank)]">
            {{ student.rank }}
          </span>
          <svg v-if="student.rank <= 3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="absolute -top-3 -right-3 w-8 h-8 drop-shadow-sm">
            <path d="M6 0L10.5 9H12V0H6Z" fill="#3B82F6" />
            <path d="M12 0V9H13.5L18 0H12Z" fill="#EF4444" />
            <circle cx="12" cy="14" r="8" :fill="medalConfig(student.rank).bg" :stroke="medalConfig(student.rank).border" stroke-width="1.5" />
            <circle cx="12" cy="14" r="5" fill="none" :stroke="medalConfig(student.rank).border" stroke-width="0.5" />
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <div class="font-bold text-gray-900 flex items-center gap-2 truncate">
            <span class="truncate">{{ student.name }}</span>
            <span v-if="store.user?.id === student.studentId" class="text-[10px] bg-[#07C160] text-white px-1.5 py-0.5 rounded shrink-0">我</span>
          </div>
        </div>

        <div
          :class="['flex items-center gap-1 pl-3 py-1 ml-2', store.user?.role === 'dietitian' || store.user?.id === student.studentId ? 'cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity' : 'opacity-80']"
          @click="handleRowClick(student.studentId)"
        >
          <div class="text-right flex flex-col items-end justify-center">
            <div class="text-[22px] font-black text-[#FF976A] leading-none tracking-tighter">{{ student.totalScore }}</div>
            <div class="text-[10px] text-gray-400 mt-1">{{ rankMode === 'week' ? '本周积分' : '积分详情' }}</div>
          </div>
          <ChevronRight :class="['w-4 h-4', store.user?.role === 'dietitian' || store.user?.id === student.studentId ? 'text-gray-300' : 'text-transparent']" />
        </div>
      </Card>
    </div>

    <VanPopup v-model:show="showRules" position="center" closeable close-icon-position="top-right" class="custom-popup">
      <div class="p-5 max-h-[80vh] ">
        <h3 class="font-bold text-gray-900 text-base mb-3">打卡积分规则说明</h3>
        <div class="text-sm text-gray-700 space-y-3 leading-relaxed">
          <p class="font-medium">本期健康训练营为期28天：</p>
          <p><span class="font-bold text-gray-900">饮食打卡：</span>饮食按一日三餐打卡，营养师对每餐进行评分（+2=较好落实计划 / +1=整体尚可但有改进空间 / 0=明显偏离计划），未批注不计分，单日饮食最高6分。</p>
          <p><span class="font-bold text-gray-900">运动打卡：</span>每日完成单次40分钟以上运动得1分基础分；营养师评分直接加分：+2（到位）再得2分，+1（尚可）再得1分。</p>
          <p>所有打卡积分累计后排名，积分越高名次越靠前，同分并列，对应名次均可兑换礼品，并列者享受同等激励。</p>
        </div>
      </div>
    </VanPopup>
  </div>
</template>

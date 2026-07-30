<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { format } from 'date-fns';
import { useAppStore } from '../store/app';
import { MOCK_STUDENTS } from '../mock/data';
import { NavBar, Card } from './ui';
import { Activity, Coffee, Calendar, FileText, UserCircle, Scale, PlayCircle, LogOut, Medal, Target, Trophy, Gift, Flame, BookOpen, Zap, MessageCircle, Bell, X, ChevronRight } from 'lucide-vue-next';
import { Tabbar as VanTabbar, TabbarItem as VanTabbarItem } from 'vant';
import { rankStudents } from '../lib/scoring';
import { getTodayQuote } from '../lib/motivationalQuotes';
import { calculateStreak } from '../lib/streak';
import { computeWeightMilestones, computeWeeklyChallenges, computeLuckyDraw } from '../lib/campActivities';

const store = useAppStore();

const todayStr = format(new Date(), 'yyyy-MM-dd');
const isMine = (r: { studentId?: string }) => r.studentId === store.user?.id || !r.studentId;

const latestWeight = computed(() => {
  const myRecords = store.weightRecords
    .filter(isMine)
    .sort((a, b) => b.date.localeCompare(a.date));
  return myRecords.length > 0 ? myRecords[0].weight : store.user?.weight || '--';
});

const scoreData = computed(() => {
  if (!store.user) return null;
  const ranked = rankStudents(MOCK_STUDENTS, store.dietRecords, store.exerciseRecords);
  return ranked.find((s) => s.studentId === store.user!.id) || null;
});

// 与前一名（更高分者）的分差
const gapToAhead = computed(() => {
  if (!store.user) return null;
  const ranked = rankStudents(MOCK_STUDENTS, store.dietRecords, store.exerciseRecords);
  const me = ranked.find((s) => s.studentId === store.user!.id);
  if (!me || me.rank <= 1) return null;
  // 找到刚好比我分高的最近一位
  const ahead = ranked
    .filter((s) => s.totalScore > me.totalScore)
    .sort((a, b) => a.totalScore - b.totalScore)[0];
  if (!ahead) return null;
  return ahead.totalScore - me.totalScore;
});

const todayQuote = getTodayQuote();

const streakData = computed(() => calculateStreak(store.exerciseRecords, store.dietRecords, store.weightRecords, store.user?.id));
const currentStreak = computed(() => streakData.value.currentStreak);

// ---- 趣味活动入口（营养师开关 + 学员有打卡记录才显示） ----
const hasAnyCheckin = computed(() => {
  if (!store.user) return false;
  return store.dietRecords.some(isMine) || store.exerciseRecords.some(isMine) || store.weightRecords.some(isMine);
});
const hasActivityEnabled = computed(() =>
  store.activityConfig.weightMilestone || store.activityConfig.weeklyChallenge || store.activityConfig.luckyDraw
);
const showActivitiesEntry = computed(() => hasActivityEnabled.value && hasAnyCheckin.value);

// 活动预览数据（用于首页入口卡片展示摘要）
const activityPreview = computed(() => {
  const items: { label: string; progress: string; color: string }[] = [];
  if (store.activityConfig.weightMilestone) {
    const myWeights = store.weightRecords.filter(isMine).sort((a, b) => a.date.localeCompare(b.date));
    const startW = myWeights.length > 0 ? myWeights[0].weight : store.user?.weight || null;
    const milestones = computeWeightMilestones(myWeights, startW);
    const topMilestone = milestones.find(m => !m.achieved) || milestones[milestones.length - 1];
    items.push({
      label: topMilestone.achieved ? topMilestone.label + ' ✓' : '减重 ' + Math.round(topMilestone.threshold * 100) + '%',
      progress: topMilestone.achieved ? '已达标' : Math.round(topMilestone.progress * 100) + '%',
      color: '#FF976A',
    });
  }
  if (store.activityConfig.weeklyChallenge) {
    const challenges = computeWeeklyChallenges(store.dietRecords, store.exerciseRecords, store.weightRecords, store.user?.id);
    const completed = challenges.filter(c => c.completed).length;
    const current = challenges.find(c => c.isCurrent);
    items.push({
      label: current ? current.title : '每周挑战',
      progress: completed + '/' + challenges.length + ' 周',
      color: '#1677FF',
    });
  }
  if (store.activityConfig.luckyDraw) {
    const lucky = computeLuckyDraw(store.dietRecords, store.exerciseRecords, store.weightRecords, store.user?.id);
    items.push({
      label: '全勤抽奖',
      progress: lucky.eligible ? '已入围 ✓' : Math.round(lucky.completionRate * 100) + '%',
      color: '#07C160',
    });
  }
  return items;
});

// ---- 昨日小结卡（今天首次打开时展示） ----
const yesterdayStr = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
// 同步读取 localStorage，避免返回首页时弹窗闪现
const _dailySummaryKey = `daily_summary_${store.user?.id || 'anon'}_${todayStr}`;
const dailySummaryDismissed = ref(!!localStorage.getItem(_dailySummaryKey));

const dailySummary = computed(() => {
  if (!store.user) return null;
  const meals = new Set(store.dietRecords.filter((r) => isMine(r) && r.date.startsWith(yesterdayStr)).map((r) => r.meal));
  const exerciseMins = store.exerciseRecords
    .filter((r) => isMine(r) && r.date.startsWith(yesterdayStr))
    .reduce((sum, r) => sum + (r.duration || 0), 0);
  const weights = store.weightRecords.filter((r) => isMine(r)).sort((a, b) => a.date.localeCompare(b.date));
  const yesterdayWeight = weights.filter((r) => r.date.startsWith(yesterdayStr)).pop();
  // 昨日体重 vs 前一天最近一条
  let weightChange: number | null = null;
  if (yesterdayWeight) {
    const before = weights.filter((r) => r.date < yesterdayStr);
    const prev = before[before.length - 1];
    if (prev) weightChange = parseFloat((yesterdayWeight.weight - prev.weight).toFixed(1));
  }
  // 昨日收到的最新一条营养师批注
  const comments = [
    ...store.dietRecords.filter((r) => isMine(r) && r.dietitianComment && (r.dietitianCommentDate || '').startsWith(yesterdayStr)),
    ...store.exerciseRecords.filter((r) => isMine(r) && r.dietitianComment && (r.dietitianCommentDate || '').startsWith(yesterdayStr)),
    ...store.weightRecords.filter((r) => isMine(r) && r.dietitianComment && (r.dietitianCommentDate || '').startsWith(yesterdayStr)),
  ].sort((a, b) => (b.dietitianCommentDate || '').localeCompare(a.dietitianCommentDate || ''));
  const latestComment = comments[0] || null;

  const didSomething = meals.size > 0 || exerciseMins > 0 || !!yesterdayWeight;
  if (!didSomething && !latestComment) return null;
  return { mealCount: meals.size, exerciseMins, weightChange, comment: latestComment };
});

const showDailySummary = computed(() => dailySummary.value !== null && !dailySummaryDismissed.value);
const dismissDailySummary = () => {
  dailySummaryDismissed.value = true;
  localStorage.setItem(_dailySummaryKey, '1');
};

// ---- 今日打卡状态 ----
const todayExerciseDone = computed(() => store.exerciseRecords.some((r) => isMine(r) && r.date.startsWith(todayStr)));
const todayWeightDone = computed(() => store.weightRecords.some((r) => isMine(r) && r.date.startsWith(todayStr)));
const todayDietMeals = computed(() => {
  const meals = new Set(store.dietRecords.filter((r) => isMine(r) && r.date.startsWith(todayStr)).map((r) => r.meal));
  return meals;
});
const todayDietDone = computed(() => todayDietMeals.value.size > 0);
const todayDietLabel = computed(() => {
  const count = todayDietMeals.value.size;
  if (count === 0) return '拍照上传';
  if (count >= 3) return '已完成 ✓';
  return `已记 ${count} 餐`;
});

// ---- 营养师未读批注（仅用于 tabbar badge 计数） ----
const unreadComments = computed(() => {
  const diet = store.dietRecords.filter((r) => isMine(r) && r.dietitianComment && !r.commentRead);
  const exercise = store.exerciseRecords.filter((r) => isMine(r) && r.dietitianComment && !r.commentRead);
  const weight = store.weightRecords.filter((r) => isMine(r) && r.dietitianComment && !r.commentRead);
  return [
    ...diet.map((r) => ({ ...r, _type: 'diet' as const })),
    ...exercise.map((r) => ({ ...r, _type: 'exercise' as const })),
    ...weight.map((r) => ({ ...r, _type: 'weight' as const })),
  ].sort((a, b) => (b.dietitianCommentDate || '').localeCompare(a.dietitianCommentDate || ''));
});

// 卡片入场动画
const visibleCards = ref<number[]>([]);
const showActivitiesCard = ref(false);
onMounted(() => {
  const delays = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
  delays.forEach((delay, idx) => {
    setTimeout(() => visibleCards.value.push(idx), delay);
  });
  setTimeout(() => showActivitiesCard.value = true, 80);
});
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F4F6F8] pb-28 font-sans relative">
    <!-- Dynamic Background Header -->
    <div class="relative pt-[calc(env(safe-area-inset-top)+2.5rem)] px-6 pb-8 bg-gradient-to-br from-[#07C160] via-[#06b558] to-[#03a14f] rounded-b-[32px] shadow-[0_10px_34px_-14px_rgba(7,193,96,0.5)] overflow-hidden">
      <div class="absolute -top-12 -right-12 w-64 h-64 bg-white/15 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-16 -left-10 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative z-10 flex justify-between items-center mb-6">
        <h1 class="text-sm font-bold text-white flex items-center gap-1.5 px-3 py-1.5 bg-white/15 rounded-full backdrop-blur-md shrink-0">
          <Medal class="h-4 w-4 text-amber-300 shrink-0" />
          <span class="truncate">健康训练营</span>
        </h1>
        <button @click="store.logout()" class="text-white/95 hover:text-white transition-colors flex items-center gap-1 text-xs bg-white/15 px-3 py-1.5 rounded-full backdrop-blur-md shrink-0 ml-2">
          <LogOut class="h-3 w-3 shrink-0" /> 退出
        </button>
      </div>

      <div class="relative z-10 flex items-start space-x-4">
        <div class="h-16 w-16 rounded-full bg-white/95 p-1 shadow-lg shrink-0 animate-pop-in">
          <div class="h-full w-full bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
            <UserCircle class="h-12 w-12 text-gray-400 shrink-0" />
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-black text-white tracking-tight truncate animate-pop-in" style="animation-delay: 0.1s;">你好，{{ store.user?.name || '学员' }}</h2>
          <div class="flex items-start gap-2 mt-2 animate-pop-in" style="animation-delay: 0.2s;">
            <span class="text-[11px] font-bold text-[#07C160] bg-white px-2 py-0.5 rounded-full tracking-wide shrink-0 mt-0.5">DAY {{ currentStreak }}</span>
            <span class="text-xs text-white/95 font-medium tracking-wide leading-snug min-h-[36px] break-words break-all">{{ todayQuote }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 px-5 pt-5 space-y-5 relative z-20">
      <!-- Streak banner -->
      <div :class="['bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm card-enter cursor-pointer hover:shadow-md transition-all', visibleCards.includes(0) ? 'card-enter-active' : '']" @click="store.setCurrentView('calendar')">
        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white shadow-lg">
          <Flame class="w-6 h-6" />
        </div>
        <div class="flex-1">
          <div class="text-xs text-orange-600 font-bold mb-0.5">连续打卡</div>
          <div class="text-2xl font-black text-gray-900">{{ currentStreak }} 天</div>
        </div>
        <div class="text-right">
          <div class="text-[10px] text-gray-500 mb-1">累计打卡</div>
          <div class="text-lg font-bold text-gray-700">{{ streakData.totalDays }} 天</div>
        </div>
        <Calendar class="w-4 h-4 text-orange-300 shrink-0" />
      </div>

      <!-- 趣味活动入口（营养师开关+学员有打卡才显示） -->
      <div
        v-if="showActivitiesEntry"
        :class="['card-enter bg-gradient-to-r from-[#FF976A] to-[#FF6B35] rounded-2xl p-4 shadow-lg shadow-orange-500/20 cursor-pointer active:scale-[0.98] transition-transform', showActivitiesCard ? 'card-enter-active' : '']"
        @click="store.setCurrentView('camp-activities')"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            <Zap class="w-5 h-5 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-sm font-black text-white">趣味活动</span>
              <span class="text-[10px] text-white/80 bg-white/15 px-1.5 py-0.5 rounded-full">{{ activityPreview.length }}项进行中</span>
            </div>
            <div class="flex flex-wrap gap-x-3 gap-y-0.5">
              <span v-for="item in activityPreview" :key="item.label" class="text-[11px] text-white/90 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ background: item.color }"></span>
                {{ item.label }}
                <span class="text-white/70">{{ item.progress }}</span>
              </span>
            </div>
          </div>
          <ChevronRight class="w-5 h-5 text-white/70 shrink-0" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 items-stretch">
        <Card :class="['flex flex-col justify-center p-5 cursor-pointer hover:shadow-lg transition-all border-0 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.14)] relative overflow-hidden h-full card-enter', visibleCards.includes(1) ? 'card-enter-active' : '']" @click="store.setCurrentView('weight-checkin')">
          <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#07C160]/20 to-teal-100 rounded-full blur-2xl transform translate-x-1/4 -translate-y-1/4 z-0 pointer-events-none"></div>
          <div class="relative z-10">
            <div class="flex items-center gap-1 mb-2">
              <Target class="w-4 h-4 text-[#07C160] shrink-0" />
              <div class="text-xs text-gray-500 font-bold truncate">最新体重</div>
            </div>
            <div class="flex items-end gap-1">
              <span class="text-3xl font-black text-gray-900 tracking-tighter truncate">{{ latestWeight }}</span>
              <span class="text-sm mb-1 text-gray-500 font-medium shrink-0">kg</span>
            </div>
          </div>
        </Card>

        <Card :class="['flex flex-col justify-center p-5 cursor-pointer hover:shadow-lg transition-all border-0 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.14)] relative overflow-hidden h-full card-enter', visibleCards.includes(2) ? 'card-enter-active' : '']" @click="store.setCurrentView('ranking')">
          <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FF976A]/20 to-orange-100 rounded-full blur-2xl transform translate-x-1/4 -translate-y-1/4 z-0 pointer-events-none"></div>
          <div class="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div class="flex items-center gap-1 mb-2">
                <Trophy class="w-4 h-4 text-[#FF976A] shrink-0" />
                <div class="text-xs text-gray-500 font-bold truncate">我的排名</div>
              </div>
              <div class="flex items-end gap-1">
                <span class="text-[28px] font-black text-gray-900 tracking-tighter truncate">第{{ scoreData?.rank || '--' }}位</span>
              </div>
            </div>
            <div class="text-xs text-gray-500 font-medium mt-1 truncate">总计 {{ scoreData?.totalScore || 0 }} 分</div>
            <div v-if="gapToAhead !== null" class="text-[10px] text-[#FF976A] font-bold mt-0.5">距前一名还差 {{ gapToAhead }} 分</div>
            <div v-else-if="scoreData?.rank === 1" class="text-[10px] text-yellow-500 font-bold mt-0.5">👑 你是第一名！</div>
          </div>
        </Card>
      </div>

      <div>
        <h3 class="text-sm font-bold text-gray-900 mb-3 ml-1 flex items-center gap-1.5">
          <div class="w-1.5 h-4 bg-[#07C160] rounded-full"></div>
          每日打卡任务
        </h3>
        <div class="grid grid-cols-3 gap-3">
          <!-- 运动 -->
          <Card :class="['flex flex-col items-center justify-center py-6 cursor-pointer transition-all border-0 shadow-sm card-enter relative', visibleCards.includes(3) ? 'card-enter-active' : '', todayExerciseDone ? 'opacity-90' : 'hover:ring-2 ring-[#07C160]']" @click="store.setCurrentView('exercise')">
            <div v-if="todayExerciseDone" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#07C160] flex items-center justify-center check-pop">
              <svg viewBox="0 0 12 12" class="w-3 h-3"><path d="M2 6.5 L4.8 9 L10 3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-path" /></svg>
            </div>
            <div :class="['w-12 h-12 rounded-full flex items-center justify-center text-white mb-3 shadow-sm transition-transform hover:scale-110', todayExerciseDone ? 'bg-gray-300' : 'bg-gradient-to-br from-[#07C160] to-green-500 animate-pulse']">
              <Activity class="h-6 w-6" />
            </div>
            <div class="text-sm font-bold text-gray-900 mb-0.5">运动打卡</div>
            <div :class="['text-[10px]', todayExerciseDone ? 'text-[#07C160] font-bold' : 'text-gray-400']">{{ todayExerciseDone ? '已完成 ✓' : '记录消耗' }}</div>
          </Card>

          <!-- 饮食 -->
          <Card :class="['flex flex-col items-center justify-center py-6 cursor-pointer transition-all border-0 shadow-sm card-enter relative', visibleCards.includes(4) ? 'card-enter-active' : '', todayDietDone ? 'opacity-90' : 'hover:ring-2 ring-[#FF976A]']" @click="store.setCurrentView('diet')">
            <div v-if="todayDietDone" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#07C160] flex items-center justify-center check-pop">
              <svg viewBox="0 0 12 12" class="w-3 h-3"><path d="M2 6.5 L4.8 9 L10 3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-path" /></svg>
            </div>
            <div :class="['w-12 h-12 rounded-full flex items-center justify-center text-white mb-3 shadow-sm transition-transform hover:scale-110', todayDietDone ? 'bg-gray-300' : 'bg-gradient-to-br from-[#FF976A] to-orange-400 animate-pulse']">
              <Coffee class="h-6 w-6" />
            </div>
            <div class="text-sm font-bold text-gray-900 mb-0.5">饮食打卡</div>
            <div :class="['text-[10px]', todayDietDone ? 'text-[#07C160] font-bold' : 'text-gray-400']">{{ todayDietLabel }}</div>
          </Card>

          <!-- 体重 -->
          <Card :class="['flex flex-col items-center justify-center py-6 cursor-pointer transition-all border-0 shadow-sm card-enter relative', visibleCards.includes(5) ? 'card-enter-active' : '', todayWeightDone ? 'opacity-90' : 'hover:ring-2 ring-[#1677FF]']" @click="store.setCurrentView('weight-checkin')">
            <div v-if="todayWeightDone" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#07C160] flex items-center justify-center check-pop">
              <svg viewBox="0 0 12 12" class="w-3 h-3"><path d="M2 6.5 L4.8 9 L10 3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-path" /></svg>
            </div>
            <div :class="['w-12 h-12 rounded-full flex items-center justify-center text-white mb-3 shadow-sm transition-transform hover:scale-110', todayWeightDone ? 'bg-gray-300' : 'bg-gradient-to-br from-[#1677FF] to-blue-500 animate-pulse']">
              <Scale class="h-6 w-6" />
            </div>
            <div class="text-sm font-bold text-gray-900 mb-0.5">体重打卡</div>
            <div :class="['text-[10px]', todayWeightDone ? 'text-[#07C160] font-bold' : 'text-gray-400']">{{ todayWeightDone ? '已完成 ✓' : '见证蜕变' }}</div>
          </Card>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-bold text-gray-900 mb-3 ml-1 flex items-center gap-1.5 mt-2">
          <div class="w-1.5 h-4 bg-[#04a551] rounded-full"></div>
          营期回顾与指导
        </h3>
        <div class="grid grid-cols-2 gap-3">
          <Card :class="['p-5 cursor-pointer hover:shadow-md transition-all border-0 shadow-sm flex flex-col justify-between h-32 bg-white card-enter', visibleCards.includes(6) ? 'card-enter-active' : '']" @click="store.setCurrentView('calendar')">
            <div class="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 mb-2">
              <Calendar class="h-5 w-5" />
            </div>
            <div>
              <div class="text-sm font-bold text-gray-900">打卡日历</div>
              <div class="text-[11px] text-gray-500 mt-0.5">查看历史记录</div>
            </div>
          </Card>

          <Card :class="['p-5 cursor-pointer hover:shadow-md transition-all border-0 shadow-sm flex flex-col justify-between h-32 bg-white card-enter', visibleCards.includes(7) ? 'card-enter-active' : '']" @click="store.setCurrentView('activities-list')">
            <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 mb-2">
              <PlayCircle class="h-5 w-5" />
            </div>
            <div>
              <div class="text-sm font-bold text-gray-900">锻炼活动</div>
              <div class="text-[11px] text-gray-500 mt-0.5">健康指导与教学</div>
            </div>
          </Card>

          <Card :class="['p-5 cursor-pointer hover:shadow-md transition-all border border-orange-100 flex flex-col justify-between h-32 bg-gradient-to-br from-orange-50 to-yellow-50 card-enter', visibleCards.includes(8) ? 'card-enter-active' : '']" @click="store.setCurrentView('reward')">
            <div class="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 mb-2">
              <Gift class="h-5 w-5" />
            </div>
            <div>
              <div class="text-sm font-bold text-gray-900">打卡奖励</div>
              <div class="text-[11px] text-gray-500 mt-0.5">坚持打卡领礼品</div>
            </div>
          </Card>

          <Card :class="['p-5 cursor-pointer hover:shadow-md transition-all border-0 shadow-sm flex flex-col justify-between h-32 bg-gradient-to-br from-[#07C160]/5 to-teal-50 card-enter', visibleCards.includes(9) ? 'card-enter-active' : '']" @click="store.setCurrentView('personal-journey')">
            <div class="w-10 h-10 rounded-xl bg-[#07C160]/10 flex items-center justify-center text-[#07C160] mb-2">
              <BookOpen class="h-5 w-5" />
            </div>
            <div>
              <div class="text-sm font-bold text-gray-900">个人历程</div>
              <div class="text-[11px] text-gray-500 mt-0.5">我的报告与成就</div>
            </div>
          </Card>
        </div>
      </div>
    </div>

    <!-- Bottom Nav (Vant Tabbar) -->
    <VanTabbar class="custom-tabbar" :model-value="0">
      <VanTabbarItem>
        <template #icon><Activity class="h-6 w-6" /></template>
        首页
      </VanTabbarItem>
      <VanTabbarItem @click="store.setCurrentView('messages')" :badge="unreadComments.length > 0 ? unreadComments.length : undefined">
        <template #icon><Bell class="h-6 w-6" /></template>
        消息
      </VanTabbarItem>
      <VanTabbarItem @click="store.setCurrentView('health-profile')">
        <template #icon><FileText class="h-6 w-6" /></template>
        档案
      </VanTabbarItem>
    </VanTabbar>

    <!-- 昨日小结弹层（今天首次打开时展示） -->
    <Teleport to="body">
      <Transition name="summary-fade">
        <div v-if="showDailySummary" class="fixed inset-0 z-[999] bg-black/40 flex items-end justify-center" @click.self="dismissDailySummary">
          <div class="w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 summary-slide-up">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-black text-gray-900 flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#07C160] to-teal-500 flex items-center justify-center">
                  <BookOpen class="w-4 h-4 text-white" />
                </div>
                昨日小结
              </h3>
              <button @click="dismissDailySummary" class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform">
                <X class="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <!-- 三项数据 -->
            <div class="grid grid-cols-3 gap-2 mb-4">
              <div class="bg-orange-50 rounded-xl p-3 text-center">
                <Coffee class="w-4 h-4 text-[#FF976A] mx-auto mb-1" />
                <div class="text-lg font-black text-gray-900">{{ dailySummary!.mealCount }}<span class="text-[10px] font-normal text-gray-400 ml-0.5">餐</span></div>
                <div class="text-[10px] text-gray-500">饮食打卡</div>
              </div>
              <div class="bg-green-50 rounded-xl p-3 text-center">
                <Activity class="w-4 h-4 text-[#07C160] mx-auto mb-1" />
                <div class="text-lg font-black text-gray-900">{{ dailySummary!.exerciseMins }}<span class="text-[10px] font-normal text-gray-400 ml-0.5">分钟</span></div>
                <div class="text-[10px] text-gray-500">运动时长</div>
              </div>
              <div class="bg-blue-50 rounded-xl p-3 text-center">
                <Scale class="w-4 h-4 text-[#1677FF] mx-auto mb-1" />
                <div v-if="dailySummary!.weightChange !== null" :class="['text-lg font-black', dailySummary!.weightChange < 0 ? 'text-[#07C160]' : dailySummary!.weightChange > 0 ? 'text-orange-500' : 'text-gray-900']">
                  {{ dailySummary!.weightChange > 0 ? '+' : '' }}{{ dailySummary!.weightChange }}<span class="text-[10px] font-normal text-gray-400 ml-0.5">kg</span>
                </div>
                <div v-else class="text-lg font-black text-gray-300">--</div>
                <div class="text-[10px] text-gray-500">体重变化</div>
              </div>
            </div>

            <!-- 营养师一句话 -->
            <div v-if="dailySummary!.comment" class="bg-[#07C160]/5 border border-[#07C160]/15 rounded-xl p-3 mb-4">
              <div class="flex items-center gap-1.5 mb-1">
                <MessageCircle class="w-3 h-3 text-[#07C160]" />
                <span class="text-[10px] font-bold text-[#07C160]">{{ dailySummary!.comment.dietitianName || '营养师' }} 昨天对你说</span>
              </div>
              <p class="text-xs text-gray-700 leading-relaxed line-clamp-2">{{ dailySummary!.comment.dietitianComment }}</p>
            </div>

            <button @click="dismissDailySummary" class="w-full py-3 rounded-xl bg-gradient-to-r from-[#07C160] to-[#06b558] text-white text-sm font-bold active:scale-[0.98] transition-transform shadow-lg shadow-[#07C160]/20">
              开启今天 →
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.animate-pop-in {
  animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.card-enter {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.card-enter-active {
  opacity: 1;
  transform: translateY(0);
}
/* 打卡完成勾：圆点弹入 + 对勾画线 */
@keyframes checkPop {
  0% { transform: scale(0); }
  60% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
.check-pop {
  animation: checkPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.check-path {
  stroke-dasharray: 14;
  stroke-dashoffset: 14;
  animation: checkDraw 0.3s ease-out 0.2s forwards;
}
@keyframes checkDraw {
  to { stroke-dashoffset: 0; }
}
/* 昨日小结弹层 */
.summary-slide-up {
  animation: summaryUp 0.35s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
}
@keyframes summaryUp {
  0% { transform: translateY(100%); }
  100% { transform: translateY(0); }
}
.summary-fade-enter-active,
.summary-fade-leave-active {
  transition: opacity 0.25s ease;
}
.summary-fade-enter-from,
.summary-fade-leave-to {
  opacity: 0;
}
</style>

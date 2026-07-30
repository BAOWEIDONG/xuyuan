<script setup lang="ts">
/**
 * 趣味活动管理看板（营养师端）
 *
 * 【流程】
 *   1. 三个活动开关（阶梯减重/每周挑战/全勤抽奖），开关后学员端 CampActivitiesView 同步展示/隐藏
 *   2. 全员达标进度总览
 *   3. 待审核：学员达成活动目标 -> 营养师审核通过 -> 学员端可领取
 *   4. 待发货：学员已领取（填了地址/选了方式）-> 营养师发货（填快递单号/确认线下）
 */
import { ref, computed } from 'vue';
import { useAppStore } from '../store/app';
import { NavBar, Card } from './ui';
import { Popup as VanPopup, showToast } from 'vant';
import { Zap, Scale, Calendar, PartyPopper, Settings, CheckCircle2, Clock, ChevronRight, Gift, Truck, HandCoins, Package } from 'lucide-vue-next';
import { Tabbar as VanTabbar, TabbarItem as VanTabbarItem, Switch as VanSwitch } from 'vant';
import { MOCK_STUDENTS } from '../mock/data';
import { computeWeightMilestones, computeWeeklyChallenges, computeLuckyDraw } from '../lib/campActivities';
import type { RewardClaim } from '../types';

const store = useAppStore();

// 活动开关
const cfg = computed(() => store.activityConfig);

// ---- 审核弹窗 ----
const showAuditModal = ref(false);
const auditTarget = ref<{ studentId: string; studentName: string; activityType: 'milestone' | 'weekly' | 'lucky'; activityLabel: string } | null>(null);
const selectedTierId = ref('');
const auditError = ref('');

// ---- 发货弹窗 ----
const showShipModal = ref(false);
const shipTarget = ref<RewardClaim | null>(null);
const trackingNumber = ref('');
const shipError = ref('');

// 全员进度
const studentProgress = computed(() =>
  MOCK_STUDENTS.map((s) => {
    const weights = store.weightRecords
      .filter((w) => w.studentId === s.id || w.studentId === undefined)
      .sort((a, b) => a.date.localeCompare(b.date));
    const startW = weights.length > 0 ? weights[0].weight : null;
    const milestones = computeWeightMilestones(weights, startW);
    const latestW = weights.length > 0 ? weights[weights.length - 1].weight : null;

    const challenges = computeWeeklyChallenges(store.dietRecords, store.exerciseRecords, store.weightRecords, s.id);
    const luckyDraw = computeLuckyDraw(store.dietRecords, store.exerciseRecords, store.weightRecords, s.id);

    const pendingMilestone = milestones.filter((m) => m.achieved).sort((a, b) => b.threshold - a.threshold)[0];

    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      weightLoss: startW && latestW ? +(startW - latestW).toFixed(1) : null,
      weightLossPercent: startW && latestW ? +((startW - latestW) / startW * 100).toFixed(1) : null,
      milestoneAchieved: !!pendingMilestone,
      milestoneLabel: pendingMilestone?.label || null,
      pendingMilestoneThreshold: pendingMilestone?.threshold || null,
      activeChallenge: challenges.find((c) => c.isCurrent)?.title || null,
      challengeCompletedCount: challenges.filter((c) => c.completed).length,
      luckyDrawEligible: luckyDraw.eligible,
      luckyDrawRate: luckyDraw.completionRate,
    };
  }),
);

// 学员是否已有某类活动的 claim（任何状态）
const getStudentActivityClaims = (studentId: string, activityType: string) =>
  store.rewardClaims.filter(c => {
    const tier = store.rewardTiers.find(t => t.id === c.tierId);
    return c.studentId === studentId && tier?.source === 'activity' && tier?.activityType === activityType;
  });

/**
 * 查找某里程碑阈值对应的奖品层级
 * threshold=0.03 -> 匹配 description 含 "3%" 的 tier
 */
function findMilestoneTier(threshold: number) {
  const percent = Math.round(threshold * 100);
  return store.rewardTiers.find(t =>
    t.source === 'activity' && t.activityType === 'milestone' &&
    t.description.includes(`${percent}%`)
  );
}

/** 学员是否已有某具体里程碑阈值的 claim */
function hasClaimForMilestone(studentId: string, threshold: number): boolean {
  const tier = findMilestoneTier(threshold);
  if (!tier) return false;
  return store.rewardClaims.some(c => c.studentId === studentId && c.tierId === tier.id);
}

// ---- 待审核列表（达成目标但尚无 claim） ----
const pendingAudit = computed(() => {
  const list: { studentId: string; studentName: string; activityType: 'milestone' | 'weekly' | 'lucky'; activityLabel: string; subLabel: string }[] = [];
  if (cfg.value.weightMilestone) {
    studentProgress.value.forEach(s => {
      // 检查学员是否达成了某个里程碑但没有对应的 claim
      if (s.milestoneAchieved && s.pendingMilestoneThreshold != null && !hasClaimForMilestone(s.id, s.pendingMilestoneThreshold)) {
        list.push({ studentId: s.id, studentName: s.name, activityType: 'milestone', activityLabel: s.milestoneLabel || '阶梯减重达标', subLabel: `减重 ${s.weightLoss}kg（${s.weightLossPercent}%）` });
      }
    });
  }
  if (cfg.value.weeklyChallenge) {
    studentProgress.value.forEach(s => {
      if (s.challengeCompletedCount >= 4 && getStudentActivityClaims(s.id, 'weekly').length === 0) {
        list.push({ studentId: s.id, studentName: s.name, activityType: 'weekly', activityLabel: '每周挑战完成', subLabel: `已完成 ${s.challengeCompletedCount}/4 周` });
      }
    });
  }
  if (cfg.value.luckyDraw) {
    studentProgress.value.forEach(s => {
      if (s.luckyDrawEligible && getStudentActivityClaims(s.id, 'lucky').length === 0) {
        list.push({ studentId: s.id, studentName: s.name, activityType: 'lucky', activityLabel: '全勤幸运抽奖', subLabel: `完成率 ${Math.round(s.luckyDrawRate * 100)}%` });
      }
    });
  }
  return list;
});

// ---- 待发货列表（学员已领取，等待营养师发货） ----
const pendingShip = computed(() => {
  return store.rewardClaims
    .filter(c => c.status === 'pending')
    .map(c => {
      const tier = store.rewardTiers.find(t => t.id === c.tierId);
      return { claim: c, tier };
    })
    .filter(item => item.tier?.source === 'activity');
});

// ---- 已发货/已发放列表 ----
const fulfilledClaims = computed(() => {
  return store.rewardClaims
    .filter(c => c.status === 'shipped' || c.status === 'in-person')
    .map(c => {
      const tier = store.rewardTiers.find(t => t.id === c.tierId);
      return { claim: c, tier };
    })
    .filter(item => item.tier?.source === 'activity')
    .sort((a, b) => b.claim.claimDate.localeCompare(a.claim.claimDate));
});

// 活动奖品候选
const activityTiers = computed(() => store.rewardTiers.filter(t => t.source === 'activity'));
const availableTiers = computed(() => {
  if (!auditTarget.value) return [];
  return activityTiers.value.filter(t => t.activityType === auditTarget.value!.activityType && t.stock > 0);
});

function openStudent(id: string) {
  store.selectedStudentId = id;
  store.setCurrentView('dietitian-student-detail');
}

// ---- 审核通过 ----
function openAuditModal(studentId: string, studentName: string, activityType: 'milestone' | 'weekly' | 'lucky', activityLabel: string) {
  auditTarget.value = { studentId, studentName, activityType, activityLabel };
  selectedTierId.value = '';
  auditError.value = '';
  showAuditModal.value = true;
}

function submitAudit() {
  if (!auditTarget.value) return;
  if (!selectedTierId.value) { auditError.value = '请选择奖品'; return; }

  const tier = store.rewardTiers.find(t => t.id === selectedTierId.value);
  if (!tier) { auditError.value = '奖品不存在'; return; }
  if (tier.stock <= 0) { auditError.value = '该奖品库存不足'; return; }

  // 创建 confirmed 状态的 claim，等待学员领取
  const claim: RewardClaim = {
    id: `rc_${Date.now()}`,
    tierId: tier.id,
    studentId: auditTarget.value.studentId,
    studentName: auditTarget.value.studentName,
    recipientName: '',
    recipientPhone: '',
    recipientAddress: '',
    claimDate: new Date().toISOString(),
    status: 'confirmed',
    activityType: auditTarget.value.activityType,
  };

  store.addRewardClaim(claim);
  // 扣减库存（审核通过即扣减，防止超发）
  store.updateRewardTier(tier.id, { stock: tier.stock - 1 });

  showAuditModal.value = false;
  showToast(`已审核通过：${auditTarget.value.studentName} - ${tier.name}，等待学员领取`);
}

// ---- 发货 ----
function openShipModal(claim: RewardClaim) {
  shipTarget.value = claim;
  trackingNumber.value = '';
  shipError.value = '';
  showShipModal.value = true;
}

function submitShip() {
  if (!shipTarget.value) return;
  if (shipTarget.value.deliveryMethod === 'shipped' && !trackingNumber.value.trim()) {
    shipError.value = '请输入快递单号';
    return;
  }

  const updates: Partial<RewardClaim> = {
    status: shipTarget.value.deliveryMethod === 'shipped' ? 'shipped' : 'in-person',
    shipDate: shipTarget.value.deliveryMethod === 'shipped' ? new Date().toISOString() : undefined,
    trackingNumber: shipTarget.value.deliveryMethod === 'shipped' ? trackingNumber.value.trim() : undefined,
    deliveredAt: shipTarget.value.deliveryMethod === 'in-person' ? new Date().toISOString() : undefined,
  };

  store.updateRewardClaim(shipTarget.value.id, updates);
  showShipModal.value = false;
  showToast(`已${shipTarget.value.deliveryMethod === 'shipped' ? '发货' : '确认线下发放'}：${shipTarget.value.studentName}`);
}

// 已审核但学员还没领取的 claim
const confirmedClaims = computed(() => {
  return store.rewardClaims
    .filter(c => c.status === 'confirmed')
    .map(c => {
      const tier = store.rewardTiers.find(t => t.id === c.tierId);
      return { claim: c, tier };
    })
    .filter(item => item.tier?.source === 'activity');
});
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] pb-20 font-sans">
    <NavBar title="趣味活动管理" :on-back="store.goBack" />

    <div class="p-4 space-y-4">
      <!-- 活动开关 -->
      <Card class="space-y-3">
        <h3 class="font-bold text-gray-900 text-sm flex items-center gap-2 border-b pb-2">
          <Settings class="h-4 w-4 text-[#FF976A]" />
          活动开关
        </h3>
        <p class="text-[10px] text-gray-400">关闭后学员端将隐藏对应活动模块</p>

        <div class="flex items-center justify-between py-2 border-b border-gray-50">
          <div class="flex items-center gap-2">
            <Scale class="h-4 w-4 text-[#07C160]" />
            <div>
              <div class="text-sm font-bold text-gray-900">阶梯减重达标奖</div>
              <div class="text-[10px] text-gray-400">3%/5% 两档，需确认体重秤照片</div>
            </div>
          </div>
          <VanSwitch :model-value="cfg.weightMilestone" @update:model-value="store.updateActivityConfig({ weightMilestone: $event })" size="22" />
        </div>

        <div class="flex items-center justify-between py-2 border-b border-gray-50">
          <div class="flex items-center gap-2">
            <Calendar class="h-4 w-4 text-[#1677FF]" />
            <div>
              <div class="text-sm font-bold text-gray-900">每周主题挑战</div>
              <div class="text-[10px] text-gray-400">4周4主题，自动计算无需确认</div>
            </div>
          </div>
          <VanSwitch :model-value="cfg.weeklyChallenge" @update:model-value="store.updateActivityConfig({ weeklyChallenge: $event })" size="22" />
        </div>

        <div class="flex items-center justify-between py-2">
          <div class="flex items-center gap-2">
            <PartyPopper class="h-4 w-4 text-[#FF976A]" />
            <div>
              <div class="text-sm font-bold text-gray-900">全勤幸运抽奖</div>
              <div class="text-[10px] text-gray-400">完成率≥80%进入抽奖池</div>
            </div>
          </div>
          <VanSwitch :model-value="cfg.luckyDraw" @update:model-value="store.updateActivityConfig({ luckyDraw: $event })" size="22" />
        </div>
      </Card>

      <!-- 待审核：学员达成目标，等待营养师确认 -->
      <Card v-if="pendingAudit.length > 0" class="space-y-3">
        <h3 class="font-bold text-gray-900 text-sm flex items-center gap-2 border-b pb-2">
          <Clock class="h-4 w-4 text-[#FF976A]" />
          待审核
          <span class="text-[10px] text-[#FF976A] bg-[#FF976A]/10 px-1.5 py-0.5 rounded-full">{{ pendingAudit.length }}</span>
        </h3>
        <p class="text-[10px] text-gray-400">学员已达成活动目标，审核通过后学员可领取奖品</p>
        <div class="space-y-2">
          <div
            v-for="item in pendingAudit"
            :key="`${item.studentId}-${item.activityType}`"
            class="flex items-center justify-between p-3 rounded-xl bg-[#FF976A]/5 border border-[#FF976A]/20"
          >
            <div class="cursor-pointer flex-1" @click="openStudent(item.studentId)">
              <div class="text-sm font-bold text-gray-900">{{ item.studentName }}</div>
              <div class="text-[10px] text-gray-500">
                {{ item.activityLabel }} · {{ item.subLabel }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="openAuditModal(item.studentId, item.studentName, item.activityType, item.activityLabel)"
                class="text-[10px] text-white bg-[#FF976A] px-3 py-1.5 rounded-full font-bold flex items-center gap-1"
              >
                <CheckCircle2 class="w-3 h-3" /> 审核通过
              </button>
              <ChevronRight class="w-4 h-4 text-gray-400 cursor-pointer" @click="openStudent(item.studentId)" />
            </div>
          </div>
        </div>
      </Card>

      <!-- 已审核，等待学员领取 -->
      <Card v-if="confirmedClaims.length > 0" class="space-y-3">
        <h3 class="font-bold text-gray-900 text-sm flex items-center gap-2 border-b pb-2">
          <Gift class="h-4 w-4 text-[#1677FF]" />
          已审核·待领取
          <span class="text-[10px] text-[#1677FF] bg-[#1677FF]/10 px-1.5 py-0.5 rounded-full">{{ confirmedClaims.length }}</span>
        </h3>
        <p class="text-[10px] text-gray-400">学员尚未填写领取信息，可点击查看详情</p>
        <div class="space-y-2">
          <div
            v-for="item in confirmedClaims"
            :key="item.claim.id"
            class="flex items-center justify-between p-3 rounded-xl bg-[#1677FF]/5 border border-[#1677FF]/15"
          >
            <div class="cursor-pointer flex-1" @click="openStudent(item.claim.studentId)">
              <div class="text-sm font-bold text-gray-900">{{ item.claim.studentName }}</div>
              <div class="text-[10px] text-gray-500">{{ item.tier?.name || '奖品' }} · 等待学员领取</div>
            </div>
            <span class="text-[10px] text-[#1677FF] font-bold bg-[#1677FF]/10 px-2 py-1 rounded-full">待领取</span>
          </div>
        </div>
      </Card>

      <!-- 待发货：学员已领取，等待营养师发货 -->
      <Card v-if="pendingShip.length > 0" class="space-y-3">
        <h3 class="font-bold text-gray-900 text-sm flex items-center gap-2 border-b pb-2">
          <Truck class="h-4 w-4 text-[#FF976A]" />
          待发货
          <span class="text-[10px] text-[#FF976A] bg-[#FF976A]/10 px-1.5 py-0.5 rounded-full">{{ pendingShip.length }}</span>
        </h3>
        <p class="text-[10px] text-gray-400">学员已填写领取信息，请发货或确认线下发放</p>
        <div class="space-y-2">
          <div
            v-for="item in pendingShip"
            :key="item.claim.id"
            class="p-3 rounded-xl bg-orange-50 border border-orange-200"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="cursor-pointer flex-1" @click="openStudent(item.claim.studentId)">
                <div class="text-sm font-bold text-gray-900">{{ item.claim.studentName }}</div>
                <div class="text-[10px] text-gray-500">{{ item.tier?.name || '奖品' }}</div>
              </div>
              <button
                @click="openShipModal(item.claim)"
                class="text-[10px] text-white bg-[#FF976A] px-3 py-1.5 rounded-full font-bold flex items-center gap-1"
              >
                <Truck class="w-3 h-3" />
                {{ item.claim.deliveryMethod === 'shipped' ? '填写单号' : '确认发放' }}
              </button>
            </div>
            <!-- 领取信息 -->
            <div class="text-[10px] text-gray-600 bg-white rounded-lg p-2 space-y-0.5">
              <div v-if="item.claim.deliveryMethod === 'shipped'" class="flex items-center gap-1">
                <Truck class="w-3 h-3 text-gray-400" />
                <span>快递：{{ item.claim.recipientName }} {{ item.claim.recipientPhone }}</span>
              </div>
              <div v-if="item.claim.deliveryMethod === 'shipped'" class="text-gray-400 pl-4">{{ item.claim.recipientAddress }}</div>
              <div v-if="item.claim.deliveryMethod === 'in-person'" class="flex items-center gap-1">
                <HandCoins class="w-3 h-3 text-gray-400" />
                <span>线下领取</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- 已发货/已发放记录 -->
      <Card v-if="fulfilledClaims.length > 0" class="space-y-3">
        <h3 class="font-bold text-gray-900 text-sm flex items-center gap-2 border-b pb-2">
          <Package class="h-4 w-4 text-[#07C160]" />
          已发放记录
          <span class="text-[10px] text-[#07C160] bg-[#07C160]/10 px-1.5 py-0.5 rounded-full">{{ fulfilledClaims.length }}</span>
        </h3>
        <div class="space-y-2">
          <div
            v-for="item in fulfilledClaims"
            :key="item.claim.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100"
          >
            <div class="flex-1">
              <div class="text-sm font-bold text-gray-900">{{ item.claim.studentName }}</div>
              <div class="text-[10px] text-gray-500">
                {{ item.tier?.name || '奖品' }} ·
                <span v-if="item.claim.status === 'shipped'">快递 {{ item.claim.trackingNumber || '' }}</span>
                <span v-else>线下发放</span>
              </div>
            </div>
            <span :class="['text-[10px] font-bold px-2 py-1 rounded-full', item.claim.status === 'shipped' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600']">
              {{ item.claim.status === 'shipped' ? '已发货' : '已发放' }}
            </span>
          </div>
        </div>
      </Card>

      <!-- 全员进度总览 -->
      <Card class="space-y-3">
        <h3 class="font-bold text-gray-900 text-sm flex items-center gap-2 border-b pb-2">
          <Zap class="h-4 w-4 text-[#FF976A]" />
          全员进度总览
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="text-[10px] text-gray-400 border-b border-gray-100">
                <th class="text-left py-2 px-1 font-medium">学员</th>
                <th v-if="cfg.weightMilestone" class="text-center py-2 px-1 font-medium">减重</th>
                <th v-if="cfg.weeklyChallenge" class="text-center py-2 px-1 font-medium">挑战</th>
                <th v-if="cfg.luckyDraw" class="text-center py-2 px-1 font-medium">完成率</th>
                <th class="text-right py-2 px-1 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in studentProgress"
                :key="s.id"
                class="border-b border-gray-50 cursor-pointer hover:bg-gray-50"
                @click="openStudent(s.id)"
              >
                <td class="py-2.5 px-1 font-bold text-gray-900">{{ s.name }}</td>
                <td v-if="cfg.weightMilestone" class="text-center py-2.5 px-1">
                  <span v-if="s.weightLoss !== null" :class="s.weightLoss > 0 ? 'text-[#07C160] font-bold' : 'text-gray-500'">
                    {{ s.weightLoss > 0 ? '-' : '' }}{{ s.weightLoss }}kg
                  </span>
                  <span v-else class="text-gray-300">--</span>
                  <span v-if="s.milestoneAchieved" class="ml-1 text-[9px] text-[#FF976A]">🏆</span>
                </td>
                <td v-if="cfg.weeklyChallenge" class="text-center py-2.5 px-1">
                  <span class="text-gray-700">{{ s.challengeCompletedCount }}/4</span>
                  <div v-if="s.activeChallenge" class="text-[9px] text-[#FF976A]">{{ s.activeChallenge }}</div>
                </td>
                <td v-if="cfg.luckyDraw" class="text-center py-2.5 px-1">
                  <span :class="s.luckyDrawEligible ? 'text-[#07C160] font-bold' : 'text-gray-500'">
                    {{ Math.round(s.luckyDrawRate * 100) }}%
                  </span>
                  <span v-if="s.luckyDrawEligible" class="ml-1 text-[9px]">✓</span>
                </td>
                <td class="text-right py-2.5 px-1">
                  <ChevronRight class="w-3.5 h-3.5 text-gray-300 inline" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <!-- 说明 -->
      <div class="text-center py-3">
        <p class="text-[10px] text-gray-300">审核通过 -> 学员领取 -> 营养师发货 · 进度由打卡记录实时计算</p>
      </div>
    </div>

    <!-- 审核弹窗（选择奖品） -->
    <VanPopup v-model:show="showAuditModal" position="bottom" round :style="{ maxHeight: '85%' }">
      <div class="p-5" v-if="auditTarget">
        <h3 class="text-lg font-bold text-gray-900 mb-1">审核通过</h3>
        <p class="text-xs text-gray-500 mb-4">{{ auditTarget.studentName }} · {{ auditTarget.activityLabel }}</p>

        <div class="mb-4">
          <label class="text-sm font-medium text-gray-700 block mb-2">选择奖品 <span class="text-red-500">*</span></label>
          <div v-if="availableTiers.length === 0" class="text-center py-6 bg-orange-50 rounded-xl border border-orange-100">
            <Gift class="w-8 h-8 text-orange-300 mx-auto mb-2" />
            <div class="text-xs text-orange-600">暂无可用奖品，请先在奖励配置中添加</div>
            <button @click="store.setCurrentView('reward-config'); showAuditModal = false" class="text-xs text-[#1677FF] font-bold mt-2">去配置</button>
          </div>
          <div v-else class="space-y-2">
            <label
              v-for="tier in availableTiers"
              :key="tier.id"
              :class="['flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors', selectedTierId === tier.id ? 'border-[#FF976A] bg-[#FF976A]/5' : 'border-gray-200']"
              @click="selectedTierId = tier.id; auditError = ''"
            >
              <img :src="tier.imageUrl" class="w-12 h-12 rounded-lg object-cover bg-gray-100" />
              <div class="flex-1">
                <div class="text-sm font-bold text-gray-900">{{ tier.name }}</div>
                <div class="text-[10px] text-gray-500">库存 {{ tier.stock }} 件</div>
              </div>
              <div :class="['w-5 h-5 rounded-full border-2 flex items-center justify-center', selectedTierId === tier.id ? 'border-[#FF976A] bg-[#FF976A]' : 'border-gray-300']">
                <CheckCircle2 v-if="selectedTierId === tier.id" class="w-3 h-3 text-white" />
              </div>
            </label>
          </div>
        </div>

        <div v-if="auditError" class="text-red-500 text-xs font-medium text-center mb-3">{{ auditError }}</div>

        <p class="text-[10px] text-gray-400 mb-3">审核通过后，学员端将收到通知并可领取奖品</p>

        <button
          v-if="availableTiers.length > 0"
          class="w-full py-3 rounded-xl bg-[#FF976A] text-white font-bold"
          @click="submitAudit"
        >确认审核通过</button>
      </div>
    </VanPopup>

    <!-- 发货弹窗 -->
    <VanPopup v-model:show="showShipModal" position="bottom" round :style="{ maxHeight: '70%' }">
      <div class="p-5" v-if="shipTarget">
        <h3 class="text-lg font-bold text-gray-900 mb-1">
          {{ shipTarget.deliveryMethod === 'shipped' ? '填写快递单号' : '确认线下发放' }}
        </h3>
        <p class="text-xs text-gray-500 mb-4">{{ shipTarget.studentName }}</p>

        <!-- 快递发货 -->
        <div v-if="shipTarget.deliveryMethod === 'shipped'" class="space-y-3 mb-4">
          <div class="bg-gray-50 rounded-xl p-3 space-y-1">
            <div class="text-xs text-gray-500">收货人：{{ shipTarget.recipientName }}</div>
            <div class="text-xs text-gray-500">手机号：{{ shipTarget.recipientPhone }}</div>
            <div class="text-xs text-gray-500">地址：{{ shipTarget.recipientAddress }}</div>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 block mb-1">快递单号 <span class="text-red-500">*</span></label>
            <input type="text" placeholder="请输入物流快递单号" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1677FF] text-sm font-mono" v-model="trackingNumber" @input="shipError = ''" />
          </div>
        </div>

        <!-- 线下发放 -->
        <div v-else class="bg-green-50 rounded-xl p-4 mb-4 text-center">
          <HandCoins class="w-10 h-10 text-[#07C160] mx-auto mb-2" />
          <div class="text-sm font-bold text-gray-900">确认线下发放</div>
          <div class="text-xs text-gray-500 mt-1">学员已选择线下领取，确认后将在消息中心通知学员</div>
        </div>

        <div v-if="shipError" class="text-red-500 text-xs font-medium text-center mb-3">{{ shipError }}</div>

        <button
          class="w-full py-3 rounded-xl text-white font-bold"
          :class="shipTarget.deliveryMethod === 'shipped' ? 'bg-[#1677FF]' : 'bg-[#07C160]'"
          @click="submitShip"
        >确认</button>
      </div>
    </VanPopup>

    <VanTabbar class="custom-tabbar tabbar-orange" :model-value="0">
      <VanTabbarItem @click="store.setCurrentView('dietitian-dashboard')">
        <template #icon><CheckCircle2 class="h-6 w-6" /></template>
        工作台
      </VanTabbarItem>
    </VanTabbar>
  </div>
</template>

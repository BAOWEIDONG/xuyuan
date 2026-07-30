<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAppStore } from '../store/app';
import { NavBar, Card } from './ui';
import { Popup as VanPopup, showToast } from 'vant';
import { Zap, Scale, Calendar, CheckCircle2, ChevronRight, PartyPopper, Activity, Gift, Truck, HandCoins, Package } from 'lucide-vue-next';
import { Tabbar as VanTabbar, TabbarItem as VanTabbarItem } from 'vant';
import { computeWeightMilestones, computeWeeklyChallenges, computeLuckyDraw } from '../lib/campActivities';
import type { RewardClaim } from '../types';

const store = useAppStore();

const isMine = (r: { studentId?: string }) => r.studentId === store.user?.id || !r.studentId;

// 学员体重记录
const myWeights = computed(() => store.weightRecords.filter(isMine).sort((a, b) => a.date.localeCompare(b.date)));
const startWeight = computed(() => myWeights.value.length > 0 ? myWeights.value[0].weight : store.user?.weight || null);

// 阶梯减重
const milestones = computed(() => computeWeightMilestones(myWeights.value, startWeight.value));
const latestWeight = computed(() => myWeights.value.length > 0 ? myWeights.value[myWeights.value.length - 1].weight : null);

/**
 * 查找某里程碑对应的奖品层级（通过描述中的百分比匹配）
 * milestone.threshold=0.03 -> 匹配 description 含 "3%" 的 tier
 */
function findMilestoneTier(threshold: number) {
  const percent = Math.round(threshold * 100);
  return store.rewardTiers.find(t =>
    t.source === 'activity' && t.activityType === 'milestone' &&
    t.description.includes(`${percent}%`)
  );
}

/** 获取当前学员某里程碑的 claim 状态 */
function milestoneClaimStatus(threshold: number): string | null {
  const tier = findMilestoneTier(threshold);
  if (!tier) return null;
  const claim = store.rewardClaims.find(c =>
    c.studentId === store.user?.id && c.tierId === tier.id
  );
  return claim?.status || null;
}

/** 里程碑状态文案 */
function milestoneStatusText(m: { achieved: boolean; threshold: number; progress: number }): string {
  if (!m.achieved) return `${Math.round(m.progress * 100)}%`;
  const status = milestoneClaimStatus(m.threshold);
  switch (status) {
    case 'confirmed': return '待领取';
    case 'pending': return '待发货';
    case 'shipped': return '已发货';
    case 'in-person': return '已发放';
    default: return '已达标·待确认';
  }
}

/** 里程碑状态样式 */
function milestoneStatusCls(m: { achieved: boolean; threshold: number }): string {
  if (!m.achieved) return 'bg-gray-100 text-gray-400';
  const status = milestoneClaimStatus(m.threshold);
  switch (status) {
    case 'confirmed': return 'bg-[#FF976A] text-white';
    case 'pending': return 'bg-blue-500 text-white';
    case 'shipped': return 'bg-blue-400 text-white';
    case 'in-person': return 'bg-[#07C160] text-white';
    default: return 'bg-[#07C160] text-white';
  }
}

// 每周挑战
const challenges = computed(() => computeWeeklyChallenges(store.dietRecords, store.exerciseRecords, store.weightRecords, store.user?.id));
const currentChallenge = computed(() => challenges.value.find((c) => c.isCurrent));

// 全勤抽奖
const luckyDraw = computed(() => computeLuckyDraw(store.dietRecords, store.exerciseRecords, store.weightRecords, store.user?.id));

// ---- 活动奖励（营养师审核通过后学员可领取） ----
const myActivityClaims = computed(() => {
  return store.rewardClaims
    .filter(c => {
      if (c.studentId !== store.user?.id) return false;
      const tier = store.rewardTiers.find(t => t.id === c.tierId);
      return tier?.source === 'activity';
    })
    .map(c => {
      const tier = store.rewardTiers.find(t => t.id === c.tierId);
      return { claim: c, tier };
    })
    .sort((a, b) => b.claim.claimDate.localeCompare(a.claim.claimDate));
});

// 可领取的奖励（营养师已审核通过）
const claimableRewards = computed(() => myActivityClaims.value.filter(item => item.claim.status === 'confirmed'));
// 待发货
const pendingShip = computed(() => myActivityClaims.value.filter(item => item.claim.status === 'pending'));
// 已完成
const fulfilled = computed(() => myActivityClaims.value.filter(item => item.claim.status === 'shipped' || item.claim.status === 'in-person'));

// ---- 领取弹窗 ----
const showClaimModal = ref(false);
const claimTarget = ref<RewardClaim | null>(null);
const deliveryMethod = ref<'shipped' | 'in-person'>('shipped');
const formData = ref({ name: store.user?.name || '', phone: store.user?.phone || '', address: '' });
const claimError = ref('');

function openClaimModal(claim: RewardClaim) {
  claimTarget.value = claim;
  deliveryMethod.value = 'shipped';
  formData.value = { name: store.user?.name || '', phone: store.user?.phone || '', address: '' };
  claimError.value = '';
  showClaimModal.value = true;
}

function submitClaim() {
  if (!claimTarget.value) return;
  if (deliveryMethod.value === 'shipped') {
    if (!formData.value.name.trim()) { claimError.value = '请输入收货人姓名'; return; }
    if (!/^1[3-9]\d{9}$/.test(formData.value.phone.trim())) { claimError.value = '请输入有效的11位手机号'; return; }
    if (!formData.value.address.trim()) { claimError.value = '请输入详细收货地址'; return; }
  }

  store.updateRewardClaim(claimTarget.value.id, {
    status: 'pending',
    deliveryMethod: deliveryMethod.value,
    recipientName: deliveryMethod.value === 'shipped' ? formData.value.name.trim() : store.user?.name || '',
    recipientPhone: deliveryMethod.value === 'shipped' ? formData.value.phone.trim() : store.user?.phone || '',
    recipientAddress: deliveryMethod.value === 'shipped' ? formData.value.address.trim() : '线下领取',
  });

  showClaimModal.value = false;
  showToast('领取成功！营养师将尽快为您发货');
}

const challengeStatusConfig = (status: string) => {
  switch (status) {
    case 'completed': return { text: '已完成', cls: 'text-[#07C160] bg-[#07C160]/10' };
    case 'active': return { text: '进行中', cls: 'text-[#FF976A] bg-[#FF976A]/10' };
    case 'missed': return { text: '已过期', cls: 'text-gray-400 bg-gray-100' };
    default: return { text: '未开始', cls: 'text-gray-400 bg-gray-100' };
  }
};

const activityTypeLabel = (type?: string) => {
  switch (type) {
    case 'milestone': return '阶梯减重达标';
    case 'weekly': return '每周挑战完成';
    case 'lucky': return '全勤幸运抽奖';
    default: return '活动奖励';
  }
};
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] pb-20 font-sans">
    <NavBar title="趣味活动" :on-back="store.goBack" />

    <div class="p-4 space-y-4">
      <!-- 顶部卡片 -->
      <div class="bg-gradient-to-br from-[#FF976A] to-[#e8855a] rounded-2xl p-5 text-white shadow-lg">
        <div class="flex items-center gap-2 mb-2">
          <Zap class="w-5 h-5" />
          <h2 class="text-lg font-bold">减重赢好礼</h2>
        </div>
        <p class="text-xs opacity-90 leading-relaxed">
          完成挑战赢奖励，与积分排名互不影响，人人都能参与！
        </p>
      </div>

      <!-- 活动奖励（审核通过后领取） -->
      <Card v-if="myActivityClaims.length > 0">
        <h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
          <Gift class="h-4 w-4 text-[#FF976A]" />
          我的活动奖励
        </h3>

        <!-- 可领取 -->
        <div v-for="item in claimableRewards" :key="item.claim.id" class="mb-3">
          <div class="rounded-xl p-4 border-2 border-[#FF976A]/30 bg-gradient-to-br from-orange-50 to-yellow-50 relative overflow-hidden">
            <div class="absolute top-2 right-2">
              <span class="text-[9px] font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full animate-pulse">可领取</span>
            </div>
            <div class="flex gap-3 items-start">
              <img v-if="item.tier?.imageUrl" :src="item.tier.imageUrl" class="w-16 h-16 rounded-xl object-cover bg-gray-100" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-bold text-gray-900">{{ item.tier?.name || '活动奖品' }}</div>
                <div class="text-[10px] text-gray-500 mt-0.5">{{ activityTypeLabel(item.claim.activityType) }} · 审核已通过</div>
                <button
                  @click="openClaimModal(item.claim)"
                  class="mt-2 w-full py-2 rounded-xl bg-gradient-to-r from-[#FF976A] to-[#FF6B35] text-white text-xs font-bold shadow-md active:scale-95 transition-transform"
                >
                  立即领取
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 待发货 -->
        <div v-for="item in pendingShip" :key="item.claim.id" class="mb-3">
          <div class="rounded-xl p-4 border border-blue-100 bg-blue-50/50">
            <div class="flex gap-3 items-start">
              <img v-if="item.tier?.imageUrl" :src="item.tier.imageUrl" class="w-16 h-16 rounded-xl object-cover bg-gray-100 opacity-80" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-bold text-gray-900">{{ item.tier?.name || '活动奖品' }}</div>
                <div class="text-[10px] text-gray-500 mt-0.5">{{ activityTypeLabel(item.claim.activityType) }}</div>
                <div class="mt-2 flex items-center gap-1.5">
                  <span class="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full flex items-center gap-1">
                    <Truck class="w-3 h-3" />
                    {{ item.claim.deliveryMethod === 'shipped' ? '待发货' : '待线下发放' }}
                  </span>
                </div>
                <div v-if="item.claim.deliveryMethod === 'shipped'" class="text-[10px] text-gray-400 mt-1.5">
                  {{ item.claim.recipientName }} · {{ item.claim.recipientAddress }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 已完成 -->
        <div v-for="item in fulfilled" :key="item.claim.id" class="mb-3 last:mb-0">
          <div class="rounded-xl p-4 border border-green-100 bg-green-50/30">
            <div class="flex gap-3 items-start">
              <img v-if="item.tier?.imageUrl" :src="item.tier.imageUrl" class="w-16 h-16 rounded-xl object-cover bg-gray-100" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <div class="text-sm font-bold text-gray-900">{{ item.tier?.name || '活动奖品' }}</div>
                  <CheckCircle2 class="w-4 h-4 text-[#07C160]" />
                </div>
                <div class="text-[10px] text-gray-500 mt-0.5">{{ activityTypeLabel(item.claim.activityType) }}</div>
                <div v-if="item.claim.status === 'shipped'" class="mt-2 text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg border border-blue-100">
                  <div class="font-bold flex items-center gap-1"><Package class="w-3 h-3" /> 已发货</div>
                  <div class="font-mono mt-0.5">单号: {{ item.claim.trackingNumber }}</div>
                </div>
                <div v-else class="mt-2 text-[10px] bg-green-50 text-green-600 px-2.5 py-1.5 rounded-lg border border-green-100 flex items-center gap-1">
                  <HandCoins class="w-3 h-3" /> 已线下领取
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- 阶梯减重达标奖 -->
      <Card v-if="store.activityConfig.weightMilestone">
        <h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
          <Scale class="h-4 w-4 text-[#07C160]" />
          阶梯减重达标奖
        </h3>
        <p class="text-[10px] text-gray-400 mb-3">按开营体重百分比计算，达标后上传体重秤照片，营养师确认即可领奖</p>

        <!-- 当前进度 -->
        <div v-if="startWeight && latestWeight" class="bg-gray-50 rounded-xl p-3 mb-3 text-center">
          <div class="text-xs text-gray-500 mb-1">开营 {{ startWeight }}kg -> 当前 {{ latestWeight }}kg</div>
          <div class="text-lg font-bold" :class="(startWeight - latestWeight) > 0 ? 'text-[#07C160]' : 'text-gray-900'">
            {{ (startWeight - latestWeight) > 0 ? '已减' : '增了' }} {{ Math.abs(startWeight - latestWeight).toFixed(1) }}kg
            <span class="text-xs font-normal text-gray-400">（{{ (Math.abs(startWeight - latestWeight) / startWeight * 100).toFixed(1) }}%）</span>
          </div>
        </div>

        <div class="space-y-3">
          <div
            v-for="m in milestones"
            :key="m.id"
            :class="['rounded-xl p-3 border transition-all', m.achieved ? 'border-[#07C160]/30 bg-[#07C160]/5' : 'border-gray-100 bg-white']"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ m.achieved ? '🎉' : '🎯' }}</span>
                <span class="text-sm font-bold" :class="m.achieved ? 'text-[#07C160]' : 'text-gray-900'">{{ m.label }}</span>
              </div>
              <span :class="['text-[10px] font-bold px-2 py-0.5 rounded-full', milestoneStatusCls(m)]">
                {{ milestoneStatusText(m) }}
              </span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="m.achieved ? 'bg-[#07C160]' : 'bg-[#FF976A]'"
                :style="{ width: `${m.progress * 100}%` }"
              ></div>
            </div>
            <div class="text-[10px] text-gray-400 mt-1.5">{{ m.reward }} · 需营养师确认体重秤照片</div>
          </div>
        </div>
      </Card>

      <!-- 每周主题挑战 -->
      <Card v-if="store.activityConfig.weeklyChallenge">
        <h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
          <Calendar class="h-4 w-4 text-[#1677FF]" />
          每周主题挑战
        </h3>
        <div class="space-y-3">
          <div
            v-for="c in challenges"
            :key="c.id"
            :class="['rounded-xl p-3 border transition-all', c.isCurrent ? 'border-[#FF976A]/30 bg-[#FF976A]/5' : c.completed ? 'border-[#07C160]/20 bg-[#07C160]/5' : 'border-gray-100 bg-white']"
          >
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ c.icon }}</span>
                <span class="text-sm font-bold text-gray-900">{{ c.title }}</span>
                <span v-if="c.isCurrent" class="text-[9px] bg-[#FF976A] text-white px-1.5 py-0.5 rounded-full font-bold">本周</span>
              </div>
              <span :class="['text-[10px] font-bold px-2 py-0.5 rounded-full', challengeStatusConfig(c.status).cls]">
                {{ challengeStatusConfig(c.status).text }}
              </span>
            </div>
            <p class="text-xs text-gray-500 mb-2">{{ c.description }}</p>
            <div class="flex items-center gap-2">
              <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :class="c.completed ? 'bg-[#07C160]' : 'bg-[#FF976A]'"
                  :style="{ width: `${c.progress * 100}%` }"
                ></div>
              </div>
              <span class="text-[10px] text-gray-400 shrink-0">{{ c.progressText }}</span>
            </div>
          </div>
        </div>
      </Card>

      <!-- 全勤幸运抽奖 -->
      <Card v-if="store.activityConfig.luckyDraw">
        <h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
          <PartyPopper class="h-4 w-4 text-[#FF976A]" />
          全勤幸运抽奖
        </h3>
        <p class="text-[10px] text-gray-400 mb-3">打卡完成率 ≥80% 即可进入抽奖池，结营时抽取幸运学员送出特别礼品</p>

        <div :class="['rounded-xl p-4 text-center border', luckyDraw.eligible ? 'border-[#07C160]/30 bg-[#07C160]/5' : 'border-gray-100 bg-gray-50']">
          <div class="text-2xl mb-1">{{ luckyDraw.eligible ? '🎊' : '🍀' }}</div>
          <div class="text-sm font-bold" :class="luckyDraw.eligible ? 'text-[#07C160]' : 'text-gray-700'">
            {{ luckyDraw.eligible ? '恭喜！你已进入抽奖池' : '继续加油，还差一点点' }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            完成率 {{ Math.round(luckyDraw.completionRate * 100) }}%（{{ luckyDraw.progressText }}）
            <template v-if="!luckyDraw.eligible">
              ，目标 80%
            </template>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="luckyDraw.eligible ? 'bg-[#07C160]' : 'bg-[#FF976A]'"
              :style="{ width: `${Math.min(luckyDraw.completionRate / 0.8 * 100, 100)}%` }"
            ></div>
          </div>
        </div>
      </Card>

      <!-- 底部说明 -->
      <div v-if="!store.activityConfig.weightMilestone && !store.activityConfig.weeklyChallenge && !store.activityConfig.luckyDraw" class="text-center py-10 bg-white rounded-2xl border border-gray-100">
        <div class="w-14 h-14 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
          <Zap class="w-7 h-7 text-gray-300" />
        </div>
        <div class="text-sm font-bold text-gray-400">活动暂未开启</div>
        <div class="text-xs text-gray-300 mt-1">营养师正在准备中，请稍后再来</div>
      </div>

      <div v-else class="text-center py-3">
        <p class="text-[10px] text-gray-300">活动奖励与积分排名互不影响，人人可参与</p>
        <p class="text-[10px] text-gray-300 mt-0.5">具体奖品以企业/营养师通知为准</p>
      </div>
    </div>

    <!-- 领取弹窗 -->
    <VanPopup v-model:show="showClaimModal" position="bottom" round :style="{ maxHeight: '90%' }">
      <div class="p-5" v-if="claimTarget">
        <h3 class="text-lg font-bold text-gray-900 mb-1">领取活动奖励</h3>
        <p class="text-xs text-gray-500 mb-4">{{ activityTypeLabel(claimTarget.activityType) }}</p>

        <!-- 奖品信息 -->
        <div class="bg-gradient-to-r from-orange-50 to-yellow-50 p-3 rounded-xl mb-4 flex gap-3 items-center border border-orange-100">
          <img v-if="claimTarget.tierId && store.rewardTiers.find(t => t.id === claimTarget.tierId)?.imageUrl" :src="store.rewardTiers.find(t => t.id === claimTarget.tierId)!.imageUrl" class="w-12 h-12 rounded-lg object-cover" />
          <div>
            <div class="text-sm font-bold text-gray-900">{{ store.rewardTiers.find(t => t.id === claimTarget.tierId)?.name || '活动奖品' }}</div>
            <div class="text-xs text-orange-600 mt-0.5">营养师已审核通过</div>
          </div>
        </div>

        <!-- 领取方式 -->
        <div class="mb-4">
          <label class="text-sm font-medium text-gray-700 block mb-2">领取方式</label>
          <div class="flex gap-2">
            <button
              :class="['flex-1 py-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5', deliveryMethod === 'shipped' ? 'border-[#1677FF] bg-[#1677FF]/5 text-[#1677FF]' : 'border-gray-200 text-gray-500']"
              @click="deliveryMethod = 'shipped'"
            >
              <Truck class="w-4 h-4" /> 快递邮寄
            </button>
            <button
              :class="['flex-1 py-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5', deliveryMethod === 'in-person' ? 'border-[#07C160] bg-[#07C160]/5 text-[#07C160]' : 'border-gray-200 text-gray-500']"
              @click="deliveryMethod = 'in-person'"
            >
              <HandCoins class="w-4 h-4" /> 线下领取
            </button>
          </div>
        </div>

        <!-- 快递信息表单 -->
        <div v-if="deliveryMethod === 'shipped'" class="space-y-4 mb-6">
          <div>
            <label class="text-sm font-medium text-gray-700 block mb-1">收货人 <span class="text-red-500">*</span></label>
            <input type="text" placeholder="请输入姓名" class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white text-sm transition-colors" v-model="formData.name" @input="claimError = ''" />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 block mb-1">手机号 <span class="text-red-500">*</span></label>
            <input type="tel" placeholder="请输入11位手机号" maxlength="11" class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white text-sm transition-colors" v-model="formData.phone" @input="claimError = ''" />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 block mb-1">详细地址 <span class="text-red-500">*</span></label>
            <textarea placeholder="省市区、街道、小区、楼栋及门牌号" class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white text-sm h-20 resize-none transition-colors" v-model="formData.address" @input="claimError = ''"></textarea>
          </div>
        </div>

        <!-- 线下领取说明 -->
        <div v-else class="bg-green-50 rounded-xl p-4 mb-6 text-center">
          <HandCoins class="w-10 h-10 text-[#07C160] mx-auto mb-2" />
          <div class="text-sm font-bold text-gray-900">线下领取</div>
          <div class="text-xs text-gray-500 mt-1">提交后营养师将与你联系安排线下领取</div>
        </div>

        <div v-if="claimError" class="text-red-500 text-xs font-medium text-center mb-3">{{ claimError }}</div>

        <button class="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF976A] to-[#FF6B35] text-white font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-transform" @click="submitClaim">
          确认领取
        </button>
      </div>
    </VanPopup>

    <VanTabbar class="custom-tabbar" :model-value="0">
      <VanTabbarItem @click="store.setCurrentView('dashboard')">
        <template #icon><Activity class="h-6 w-6" /></template>
        首页
      </VanTabbarItem>
    </VanTabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { format } from 'date-fns';
import { calculateStreak } from '../lib/streak';
import { useAppStore } from '../store/app';
import { NavBar, Card } from './ui';
import { Popup as VanPopup } from 'vant';
import { Gift, Lock, CheckCircle2, Check, Sparkles, Trophy, Package, Flame } from 'lucide-vue-next';
import type { RewardTier } from '../types';

const store = useAppStore();
const showClaimModal = ref(false);
const selectedTier = ref<RewardTier | null>(null);
const formData = ref({ name: store.user?.name || '', phone: store.user?.phone || '', address: '' });
const formError = ref('');

const streakData = computed(() => calculateStreak(store.exerciseRecords, store.dietRecords, store.weightRecords, store.user?.id));
const currentStreak = computed(() => streakData.value.currentStreak);
const totalDays = computed(() => streakData.value.totalDays);

const myClaims = computed(() => store.rewardClaims.filter(c => c.studentId === store.user?.id));
const shippedClaims = computed(() => myClaims.value.filter(c => c.status === 'shipped'));
const sortedTiers = computed(() => [...store.rewardTiers].filter(t => t.source !== 'activity').sort((a, b) => a.requiredDays - b.requiredDays));
const maxRequiredDays = computed(() => Math.max(...store.rewardTiers.map(t => t.requiredDays), 1));
const nextTier = computed(() => sortedTiers.value.find(t => currentStreak.value < t.requiredDays));
const daysToNext = computed(() => nextTier.value ? nextTier.value.requiredDays - currentStreak.value : 0);

const getTierState = (tier: RewardTier) => {
  const claimed = myClaims.value.find(c => c.tierId === tier.id);
  if (claimed) return 'claimed';
  if (currentStreak.value >= tier.requiredDays && tier.stock > 0) return 'unlocked';
  if (currentStreak.value >= tier.requiredDays && tier.stock <= 0) return 'outOfStock';
  return 'locked';
};

const handleClaimClick = (tier: RewardTier) => {
  selectedTier.value = tier;
  showClaimModal.value = true;
  formError.value = '';
};

const submitClaim = () => {
  if (!formData.value.name.trim()) { formError.value = '请输入收货人姓名'; return; }
  if (!/^1[3-9]\d{9}$/.test(formData.value.phone.trim())) { formError.value = '请输入有效的11位手机号'; return; }
  if (!formData.value.address.trim()) { formError.value = '请输入详细收货地址'; return; }
  if (selectedTier.value && store.user) {
    store.addRewardClaim({
      id: `claim_${Date.now()}`, tierId: selectedTier.value.id, studentId: store.user.id,
      studentName: store.user.name, recipientName: formData.value.name.trim(),
      recipientPhone: formData.value.phone.trim(), recipientAddress: formData.value.address.trim(),
      claimDate: new Date().toISOString(), status: 'pending',
    });
    store.updateRewardTier(selectedTier.value.id, { stock: Math.max(0, selectedTier.value.stock - 1) });
    showClaimModal.value = false;
    formData.value.address = '';
  }
};

// 卡片入场动画延迟
const visibleCards = ref<number[]>([]);
onMounted(() => {
  sortedTiers.value.forEach((_, idx) => {
    setTimeout(() => visibleCards.value.push(idx), 120 * idx);
  });
});
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] relative">
    <NavBar title="打卡奖励" :on-back="store.goBack" />

    <!-- Shipped notification -->
    <Transition name="slide-down">
      <div v-if="shippedClaims.length > 0" class="bg-blue-50 text-blue-600 px-4 py-2.5 text-xs font-medium flex items-center gap-1.5 border-b border-blue-100">
        <Package class="w-4 h-4 shrink-0 animate-bounce" />
        您有 {{ shippedClaims.length }} 个包裹已发出，请注意查收！
      </div>
    </Transition>

    <!-- Header with journey path -->
    <div class="relative overflow-hidden bg-gradient-to-br from-[#FF6B35] via-[#F7941D] to-[#FFB627] px-6 pt-8 pb-10 text-white rounded-b-[28px] shadow-lg shadow-orange-500/20">
      <!-- Decorative -->
      <div class="absolute -top-20 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-yellow-300/10 rounded-full blur-3xl pointer-events-none animate-pulse" style="animation-delay: 1s;"></div>

      <div class="relative z-10">
        <!-- Stats row -->
        <div class="flex justify-between items-end mb-1">
          <div class="animate-pop-in">
            <div class="flex items-center gap-1.5 text-white/80 text-xs mb-1">
              <Flame class="w-3.5 h-3.5" /> 连续打卡
            </div>
            <div class="text-5xl font-black tracking-tighter">{{ currentStreak }}<span class="text-lg font-normal ml-1">天</span></div>
          </div>
          <div class="text-right animate-pop-in" style="animation-delay: 0.15s;">
            <div class="text-white/80 text-xs mb-1">累计打卡</div>
            <div class="text-2xl font-bold">{{ totalDays }}<span class="text-sm font-normal ml-1">天</span></div>
          </div>
        </div>

        <!-- Next reward hint -->
        <Transition name="fade-up">
          <div v-if="nextTier" class="mt-4 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5 flex items-center gap-2 animate-shimmer">
            <Sparkles class="w-4 h-4 text-yellow-200 shrink-0 animate-spin-slow" />
            <span class="text-xs font-medium">再坚持 <span class="font-black text-yellow-200 text-sm">{{ daysToNext }}</span> 天，即可解锁「{{ nextTier.name }}」</span>
          </div>
        </Transition>
      </div>

      <!-- Milestone path -->
      <div class="relative z-10 mt-6 px-2">
        <div class="relative flex justify-between items-center">
          <!-- Connecting line -->
          <div class="absolute top-5 left-0 right-0 h-1 bg-white/20 rounded-full"></div>
          <div class="absolute top-5 left-0 h-1 bg-white rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]" :style="{ width: `${Math.min((currentStreak / maxRequiredDays) * 100, 100)}%` }"></div>

          <!-- Milestone dots -->
          <div v-for="tier in sortedTiers" :key="tier.id" class="relative flex flex-col items-center z-10" style="width: 0;">
            <div :class="[
              'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500',
              getTierState(tier) === 'claimed' ? 'bg-white border-white scale-110 shadow-lg' :
              getTierState(tier) === 'unlocked' ? 'bg-yellow-300 border-yellow-200 animate-pulse shadow-lg shadow-yellow-300/50 scale-110' :
              'bg-orange-400/50 border-white/30'
            ]">
              <CheckCircle2 v-if="getTierState(tier) === 'claimed'" class="w-5 h-5 text-orange-500" />
              <Gift v-else-if="getTierState(tier) === 'unlocked'" class="w-5 h-5 text-orange-600 animate-bounce" />
              <Lock v-else class="w-4 h-4 text-white/60" />
            </div>
            <div :class="['text-[10px] mt-1.5 font-bold whitespace-nowrap transition-colors', currentStreak >= tier.requiredDays ? 'text-white' : 'text-white/50']">
              {{ tier.requiredDays }}天
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reward cards -->
    <div class="p-4 space-y-4">
      <!-- Gift cards -->
      <div v-for="(tier, idx) in sortedTiers" :key="tier.id" :class="['card-enter', visibleCards.includes(idx) ? 'card-enter-active' : '']">
        <!-- Locked card -->
        <div v-if="getTierState(tier) === 'locked'" class="bg-white rounded-2xl p-4 flex gap-4 border border-gray-100 shadow-sm relative overflow-hidden transition-transform hover:-translate-y-0.5">
          <div class="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-2xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
          <div class="w-20 h-20 rounded-2xl bg-gray-100 shrink-0 overflow-hidden relative border border-gray-100 cursor-pointer" @click="store.openImagePreview([tier.imageUrl], 0)">
            <img :src="tier.imageUrl" :alt="tier.name" class="w-full h-full object-cover opacity-50" />
            <div class="absolute inset-0 bg-gray-900/30 flex items-center justify-center">
              <Lock class="w-6 h-6 text-white/80" />
            </div>
          </div>
          <div class="flex-1 flex flex-col justify-center min-w-0 relative">
            <h3 class="font-bold text-gray-400 text-base mb-1 truncate">{{ tier.name }}</h3>
            <div class="text-xs text-gray-400 font-medium mb-2">连续打卡 {{ tier.requiredDays }} 天解锁</div>
            <div class="flex items-center gap-1.5">
              <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-orange-300 to-yellow-400 rounded-full transition-all duration-700" :style="{ width: `${Math.min((currentStreak / tier.requiredDays) * 100, 100)}%` }"></div>
              </div>
              <span class="text-[10px] text-gray-400 font-medium shrink-0">{{ currentStreak }}/{{ tier.requiredDays }}</span>
            </div>
          </div>
        </div>

        <!-- Unlocked card -->
        <div v-else-if="getTierState(tier) === 'unlocked'" class="bg-white rounded-2xl p-4 flex gap-4 border-2 border-orange-200 shadow-md relative overflow-hidden animate-glow">
          <div class="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-orange-100 to-yellow-50 rounded-full blur-2xl transform translate-x-1/4 -translate-y-1/4 pointer-events-none"></div>
          <div class="absolute top-2 right-2 z-10">
            <div class="flex items-center gap-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
              <Sparkles class="w-2.5 h-2.5" /> 可领取
            </div>
          </div>
          <div class="w-20 h-20 rounded-2xl bg-gray-100 shrink-0 overflow-hidden relative border border-orange-100 cursor-pointer shadow-sm transition-transform hover:scale-105" @click="store.openImagePreview([tier.imageUrl], 0)">
            <img :src="tier.imageUrl" :alt="tier.name" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1 flex flex-col justify-center min-w-0 relative">
            <h3 class="font-bold text-gray-900 text-base mb-1 truncate">{{ tier.name }}</h3>
            <div class="text-xs text-orange-500 font-medium mb-2 flex items-center gap-1">
              <Trophy class="w-3 h-3 animate-bounce" /> 已连续打卡 {{ tier.requiredDays }} 天，恭喜解锁！
            </div>
            <button @click="handleClaimClick(tier)" class="w-full py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold shadow-md shadow-orange-500/30 active:scale-95 transition-transform hover:shadow-lg hover:shadow-orange-500/40">
              立即领取
            </button>
          </div>
        </div>

        <!-- Out of stock card -->
        <div v-else-if="getTierState(tier) === 'outOfStock'" class="bg-white rounded-2xl p-4 flex gap-4 border border-gray-100 shadow-sm relative overflow-hidden opacity-70">
          <div class="w-20 h-20 rounded-2xl bg-gray-100 shrink-0 overflow-hidden relative border border-gray-100 cursor-pointer" @click="store.openImagePreview([tier.imageUrl], 0)">
            <img :src="tier.imageUrl" :alt="tier.name" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1 flex flex-col justify-center min-w-0">
            <h3 class="font-bold text-gray-500 text-base mb-1 truncate">{{ tier.name }}</h3>
            <div class="text-xs text-gray-400 font-medium mb-2">已解锁但库存不足</div>
            <div class="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg text-center font-medium">已领完，待补货</div>
          </div>
        </div>

        <!-- Claimed card -->
        <div v-else class="bg-white rounded-2xl p-4 flex gap-4 border border-green-100 shadow-sm relative overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full blur-2xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
          <div class="w-20 h-20 rounded-2xl bg-gray-100 shrink-0 overflow-hidden relative border border-green-100 cursor-pointer" @click="store.openImagePreview([tier.imageUrl], 0)">
            <img :src="tier.imageUrl" :alt="tier.name" class="w-full h-full object-cover" />
            <div class="absolute top-1 right-1 w-5 h-5 bg-[#07C160] rounded-full flex items-center justify-center">
              <CheckCircle2 class="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div class="flex-1 flex flex-col justify-center min-w-0">
            <h3 class="font-bold text-gray-900 text-base mb-1 truncate">{{ tier.name }}</h3>
            <div class="flex items-center gap-1.5 text-[#07C160] text-xs font-bold mb-2">
              <CheckCircle2 class="w-3.5 h-3.5" /> 已领取
            </div>
            <div v-if="myClaims.find(c => c.tierId === tier.id)?.status === 'shipped'" class="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg border border-blue-100">
              <div class="font-bold mb-0.5 flex items-center gap-1"><Package class="w-3 h-3" /> 已发货</div>
              <div class="font-mono">单号: {{ myClaims.find(c => c.tierId === tier.id)?.trackingNumber }}</div>
            </div>
            <div v-else class="text-[10px] bg-gray-50 text-gray-500 px-2.5 py-1.5 rounded-lg border border-gray-100 flex items-center gap-1">
              <Package class="w-3 h-3" /> 仓库备货中，待发货
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="sortedTiers.length === 0" class="text-center py-16">
        <Gift class="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <div class="text-sm text-gray-400">暂无奖励配置</div>
      </div>
    </div>

    <!-- Claim popup -->
    <VanPopup v-model:show="showClaimModal" position="bottom" round :style="{ maxHeight: '90%' }">
      <div class="p-5" v-if="selectedTier">
        <h3 class="text-lg font-bold text-gray-900 mb-4">填写收货信息</h3>
        <div class="bg-gradient-to-r from-orange-50 to-yellow-50 p-3 rounded-xl mb-4 flex gap-3 items-center border border-orange-100">
          <img :src="selectedTier.imageUrl" class="w-12 h-12 rounded-lg object-cover" />
          <div>
            <div class="text-sm font-bold text-gray-900">{{ selectedTier.name }}</div>
            <div class="text-xs text-orange-600 mt-0.5 flex items-center gap-1">
              <Sparkles class="w-3 h-3" /> 恭喜完成 {{ selectedTier.requiredDays }} 天连续打卡！
            </div>
          </div>
        </div>
        <div class="space-y-4 mb-6">
          <div>
            <label class="text-sm font-medium text-gray-700 block mb-1">收货人 <span class="text-red-500">*</span></label>
            <input type="text" placeholder="请输入姓名" class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white text-sm transition-colors" v-model="formData.name" @input="formError = ''" />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 block mb-1">手机号 <span class="text-red-500">*</span></label>
            <input type="tel" placeholder="请输入11位手机号" maxlength="11" class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white text-sm transition-colors" v-model="formData.phone" @input="formError = ''" />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 block mb-1">详细地址 <span class="text-red-500">*</span></label>
            <textarea placeholder="省市区、街道、小区、楼栋及门牌号" class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white text-sm h-20 resize-none transition-colors" v-model="formData.address" @input="formError = ''"></textarea>
          </div>
          <div class="text-xs text-gray-400 flex items-start gap-1.5">
            <Check class="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
            <span>请确认信息无误，提交后如需修改请联系教练。</span>
          </div>
          <div v-if="formError" class="text-red-500 text-xs font-medium text-center">{{ formError }}</div>
        </div>
        <button class="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold shadow-lg shadow-orange-500/30 active:scale-95 transition-transform hover:shadow-xl hover:shadow-orange-500/40" @click="submitClaim">
          确认提交
        </button>
      </div>
    </VanPopup>
  </div>
</template>

<style scoped>
@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes spinSlow {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes shimmer {
  0% { background-color: rgba(255,255,255,0.15); }
  50% { background-color: rgba(255,255,255,0.25); }
  100% { background-color: rgba(255,255,255,0.15); }
}
@keyframes glow {
  0% { box-shadow: 0 0 8px rgba(255,166,0,0.3); }
  50% { box-shadow: 0 0 20px rgba(255,166,0,0.5); }
  100% { box-shadow: 0 0 8px rgba(255,166,0,0.3); }
}
.animate-pop-in {
  animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.animate-spin-slow {
  animation: spinSlow 3s linear infinite;
}
.animate-shimmer {
  animation: shimmer 2s ease-in-out infinite;
}
.animate-glow {
  animation: glow 2s ease-in-out infinite;
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
.slide-down-enter-active, .slide-down-leave-active {
  transition: all 0.3s ease;
}
.slide-down-enter-from, .slide-down-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
.fade-up-enter-active, .fade-up-leave-active {
  transition: all 0.3s ease;
}
.fade-up-enter-from, .fade-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>

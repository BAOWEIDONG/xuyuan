<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from 'date-fns';
import { useAppStore } from '../store/app';
import { NavBar, Card } from './ui';
import { Popup as VanPopup, showToast } from 'vant';
import { Search, Settings, Truck, CheckCircle2, ClipboardList, Package, HandCoins } from 'lucide-vue-next';
import type { RewardClaim } from '../types';

const store = useAppStore();
const activeTab = ref<'pending' | 'shipped' | 'in-person' | 'all'>('pending');
const searchQuery = ref('');

// Ship modal state
const showShipModal = ref(false);
const selectedClaim = ref<RewardClaim | null>(null);
const trackingNumber = ref('');
const shipError = ref('');

// In-person confirm modal
const showInPersonModal = ref(false);

const filteredClaims = computed(() => {
  return store.rewardClaims
    .filter(c => {
      const matchTab = activeTab.value === 'all' || c.status === activeTab.value;
      const matchSearch = !searchQuery.value || c.studentName.includes(searchQuery.value) || c.recipientName.includes(searchQuery.value) || c.recipientPhone.includes(searchQuery.value);
      return matchTab && matchSearch;
    })
    .sort((a, b) => new Date(b.claimDate).getTime() - new Date(a.claimDate).getTime());
});

const getTier = (tierId: string) => store.rewardTiers.find(t => t.id === tierId);
const tabLabels = { pending: '待处理', shipped: '已发货', 'in-person': '线下发放', all: '全部' };
const tabCounts = computed(() => ({
  pending: store.rewardClaims.filter(c => c.status === 'pending').length,
  shipped: store.rewardClaims.filter(c => c.status === 'shipped').length,
  'in-person': store.rewardClaims.filter(c => c.status === 'in-person').length,
  all: store.rewardClaims.length,
}));

const handleShipClick = (claim: RewardClaim) => {
  selectedClaim.value = claim;
  trackingNumber.value = '';
  shipError.value = '';
  showShipModal.value = true;
};

const handleInPersonClick = (claim: RewardClaim) => {
  selectedClaim.value = claim;
  showInPersonModal.value = true;
};

const submitShipping = () => {
  if (!trackingNumber.value.trim()) { shipError.value = '请输入快递单号'; return; }
  if (selectedClaim.value) {
    store.updateRewardClaim(selectedClaim.value.id, {
      status: 'shipped',
      trackingNumber: trackingNumber.value.trim(),
      shipDate: new Date().toISOString(),
    });
    showShipModal.value = false;
    showToast('发货成功');
  }
};

const submitInPerson = () => {
  if (!selectedClaim.value) return;
  store.updateRewardClaim(selectedClaim.value.id, {
    status: 'in-person',
    deliveredAt: new Date().toISOString(),
  });
  showInPersonModal.value = false;
  showToast('线下发放已确认');
};

const copyToClipboard = async (text: string) => {
  if (!text) { showToast('单号为空'); return; }
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      showToast('已复制单号');
      return;
    }
  } catch (e) { /* fall through to fallback */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    showToast('已复制单号');
  } catch (e) {
    showToast('复制失败，请手动复制');
  }
  document.body.removeChild(ta);
};
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] relative">
    <NavBar title="奖励发货管理" :on-back="store.goBack">
      <template #right>
        <button @click="store.setCurrentView('reward-config')" class="text-gray-500 p-2">
          <Settings class="w-5 h-5" />
        </button>
      </template>
    </NavBar>

    <!-- Search + tabs -->
    <div class="bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
      <div class="relative mb-3">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="搜索学员姓名、收货人或手机号" class="w-full bg-gray-50 border-none rounded-xl py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-[#1677FF]/20 focus:bg-white" v-model="searchQuery" />
      </div>
      <div class="flex space-x-5 text-sm font-medium overflow-x-auto">
        <button v-for="(label, key) in tabLabels" :key="key" :class="['relative pb-2 transition-colors whitespace-nowrap', activeTab === key ? 'text-[#1677FF]' : 'text-gray-500']" @click="activeTab = key">
          {{ label }} <span v-if="tabCounts[key] > 0" class="text-xs">({{ tabCounts[key] }})</span>
          <div v-if="activeTab === key" class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1677FF] rounded-full"></div>
        </button>
      </div>
    </div>

    <!-- List -->
    <div class="flex-1 p-4 space-y-4">
      <div v-if="filteredClaims.length === 0" class="text-center py-20 text-gray-400">
        <ClipboardList class="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <div class="text-sm">暂无相关领取记录</div>
      </div>

      <Card v-for="claim in filteredClaims" :key="claim.id" class="p-0 overflow-hidden border border-gray-100 shadow-sm">
        <div class="p-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">{{ claim.studentName[0] }}</div>
            <span class="font-bold text-sm text-gray-900">{{ claim.studentName }}</span>
          </div>
          <span class="text-[10px] text-gray-500">{{ format(new Date(claim.claimDate), 'MM-dd HH:mm') }}</span>
        </div>
        <div class="p-4">
          <div class="flex gap-3 mb-4">
            <img :src="getTier(claim.tierId)?.imageUrl" class="w-16 h-16 rounded-lg object-cover bg-gray-100 border border-gray-100" />
            <div>
              <div class="font-bold text-gray-900 text-sm mb-1">{{ getTier(claim.tierId)?.name || '未知礼品' }}</div>
              <div v-if="getTier(claim.tierId)?.source === 'activity'" class="text-xs text-[#FF976A] bg-orange-50 px-2 py-0.5 rounded inline-block">趣味活动奖品</div>
              <div v-else class="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded inline-block">连续打卡 {{ getTier(claim.tierId)?.requiredDays || 0 }} 天解锁</div>
            </div>
          </div>

          <!-- pending: show address + two action buttons -->
          <template v-if="claim.status === 'pending'">
            <div class="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-2 mb-4">
              <div class="flex"><span class="text-gray-400 w-14 shrink-0">收件人</span><span class="font-medium text-gray-900">{{ claim.recipientName }} <span class="font-mono text-gray-500 ml-1">{{ claim.recipientPhone }}</span></span></div>
              <div class="flex"><span class="text-gray-400 w-14 shrink-0">地址</span><span class="text-gray-900">{{ claim.recipientAddress }}</span></div>
            </div>
            <div class="flex gap-2">
              <button class="flex-1 py-2.5 rounded-xl bg-[#1677FF] text-white text-sm font-bold flex items-center justify-center gap-1.5" @click="handleShipClick(claim)">
                <Truck class="w-4 h-4" /> 快递发货
              </button>
              <button class="flex-1 py-2.5 rounded-xl border border-[#07C160] text-[#07C160] text-sm font-bold flex items-center justify-center gap-1.5 bg-[#07C160]/5" @click="handleInPersonClick(claim)">
                <HandCoins class="w-4 h-4" /> 线下发放
              </button>
            </div>
          </template>

          <!-- shipped: show tracking number -->
          <div v-else-if="claim.status === 'shipped'" class="flex items-center justify-between bg-blue-50/50 border border-blue-100 rounded-lg p-3">
            <div>
              <div class="flex items-center gap-1 text-blue-600 text-xs font-bold mb-1"><Truck class="w-3.5 h-3.5" /> 已发货</div>
              <div class="text-xs font-mono text-gray-600">单号: {{ claim.trackingNumber }}</div>
              <div v-if="claim.shipDate" class="text-[10px] text-gray-400 mt-0.5">{{ format(new Date(claim.shipDate), 'yyyy-MM-dd HH:mm') }}</div>
            </div>
            <button class="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-50" @click="copyToClipboard(claim.trackingNumber || '')">复制单号</button>
          </div>

          <!-- in-person: show delivery confirmation -->
          <div v-else-if="claim.status === 'in-person'" class="flex items-center justify-between bg-green-50/50 border border-green-100 rounded-lg p-3">
            <div>
              <div class="flex items-center gap-1 text-[#07C160] text-xs font-bold mb-1"><CheckCircle2 class="w-3.5 h-3.5" /> 线下已发放</div>
              <div v-if="claim.deliveredAt" class="text-[10px] text-gray-400">{{ format(new Date(claim.deliveredAt), 'yyyy-MM-dd HH:mm') }}</div>
            </div>
            <Package class="w-5 h-5 text-[#07C160]/40" />
          </div>
        </div>
      </Card>
    </div>

    <!-- Ship modal -->
    <VanPopup v-model:show="showShipModal" position="center" round>
      <div class="p-5 w-[20rem]">
        <h3 class="text-lg font-bold text-gray-900 mb-1">快递发货</h3>
        <p class="text-xs text-gray-500 mb-4">{{ selectedClaim?.studentName }} · {{ getTier(selectedClaim?.tierId || '')?.name }}</p>
        <div class="mb-4">
          <label class="text-sm font-medium text-gray-700 block mb-1">快递单号 <span class="text-red-500">*</span></label>
          <input type="text" placeholder="请输入物流快递单号" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1677FF] text-sm font-mono" v-model="trackingNumber" @input="shipError = ''" />
          <div v-if="shipError" class="text-red-500 text-xs font-medium mt-1.5">{{ shipError }}</div>
        </div>
        <div class="flex gap-3">
          <button class="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium" @click="showShipModal = false">取消</button>
          <button class="flex-1 py-2.5 rounded-xl bg-[#1677FF] text-white text-sm font-bold" @click="submitShipping">提交</button>
        </div>
      </div>
    </VanPopup>

    <!-- In-person confirm modal -->
    <VanPopup v-model:show="showInPersonModal" position="center" round>
      <div class="p-5 w-[20rem]">
        <h3 class="text-lg font-bold text-gray-900 mb-1">确认线下发放</h3>
        <p class="text-xs text-gray-500 mb-4">{{ selectedClaim?.studentName }} · {{ getTier(selectedClaim?.tierId || '')?.name }}</p>
        <div class="bg-green-50 border border-green-100 rounded-lg p-3 mb-4">
          <div class="flex items-start gap-2">
            <HandCoins class="w-4 h-4 text-[#07C160] shrink-0 mt-0.5" />
            <div class="text-xs text-gray-600">
              确认已在线下将奖品发放给该学员。确认后记录状态将变为"线下已发放"，无法撤销。
            </div>
          </div>
        </div>
        <div class="flex gap-3">
          <button class="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium" @click="showInPersonModal = false">取消</button>
          <button class="flex-1 py-2.5 rounded-xl bg-[#07C160] text-white text-sm font-bold" @click="submitInPerson">确认发放</button>
        </div>
      </div>
    </VanPopup>
  </div>
</template>

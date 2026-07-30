<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAppStore } from '../store/app';
import { NavBar, Card } from './ui';
import { Popup as VanPopup, showToast } from 'vant';
import { Plus, Trash2, Edit3, Camera, AlertTriangle, Gift, Zap } from 'lucide-vue-next';
import { uploadFile } from '../lib/api';
import type { RewardTier } from '../types';

const store = useAppStore();
const showEditModal = ref(false);
const editingTier = ref<Partial<RewardTier> | null>(null);
const formError = ref('');
const photoInputRef = ref<HTMLInputElement | null>(null);

const getClaimCount = (tierId: string) => store.rewardClaims.filter(c => c.tierId === tierId).length;

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  milestone: '阶梯减重达标奖',
  weekly: '每周主题挑战',
  lucky: '全勤幸运抽奖',
};

const handleEdit = (tier?: RewardTier, source: 'streak' | 'activity' = 'streak') => {
  editingTier.value = tier
    ? { ...tier }
    : { name: '', requiredDays: source === 'streak' ? 1 : 0, imageUrl: '', stock: 10, source, activityType: source === 'activity' ? 'milestone' : undefined };
  formError.value = '';
  showEditModal.value = true;
};

const handlePhotoSelect = async (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  if (!files || files.length === 0) return;
  const url = await uploadFile(files[0]);
  if (editingTier.value) editingTier.value.imageUrl = url;
  (e.target as HTMLInputElement).value = '';
};

const handleDelete = (id: string) => {
  const claimCount = getClaimCount(id);
  if (claimCount > 0) {
    showToast(`该奖励已有 ${claimCount} 名学员领取，无法删除`);
    return;
  }
  if (confirm('确定删除此奖励？')) store.deleteRewardTier(id);
};

const saveTier = () => {
  if (!editingTier.value) return;
  if (!editingTier.value.name?.trim()) { formError.value = '请输入礼品名称'; return; }
  if (!editingTier.value.imageUrl) { formError.value = '请上传礼品图片'; return; }
  if (editingTier.value.stock === undefined || editingTier.value.stock < 0) { formError.value = '请输入有效的库存'; return; }

  const isStreak = editingTier.value.source !== 'activity';
  if (isStreak) {
    if (!editingTier.value.requiredDays || editingTier.value.requiredDays <= 0) { formError.value = '请输入有效的天数'; return; }
    const dup = store.rewardTiers.find(t => t.source !== 'activity' && t.requiredDays === editingTier.value!.requiredDays && t.id !== editingTier.value!.id);
    if (dup) { formError.value = `已存在连续打卡 ${editingTier.value.requiredDays} 天的奖励（${dup.name}），请设置不同天数`; return; }
  }

  if (editingTier.value.id) {
    store.updateRewardTier(editingTier.value.id, editingTier.value);
  } else {
    store.addRewardTier({
      id: `t_${Date.now()}`,
      name: editingTier.value.name.trim(),
      requiredDays: isStreak ? editingTier.value.requiredDays! : 0,
      imageUrl: editingTier.value.imageUrl,
      stock: editingTier.value.stock,
      source: editingTier.value.source || (isStreak ? 'streak' : 'activity'),
      activityType: !isStreak ? editingTier.value.activityType : undefined,
      description: editingTier.value.description,
    });
  }
  showEditModal.value = false;
};

const streakTiers = computed(() =>
  [...store.rewardTiers.filter(t => t.source !== 'activity')]
    .sort((a, b) => a.requiredDays - b.requiredDays)
);
const activityTiers = computed(() =>
  store.rewardTiers.filter(t => t.source === 'activity')
);
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] relative">
    <NavBar title="奖励配置" :on-back="store.goBack" />

    <div class="flex-1 p-4 space-y-6 pb-24">
      <!-- 打卡奖励 -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <div class="w-1.5 h-4 bg-[#1677FF] rounded-full"></div>
            连续打卡奖励
          </h3>
          <button @click="handleEdit(undefined, 'streak')" class="text-xs font-bold text-[#1677FF] flex items-center gap-0.5">
            <Plus class="w-3.5 h-3.5" /> 添加
          </button>
        </div>
        <div v-if="streakTiers.length === 0" class="text-center py-8 text-gray-400 text-xs bg-white rounded-xl border border-gray-100">暂无打卡奖励，请添加</div>
        <div class="space-y-3">
          <Card v-for="tier in streakTiers" :key="tier.id" class="p-4 flex gap-4">
            <div class="w-20 h-20 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-50 cursor-pointer" @click="store.openImagePreview([tier.imageUrl], 0)">
              <img :src="tier.imageUrl" :alt="tier.name" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <div class="flex justify-between items-start">
                  <h3 class="font-bold text-gray-900 text-base truncate pr-2">{{ tier.name }}</h3>
                  <div class="flex gap-2 shrink-0">
                    <button @click="handleEdit(tier)" class="text-blue-500 p-1"><Edit3 class="w-4 h-4" /></button>
                    <button @click="handleDelete(tier.id)" :class="['p-1', getClaimCount(tier.id) > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500']"><Trash2 class="w-4 h-4" /></button>
                  </div>
                </div>
                <div class="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded inline-block mt-1">连续打卡 {{ tier.requiredDays }} 天</div>
                <div v-if="getClaimCount(tier.id) > 0" class="text-[10px] text-gray-500 mt-1">已有 {{ getClaimCount(tier.id) }} 人领取</div>
              </div>
              <div class="text-xs text-gray-500 font-medium">库存: <span :class="tier.stock > 0 ? 'text-gray-900' : 'text-red-500'">{{ tier.stock }}</span> 件</div>
            </div>
          </Card>
        </div>
      </div>

      <!-- 趣味活动奖品 -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <div class="w-1.5 h-4 bg-[#FF976A] rounded-full"></div>
            趣味活动奖品
          </h3>
          <button @click="handleEdit(undefined, 'activity')" class="text-xs font-bold text-[#FF976A] flex items-center gap-0.5">
            <Plus class="w-3.5 h-3.5" /> 添加
          </button>
        </div>
        <div v-if="activityTiers.length === 0" class="text-center py-8 text-gray-400 text-xs bg-white rounded-xl border border-gray-100">暂无活动奖品，请添加</div>
        <div class="space-y-3">
          <Card v-for="tier in activityTiers" :key="tier.id" class="p-4 flex gap-4">
            <div class="w-20 h-20 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-50 cursor-pointer" @click="store.openImagePreview([tier.imageUrl], 0)">
              <img :src="tier.imageUrl" :alt="tier.name" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <div class="flex justify-between items-start">
                  <h3 class="font-bold text-gray-900 text-base truncate pr-2">{{ tier.name }}</h3>
                  <div class="flex gap-2 shrink-0">
                    <button @click="handleEdit(tier)" class="text-blue-500 p-1"><Edit3 class="w-4 h-4" /></button>
                    <button @click="handleDelete(tier.id)" :class="['p-1', getClaimCount(tier.id) > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500']"><Trash2 class="w-4 h-4" /></button>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 mt-1">
                  <span class="text-xs text-[#FF976A] bg-orange-50 px-2 py-0.5 rounded">{{ ACTIVITY_TYPE_LABELS[tier.activityType || ''] || '活动奖品' }}</span>
                </div>
                <div v-if="tier.description" class="text-[10px] text-gray-500 mt-1">{{ tier.description }}</div>
                <div v-if="getClaimCount(tier.id) > 0" class="text-[10px] text-gray-500 mt-1">已有 {{ getClaimCount(tier.id) }} 人领取</div>
              </div>
              <div class="text-xs text-gray-500 font-medium">库存: <span :class="tier.stock > 0 ? 'text-gray-900' : 'text-red-500'">{{ tier.stock }}</span> 件</div>
            </div>
          </Card>
        </div>
      </div>
    </div>

    <!-- Edit popup -->
    <VanPopup v-model:show="showEditModal" position="bottom" round :style="{ maxHeight: '90%' }">
      <div class="p-5" v-if="editingTier">
        <h3 class="text-lg font-bold text-gray-900 mb-5">{{ editingTier.id ? '编辑奖励' : '新增奖励' }}</h3>
        <!-- 已有领取记录警告 -->
        <div v-if="editingTier.id && getClaimCount(editingTier.id) > 0" class="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <AlertTriangle class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div class="text-xs text-amber-700">
            <div class="font-bold mb-0.5">该奖励已有 {{ getClaimCount(editingTier.id) }} 人领取</div>
            <div>修改会影响学员的进度计算，请谨慎操作。礼品名称和库存可安全修改。</div>
          </div>
        </div>
        <div class="space-y-4 mb-6">
          <!-- 奖品来源 -->
          <div>
            <label class="text-sm font-medium text-gray-700 block mb-2">奖品来源</label>
            <div class="flex gap-2">
              <button
                :class="['flex-1 py-2 rounded-lg text-xs font-bold border transition-colors', editingTier.source !== 'activity' ? 'border-[#1677FF] bg-[#1677FF]/5 text-[#1677FF]' : 'border-gray-200 text-gray-500']"
                @click="editingTier.source = 'streak'; editingTier.activityType = undefined; editingTier.requiredDays = editingTier.requiredDays || 1"
              >
                <Gift class="w-4 h-4 inline mr-1" />连续打卡
              </button>
              <button
                :class="['flex-1 py-2 rounded-lg text-xs font-bold border transition-colors', editingTier.source === 'activity' ? 'border-[#FF976A] bg-[#FF976A]/5 text-[#FF976A]' : 'border-gray-200 text-gray-500']"
                @click="editingTier.source = 'activity'; editingTier.activityType = editingTier.activityType || 'milestone'; editingTier.requiredDays = 0"
              >
                <Zap class="w-4 h-4 inline mr-1" />趣味活动
              </button>
            </div>
          </div>

          <!-- 活动类型（source=activity 时） -->
          <div v-if="editingTier.source === 'activity'">
            <label class="text-sm font-medium text-gray-700 block mb-2">活动类型</label>
            <div class="flex gap-2">
              <button
                v-for="(label, key) in ACTIVITY_TYPE_LABELS"
                :key="key"
                :class="['flex-1 py-2 rounded-lg text-[10px] font-bold border transition-colors', editingTier.activityType === key ? 'border-[#FF976A] bg-[#FF976A]/5 text-[#FF976A]' : 'border-gray-200 text-gray-500']"
                @click="editingTier.activityType = key as any"
              >{{ label }}</button>
            </div>
          </div>

          <div>
            <label class="text-sm font-medium text-gray-700 block mb-2">礼品图片 <span class="text-red-500">*</span></label>
            <input ref="photoInputRef" type="file" accept="image/*" class="hidden" @change="handlePhotoSelect" />
            <div class="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 overflow-hidden" @click="photoInputRef?.click()">
              <img v-if="editingTier.imageUrl" :src="editingTier.imageUrl" class="w-full h-full object-cover" />
              <template v-else><Camera class="w-6 h-6 text-gray-400 mb-1" /><span class="text-[10px] text-gray-400">上传图片</span></template>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 block mb-1">礼品名称 <span class="text-red-500">*</span></label>
            <input type="text" placeholder="如：运动水杯" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1677FF] text-sm" v-model="editingTier.name" @input="formError = ''" />
          </div>
          <div v-if="editingTier.source !== 'activity'">
            <label class="text-sm font-medium text-gray-700 block mb-1">解锁条件 (连续打卡天数) <span class="text-red-500">*</span></label>
            <input type="number" placeholder="如：10" min="1" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1677FF] text-sm" :value="editingTier.requiredDays" @input="editingTier.requiredDays = parseInt(($event.target as HTMLInputElement).value) || 0; formError = ''" />
          </div>
          <div v-if="editingTier.source === 'activity'">
            <label class="text-sm font-medium text-gray-700 block mb-1">发放说明</label>
            <input type="text" placeholder="如：减重达 3% 发放" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#FF976A] text-sm" v-model="editingTier.description" />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 block mb-1">库存数量 <span class="text-red-500">*</span></label>
            <input type="number" placeholder="如：50" min="0" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1677FF] text-sm" :value="editingTier.stock" @input="editingTier.stock = parseInt(($event.target as HTMLInputElement).value) || 0; formError = ''" />
          </div>
          <div v-if="formError" class="text-red-500 text-xs font-medium text-center">{{ formError }}</div>
        </div>
        <button class="w-full py-3 rounded-xl bg-[#1677FF] text-white font-bold" @click="saveTier">保存配置</button>
      </div>
    </VanPopup>
  </div>
</template>

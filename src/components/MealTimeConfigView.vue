<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAppStore } from '../store/app';
import { NavBar, Card } from './ui';
import { Coffee, Clock, Check } from 'lucide-vue-next';
import { showToast } from 'vant';
import type { MealTimeConfig, MealTimeSlot } from '../types';

const store = useAppStore();

const config = ref<MealTimeConfig>({ ...store.mealTimeConfig });

const mealLabels: Array<{ key: keyof MealTimeConfig; label: string; icon: string }> = [
  { key: 'breakfast', label: '早餐', icon: '07:00-10:00' },
  { key: 'lunch', label: '午餐', icon: '11:00-14:00' },
  { key: 'dinner', label: '晚餐', icon: '17:00-21:00' },
  { key: 'snack', label: '加餐', icon: '14:00-17:00' },
];

const handleSave = () => {
  store.updateMealTimeConfig(config.value);
  showToast('保存成功');
  store.goBack();
};
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] relative">
    <NavBar title="打卡时间配置" :on-back="store.goBack" />

    <div class="p-4 space-y-4">
      <div class="bg-blue-50 rounded-xl p-3 text-xs text-blue-600 flex items-start gap-2 border border-blue-100">
        <Clock class="w-4 h-4 shrink-0 mt-0.5" />
        <span>配置每餐允许打卡的时间区间。学员在区间外无法打卡，系统会提示不在打卡时间。关闭开关则该餐不限制时间。</span>
      </div>

      <Card v-for="meal in mealLabels" :key="meal.key" class="p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-[#FF976A]/10 flex items-center justify-center text-[#FF976A]">
              <Coffee class="w-4 h-4" />
            </div>
            <span class="font-bold text-gray-900 text-sm">{{ meal.label }}</span>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" class="sr-only peer" v-model="config[meal.key].enabled" />
            <div class="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#07C160] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
          </label>
        </div>

        <div v-if="config[meal.key].enabled" class="flex items-center gap-3">
          <div class="flex-1">
            <label class="text-xs text-gray-500 block mb-1">开始时间</label>
            <input type="time" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#07C160]" v-model="config[meal.key].start" />
          </div>
          <div class="text-gray-300 pt-5">~</div>
          <div class="flex-1">
            <label class="text-xs text-gray-500 block mb-1">结束时间</label>
            <input type="time" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#07C160]" v-model="config[meal.key].end" />
          </div>
        </div>

        <div v-else class="text-xs text-gray-400 py-2">
          已关闭时间限制，学员可随时打卡
        </div>
      </Card>
    </div>

    <div class="sticky bottom-0 p-4 bg-white border-t border-gray-100">
      <button class="w-full py-3 rounded-xl bg-[#FF976A] text-white font-bold active:scale-95 transition-transform" @click="handleSave">
        保存配置
      </button>
    </div>
  </div>
</template>

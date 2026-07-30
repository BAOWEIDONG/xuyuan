<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '../store/app';
import { NavBar, Card } from './ui';
import ActivityCard from './ActivityCard.vue';
import { UserCircle, LogOut, Clock, Activity, FileText } from 'lucide-vue-next';
import { Tabbar as VanTabbar, TabbarItem as VanTabbarItem } from 'vant';

const store = useAppStore();
const sortedActivities = computed(() =>
  [...store.coachActivities].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
);
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] pb-20 font-sans">
    <div class="pt-12 px-6 pb-4 bg-gradient-to-b from-[#07C160]/10 to-[#F7F8FA] border-b border-gray-100">
      <div class="flex justify-end mb-2">
        <button @click="store.logout()" class="text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 text-xs">
          <LogOut class="h-4 w-4" /> 退出
        </button>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="h-16 w-16 rounded-full bg-[#07C160] flex items-center justify-center shadow-sm">
            <UserCircle class="h-10 w-10 text-white" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-900">教练您好，{{ store.user?.name || '专家' }}</h2>
            <p class="text-xs font-bold text-[#07C160] uppercase tracking-wider mt-1">健康训练营</p>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 px-6 pt-6 space-y-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-bold text-gray-900">教学资料</h3>
      </div>

      <Card class="flex items-center justify-between p-4 cursor-pointer hover:border-[#07C160] transition-colors bg-[#07C160]/[0.06]" @click="store.setCurrentView('activity-upload')">
        <div class="flex items-center space-x-3">
          <div class="h-10 w-10 rounded-full bg-[#07C160]/10 flex items-center justify-center text-[#07C160]">
            <FileText class="h-5 w-5" />
          </div>
          <div>
            <div class="text-sm font-bold text-gray-900">上传锻炼活动</div>
            <div class="text-[10px] text-gray-500">
              支持图文形式，添加活动介绍
            </div>
          </div>
        </div>
        <div class="text-[#07C160] font-bold">›</div>
      </Card>

      <div class="flex items-center justify-between mt-8 mb-4">
        <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Clock class="w-4 h-4 text-gray-400" />
          历史发布活动
        </h3>
      </div>

      <div v-if="sortedActivities.length === 0" class="text-center py-10 text-gray-400 text-sm">
        暂无发布的锻炼活动
      </div>
      <div v-else class="space-y-4">
        <ActivityCard v-for="activity in sortedActivities" :key="activity.id" :activity="activity" />
      </div>
    </div>

    <!-- Bottom Nav (Vant Tabbar) -->
    <VanTabbar class="custom-tabbar" :model-value="0">
      <VanTabbarItem>
        <template #icon><Activity class="h-6 w-6" /></template>
        主页
      </VanTabbarItem>
    </VanTabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAppStore } from '../store/app';
import { MOCK_STUDENTS } from '../mock/data';
import { NavBar, Card } from './ui';
import { Users, UserCircle, LogOut, CheckCircle, XCircle, Gift, Clock, Settings, ChevronDown, ChevronUp, Search, X, BarChart3 } from 'lucide-vue-next';
import { Tabbar as VanTabbar, TabbarItem as VanTabbarItem } from 'vant';
import { rankStudents } from '../lib/scoring';

const store = useAppStore();

const activeTab = ref<'incomplete' | 'completed'>('incomplete');
const showConfig = ref(false);
const searchQuery = ref('');

const unannotatedCount = computed(() => {
  const diet = store.dietRecords.filter((r) => !r.dietitianComment && r.dietitianScore == null).length;
  const weight = store.weightRecords.filter((r) => !r.dietitianComment).length;
  const exercise = store.exerciseRecords.filter((r) => !r.dietitianComment).length;
  return diet + weight + exercise;
});

const todayStr = new Date().toISOString().split('T')[0];

const rankedStudents = computed(() => rankStudents(MOCK_STUDENTS, store.dietRecords, store.exerciseRecords));

const studentsStatus = computed(() =>
  MOCK_STUDENTS.map((student) => {
    const studentDiets = store.dietRecords.filter((r) => (r.studentId === student.id || r.studentId === undefined) && r.date.startsWith(todayStr));
    const studentExercises = store.exerciseRecords.filter((r) => r.date.startsWith(todayStr));

    const hasBreakfast = studentDiets.some((d) => d.meal === 'breakfast');
    const hasLunch = studentDiets.some((d) => d.meal === 'lunch');
    const hasDinner = studentDiets.some((d) => d.meal === 'dinner');
    const hasExercise = studentExercises.some((e) => e.studentId === student.id);
    const hasWeight = store.weightRecords.some((w) => (w.studentId === student.id || w.studentId === undefined) && w.date.startsWith(todayStr));

    const missing: string[] = [];
    if (!hasBreakfast) missing.push('早餐');
    if (!hasLunch) missing.push('中餐');
    if (!hasDinner) missing.push('晚餐');
    if (!hasWeight) missing.push('体重');
    if (!hasExercise) missing.push('运动');

    const rankInfo = rankedStudents.value.find((r) => r.studentId === student.id);

    return {
      ...student,
      isCompleted: missing.length === 0,
      missingTags: missing,
      totalScore: rankInfo?.totalScore || 0,
      rank: rankInfo?.rank || 0,
    };
  }),
);

const completedStudents = computed(() => studentsStatus.value.filter((s) => s.isCompleted));
const incompleteStudents = computed(() => studentsStatus.value.filter((s) => !s.isCompleted));

// 姓名搜索过滤（全局搜索，跨已打卡/未打卡两个 tab）
const searchKeyword = computed(() => searchQuery.value.trim().toLowerCase());
const filteredComplete = computed(() => {
  if (!searchKeyword.value) return completedStudents.value;
  return completedStudents.value.filter((s) => s.name.toLowerCase().includes(searchKeyword.value));
});
const filteredIncomplete = computed(() => {
  if (!searchKeyword.value) return incompleteStudents.value;
  return incompleteStudents.value.filter((s) => s.name.toLowerCase().includes(searchKeyword.value));
});

const displayedStudents = computed(() => (activeTab.value === 'incomplete' ? filteredIncomplete.value : filteredComplete.value));
const emptyText = computed(() => {
  if (searchKeyword.value) return `未找到姓名包含「${searchQuery.value.trim()}」的学员`;
  return activeTab.value === 'incomplete' ? '所有学员已完成今日打卡' : '暂无学员完成全部打卡';
});

const openStudent = (id: string) => {
  store.setSelectedStudentId(id);
  store.setCurrentView('dietitian-student-detail');
};

const maskPhone = (phone: string) => phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] pb-20 font-sans">
    <div class="pt-12 px-6 pb-6 bg-gradient-to-b from-[#FF976A]/10 to-[#F7F8FA]">
      <div class="flex justify-end mb-2">
        <button @click="store.logout()" class="text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 text-xs bg-white/50 px-2 py-1 rounded-full backdrop-blur-sm">
          <LogOut class="h-3 w-3" /> 退出
        </button>
      </div>
      <div class="flex items-center space-x-4">
        <div class="h-14 w-14 rounded-full bg-[#FF976A] flex items-center justify-center shadow-md shrink-0">
          <Users class="h-7 w-7 text-white" />
        </div>
        <div>
          <h2 class="text-xl font-bold text-gray-900">营养师您好，{{ store.user?.name || '专家' }}</h2>
          <p class="text-xs font-bold text-[#FF976A] uppercase tracking-wider mt-1">您当前负责管理 {{ MOCK_STUDENTS.length }} 名学员</p>
        </div>
      </div>
    </div>

    <div class="flex-1 px-5 space-y-6 relative -mt-2">
      <div class="grid grid-cols-2 gap-4">
        <Card
          class="flex flex-col justify-center p-4 bg-white border border-[#FF976A]/20 cursor-pointer hover:shadow-md transition-shadow shadow-sm"
          @click="store.setCurrentView('dietitian-unannotated-list')"
        >
          <div class="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-[#FF976A]"></div>
            待批注
          </div>
          <div class="text-[10px] text-gray-500 mb-2">{{ unannotatedCount > 0 ? `有 ${unannotatedCount} 条记录` : '已全部批注' }}</div>
          <div class="text-[#FF976A] font-bold flex items-center gap-1 text-[11px] bg-orange-50 px-2 py-1 rounded-lg w-fit">
            {{ unannotatedCount > 0 ? '去处理' : '查看' }} <span class="text-sm leading-none ml-0.5">›</span>
          </div>
        </Card>

        <Card
          class="flex flex-col justify-center p-4 bg-white border border-[#FF976A]/20 cursor-pointer hover:shadow-md transition-shadow shadow-sm"
          @click="store.setCurrentView('ranking')"
        >
          <div class="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-[#FF976A]"></div>
            总排名榜单
          </div>
          <div class="text-[10px] text-gray-500 mb-2">查看并导出积分数据</div>
          <div class="text-[#FF976A] font-bold flex items-center gap-1 text-[11px] bg-orange-50 px-2 py-1 rounded-lg w-fit">
            去查看 <span class="text-sm leading-none ml-0.5">›</span>
          </div>
        </Card>
      </div>

      <!-- Config section (collapsible) -->
      <div>
        <button @click="showConfig = !showConfig" class="w-full flex items-center justify-between py-2 px-1 text-sm font-bold text-gray-500">
          <span class="flex items-center gap-1.5">
            <Settings class="w-4 h-4" />
            管理配置
          </span>
          <component :is="showConfig ? ChevronUp : ChevronDown" class="w-4 h-4 transition-transform" />
        </button>

        <div v-if="showConfig" class="grid grid-cols-2 gap-4 mt-2">
          <Card class="flex flex-col justify-center p-4 bg-white border border-[#FF976A]/20 cursor-pointer hover:shadow-md transition-shadow shadow-sm" @click="store.setCurrentView('reward-manage')">
            <div class="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-[#FF976A]"></div>
              奖励管理
            </div>
            <div class="text-[10px] text-gray-500 mb-2">领取记录与发货</div>
            <div class="text-[#FF976A] font-bold flex items-center gap-1 text-[11px] bg-orange-50 px-2 py-1 rounded-lg w-fit">
              去处理 <span class="text-sm leading-none ml-0.5">›</span>
            </div>
          </Card>
          <Card class="flex flex-col justify-center p-4 bg-white border border-[#FF976A]/20 cursor-pointer hover:shadow-md transition-shadow shadow-sm" @click="store.setCurrentView('reward-config')">
            <div class="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-[#FF976A]"></div>
              奖励配置
            </div>
            <div class="text-[10px] text-gray-500 mb-2">礼品阶梯与库存</div>
            <div class="text-[#FF976A] font-bold flex items-center gap-1 text-[11px] bg-orange-50 px-2 py-1 rounded-lg w-fit">
              去配置 <span class="text-sm leading-none ml-0.5">›</span>
            </div>
          </Card>
          <Card class="flex flex-col justify-center p-4 bg-white border border-[#FF976A]/20 cursor-pointer hover:shadow-md transition-shadow shadow-sm" @click="store.setCurrentView('meal-time-config')">
            <div class="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-[#FF976A]"></div>
              打卡时间
            </div>
            <div class="text-[10px] text-gray-500 mb-2">每餐打卡时间区间</div>
            <div class="text-[#FF976A] font-bold flex items-center gap-1 text-[11px] bg-orange-50 px-2 py-1 rounded-lg w-fit">
              去配置 <span class="text-sm leading-none ml-0.5">›</span>
            </div>
          </Card>
          <Card class="flex flex-col justify-center p-4 bg-white border border-[#FF976A]/20 cursor-pointer hover:shadow-md transition-shadow shadow-sm" @click="store.setCurrentView('metric-config')">
            <div class="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-[#FF976A]"></div>
              指标配置
            </div>
            <div class="text-[10px] text-gray-500 mb-2">健康档案体检指标项</div>
            <div class="text-[#FF976A] font-bold flex items-center gap-1 text-[11px] bg-orange-50 px-2 py-1 rounded-lg w-fit">
              去配置 <span class="text-sm leading-none ml-0.5">›</span>
            </div>
          </Card>
          <Card class="flex flex-col justify-center p-4 bg-white border border-[#FF976A]/20 cursor-pointer hover:shadow-md transition-shadow shadow-sm" @click="store.setCurrentView('camp-summary')">
            <div class="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-[#FF976A]"></div>
              结营统计
            </div>
            <div class="text-[10px] text-gray-500 mb-2">学员数据变化与打卡频率</div>
            <div class="text-[#FF976A] font-bold flex items-center gap-1 text-[11px] bg-orange-50 px-2 py-1 rounded-lg w-fit">
              查看统计 <span class="text-sm leading-none ml-0.5">›</span>
            </div>
          </Card>
          <Card class="flex flex-col justify-center p-4 bg-white border border-[#FF976A]/20 cursor-pointer hover:shadow-md transition-shadow shadow-sm" @click="store.setCurrentView('activity-admin')">
            <div class="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-[#FF976A]"></div>
              趣味活动
            </div>
            <div class="text-[10px] text-gray-500 mb-2">活动开关与达标看板</div>
            <div class="text-[#FF976A] font-bold flex items-center gap-1 text-[11px] bg-orange-50 px-2 py-1 rounded-lg w-fit">
              去管理 <span class="text-sm leading-none ml-0.5">›</span>
            </div>
          </Card>
        </div>
      </div>

      <div>
        <!-- 搜索框 -->
        <div class="relative mb-4">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索学员姓名"
            class="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-100 rounded-xl text-sm shadow-sm focus:outline-none focus:border-[#FF976A] transition-colors"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="flex bg-white p-1 rounded-xl shadow-sm mb-4">
          <button
            :class="['flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5', activeTab === 'incomplete' ? 'bg-[#FF976A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900']"
            @click="activeTab = 'incomplete'"
          >
            <XCircle class="w-4 h-4" />
            未打卡 ({{ filteredIncomplete.length }})
          </button>
          <button
            :class="['flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5', activeTab === 'completed' ? 'bg-[#07C160] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900']"
            @click="activeTab = 'completed'"
          >
            <CheckCircle class="w-4 h-4" />
            已打卡 ({{ filteredComplete.length }})
          </button>
        </div>

        <div class="space-y-3">
          <template v-if="displayedStudents.length > 0">
            <Card
              v-for="student in displayedStudents"
              :key="student.id"
              class="flex items-center justify-between p-4 cursor-pointer hover:border-[#FF976A] transition-colors border-0 shadow-sm mb-3"
              @click="openStudent(student.id)"
            >
              <div class="flex items-start space-x-3">
                <div class="h-10 w-10 rounded-full bg-[#FF976A]/10 flex items-center justify-center text-[#FF976A] shrink-0">
                  <UserCircle class="h-6 w-6" />
                </div>
                <div>
                  <div class="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                    {{ student.name }}
                    <span class="text-[10px] font-medium bg-[#FF976A]/10 text-[#FF976A] px-1.5 py-0.5 rounded">
                      总排名第{{ student.rank }}位 / {{ student.totalScore }}分
                    </span>
                  </div>
                  <div class="text-[10px] text-gray-500 mb-1.5">
                    {{ student.gender === 'male' ? '男' : '女' }} · {{ student.age }}岁 · {{ maskPhone(student.phone) }}
                  </div>
                  <div v-if="!student.isCompleted && student.missingTags.length > 0" class="flex flex-wrap gap-1">
                    <span v-for="tag in student.missingTags" :key="tag" class="px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-50 text-red-500">
                      未打卡{{ tag }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="text-[#FF976A] font-bold">›</div>
            </Card>
          </template>
          <div v-else class="text-center text-xs text-gray-400 py-4 bg-white rounded-xl border border-gray-100">{{ emptyText }}</div>
        </div>
      </div>
    </div>

    <!-- Bottom Nav (Vant Tabbar) -->
    <VanTabbar class="custom-tabbar tabbar-orange" :model-value="0">
      <VanTabbarItem>
        <template #icon><Users class="h-6 w-6" /></template>
        工作台
      </VanTabbarItem>
    </VanTabbar>
  </div>
</template>

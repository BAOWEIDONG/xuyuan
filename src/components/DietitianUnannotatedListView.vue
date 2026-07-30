<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAppStore } from '../store/app';
import { MOCK_STUDENTS } from '../mock/data';
import { NavBar, Card } from './ui';
import { UserCircle, Coffee, Clock, Activity, Scale, Video } from 'lucide-vue-next';
import type { DietRecord, WeightRecord, ExerciseRecord } from '../types';

const MEAL_TYPES = [
  { id: 'breakfast', label: '早餐' },
  { id: 'lunch', label: '午餐' },
  { id: 'dinner', label: '晚餐' },
  { id: 'snack', label: '加餐' },
];

type ItemType = 'diet' | 'weight' | 'exercise';

interface UnifiedItem {
  id: string;
  type: ItemType;
  studentId: string;
  studentName: string;
  date: string;
  // diet
  meal?: string;
  description?: string;
  photos?: string[];
  // weight
  weight?: number;
  // exercise
  exerciseType?: string;
  duration?: number;
  intensity?: number;
  videoUrls?: string[];
}

const store = useAppStore();

// 过滤标签
const activeFilter = ref<ItemType | 'all'>('all');

const mealLabel = (meal: string) => MEAL_TYPES.find((m) => m.id === meal)?.label;

const studentName = (id: string) => MOCK_STUDENTS.find((s) => s.id === id)?.name || '未知学员';

const allItems = computed<UnifiedItem[]>(() => {
  const items: UnifiedItem[] = [];

  // 饮食待批注
  store.dietRecords
    .filter((r) => !r.dietitianComment && r.dietitianScore == null)
    .forEach((r: DietRecord) => {
      items.push({
        id: r.id,
        type: 'diet',
        studentId: r.studentId || MOCK_STUDENTS[0].id,
        studentName: studentName(r.studentId || MOCK_STUDENTS[0].id),
        date: r.date,
        meal: mealLabel(r.meal),
        description: r.description,
        photos: r.photos,
      });
    });

  // 体重待批注
  store.weightRecords
    .filter((r) => !r.dietitianComment)
    .forEach((r: WeightRecord) => {
      items.push({
        id: r.id,
        type: 'weight',
        studentId: r.studentId || MOCK_STUDENTS[0].id,
        studentName: studentName(r.studentId || MOCK_STUDENTS[0].id),
        date: r.date,
        weight: r.weight,
        photos: r.photos,
      });
    });

  // 运动待批注
  store.exerciseRecords
    .filter((r) => !r.dietitianComment)
    .forEach((r: ExerciseRecord) => {
      items.push({
        id: r.id,
        type: 'exercise',
        studentId: r.studentId || MOCK_STUDENTS[0].id,
        studentName: studentName(r.studentId || MOCK_STUDENTS[0].id),
        date: r.date,
        exerciseType: r.type,
        duration: r.duration,
        intensity: r.intensity,
        photos: r.photos,
        videoUrls: r.videoUrls,
      });
    });

  // 按时间倒序
  return items.sort((a, b) => b.date.localeCompare(a.date));
});

const filteredItems = computed(() => {
  if (activeFilter.value === 'all') return allItems.value;
  return allItems.value.filter((i) => i.type === activeFilter.value);
});

const countByType = computed(() => ({
  diet: allItems.value.filter((i) => i.type === 'diet').length,
  weight: allItems.value.filter((i) => i.type === 'weight').length,
  exercise: allItems.value.filter((i) => i.type === 'exercise').length,
}));

// 按学员分组统计（基于当前筛选结果）
const studentGroups = computed(() => {
  const map = new Map<string, number>();
  filteredItems.value.forEach((item) => {
    map.set(item.studentId, (map.get(item.studentId) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([studentId, count]) => ({
      student: MOCK_STUDENTS.find((s) => s.id === studentId),
      count,
    }))
    .sort((a, b) => b.count - a.count);
});

const openStudent = (studentId: string) => {
  store.setSelectedStudentId(studentId);
  store.setPendingAnnotation(null);
  store.setCurrentView('dietitian-student-detail');
};

const openRecord = (item: UnifiedItem) => {
  store.setSelectedStudentId(item.studentId);
  store.setPendingAnnotation(item.type, item.id);
  store.setCurrentView('dietitian-student-detail');
};

const typeConfig: Record<ItemType, { label: string; bg: string; text: string; icon: typeof Activity }> = {
  diet: { label: '饮食', bg: 'bg-[#FF976A]/10', text: 'text-[#FF976A]', icon: Coffee },
  weight: { label: '体重', bg: 'bg-[#07C160]/10', text: 'text-[#07C160]', icon: Scale },
  exercise: { label: '运动', bg: 'bg-blue-50', text: 'text-blue-600', icon: Activity },
};
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] pb-safe">
    <NavBar title="待批注" :on-back="store.goBack" />

    <div class="p-4 space-y-4">
      <!-- 统计概览 -->
      <div class="grid grid-cols-3 gap-2">
        <div
          :class="['rounded-xl p-3 text-center border transition-all cursor-pointer', activeFilter === 'diet' ? 'border-[#FF976A] bg-[#FF976A]/5' : 'border-gray-100 bg-white']"
          @click="activeFilter = activeFilter === 'diet' ? 'all' : 'diet'"
        >
          <div class="text-lg font-bold text-[#FF976A]">{{ countByType.diet }}</div>
          <div class="text-[10px] text-gray-500">饮食待批注</div>
        </div>
        <div
          :class="['rounded-xl p-3 text-center border transition-all cursor-pointer', activeFilter === 'weight' ? 'border-[#07C160] bg-[#07C160]/5' : 'border-gray-100 bg-white']"
          @click="activeFilter = activeFilter === 'weight' ? 'all' : 'weight'"
        >
          <div class="text-lg font-bold text-[#07C160]">{{ countByType.weight }}</div>
          <div class="text-[10px] text-gray-500">体重待批注</div>
        </div>
        <div
          :class="['rounded-xl p-3 text-center border transition-all cursor-pointer', activeFilter === 'exercise' ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-white']"
          @click="activeFilter = activeFilter === 'exercise' ? 'all' : 'exercise'"
        >
          <div class="text-lg font-bold text-blue-600">{{ countByType.exercise }}</div>
          <div class="text-[10px] text-gray-500">运动待批注</div>
        </div>
      </div>

      <!-- 按学员分组的快捷入口（与筛选共存） -->
      <div v-if="studentGroups.length > 0" class="space-y-2">
        <div class="text-xs text-gray-500 font-medium">按学员查看 <span v-if="activeFilter !== 'all'" class="text-gray-400">（已按{{ activeFilter === 'diet' ? '饮食' : activeFilter === 'weight' ? '体重' : '运动' }}筛选）</span></div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="g in studentGroups"
            :key="g.student?.id"
            @click="openStudent(g.student!.id)"
            class="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2 hover:shadow-sm transition-shadow"
          >
            <div class="h-7 w-7 rounded-full bg-[#1677FF]/10 flex items-center justify-center text-[#1677FF]">
              <UserCircle class="h-5 w-5" />
            </div>
            <span class="text-sm font-medium text-gray-900">{{ g.student?.name }}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FF976A]/10 text-[#FF976A] font-bold">{{ g.count }}</span>
          </button>
        </div>
      </div>

      <!-- 统一待批注列表 -->
      <div class="space-y-3">
        <Card
          v-for="item in filteredItems"
          :key="`${item.type}-${item.id}`"
          class="p-0 overflow-hidden border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
          @click="openRecord(item)"
        >
          <div class="p-3 flex gap-3">
            <!-- 缩略图 -->
            <div class="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
              <template v-if="item.type === 'diet'">
                <img
                  v-if="item.photos && item.photos.length > 0"
                  :src="item.photos[0]"
                  alt="食物"
                  class="w-full h-full object-cover"
                />
                <Coffee v-else class="w-5 h-5 text-gray-400" />
              </template>
              <template v-else-if="item.type === 'weight'">
                <img
                  v-if="item.photos && item.photos.length > 0"
                  :src="item.photos[0]"
                  alt="体重打卡"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full bg-[#07C160]/8 flex items-center justify-center">
                  <Scale class="w-5 h-5 text-[#07C160]" />
                </div>
              </template>
              <template v-else>
                <img
                  v-if="item.photos && item.photos.length > 0"
                  :src="item.photos[0]"
                  alt="运动"
                  class="w-full h-full object-cover"
                />
                <div v-else-if="item.videoUrls && item.videoUrls.length > 0" class="w-full h-full bg-black flex items-center justify-center">
                  <Video class="w-5 h-5 text-white" />
                </div>
                <div v-else class="w-full h-full bg-blue-50 flex items-center justify-center">
                  <Activity class="w-5 h-5 text-blue-500" />
                </div>
              </template>
            </div>

            <!-- 内容 -->
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-center mb-1">
                <div class="flex items-center gap-1.5">
                  <span
                    :class="['text-[10px] px-1.5 py-0.5 rounded font-bold', typeConfig[item.type].bg, typeConfig[item.type].text]"
                  >
                    {{ typeConfig[item.type].label }}
                  </span>
                  <span v-if="item.type === 'diet' && item.meal" class="text-[10px] text-gray-500">{{ item.meal }}</span>
                  <span v-if="item.type === 'exercise'" class="text-[10px] text-gray-500">{{ item.exerciseType }}</span>
                </div>
                <span class="text-[10px] text-gray-400">{{ item.date.substring(5, 16) }}</span>
              </div>

              <!-- 摘要 -->
              <div v-if="item.type === 'diet'" class="text-xs text-gray-700 line-clamp-1">{{ item.description }}</div>
              <div v-else-if="item.type === 'weight'" class="text-sm font-bold text-gray-900">{{ item.weight }} <span class="text-xs font-normal text-gray-400">kg</span></div>
              <div v-else-if="item.type === 'exercise'" class="text-xs text-gray-700">
                {{ item.duration }}分钟 · 强度 {{ item.intensity }}/5
                <span v-if="item.videoUrls && item.videoUrls.length > 0" class="ml-1 text-blue-500">🎬有视频</span>
              </div>

              <div class="flex items-center gap-1 mt-1">
                <span class="text-[10px] text-gray-400">{{ item.studentName }}</span>
              </div>
            </div>

            <!-- 右侧箭头 -->
            <div class="flex items-center">
              <span class="text-gray-300 text-sm">›</span>
            </div>
          </div>
        </Card>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredItems.length === 0" class="text-center py-10 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
        <Clock class="w-8 h-8 mx-auto mb-2 text-gray-300" />
        {{ activeFilter === 'all' ? '暂无待批注记录，全部已处理！' : '该类型暂无待批注记录' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { format } from 'date-fns';
import { useAppStore } from '../store/app';
import { celebrateCheckin, celebrateReward } from '../lib/confetti';
import { calculateStreak } from '../lib/streak';
import { uploadFile } from '../lib/api';
import { compressVideo } from '../lib/videoCompress';
import { NavBar, Card, Button, Input } from './ui';
import { Plus, X, Camera, Video, PlayCircle, Loader, MessageCircle, ChevronDown, Dumbbell, TrendingUp } from 'lucide-vue-next';
import { computeExerciseTrends } from '../lib/journey';
import { formatDateTime } from '../lib/utils';
import { useDateGrouping } from '../composables/useDateGrouping';

const EXERCISE_TYPES = ['跑步', '游泳', '力量训练', '瑜伽', '快走', '骑行', '其他'];

/** 主观强度配置 — 颜色从冷到暖，描述参考 RPE (Rating of Perceived Exertion) 自感用力程度量表 */
const INTENSITY_CONFIG = [
  { level: 1, label: '很轻松',   color: '#3B82F6', lightBg: '#EFF6FF', description: '散步般轻松，能正常对话和唱歌，几乎不喘', example: '如：慢走、拉伸放松' },
  { level: 2, label: '轻松',     color: '#10B981', lightBg: '#ECFDF5', description: '轻微出汗，可以正常对话，呼吸略微加快',     example: '如：快走、轻松骑行' },
  { level: 3, label: '适中',     color: '#F59E0B', lightBg: '#FFFBEB', description: '微喘但能说话，适合日常锻炼的黄金区间',     example: '如：慢跑、游泳' },
  { level: 4, label: '较累',     color: '#F97316', lightBg: '#FFF7ED', description: '明显喘气，只能简短交流，肌肉有酸胀感',     example: '如：快跑、力量训练' },
  { level: 5, label: '非常吃力', color: '#EF4444', lightBg: '#FEF2F2', description: '大汗淋漓，无法说话，接近体能极限',         example: '如：冲刺跑、HIIT' },
] as const;

type ActivityItem = {
  id: string;
  type: string;
  customType: string;
  duration: string;
  intensity: number;
};

const store = useAppStore();

const userExercises = computed(() => store.exerciseRecords.filter((r) => r.studentId === store.user?.id || !r.studentId));

// 所有历史记录按日期分组
const allHistory = computed(() => [...userExercises.value].sort((a, b) => b.date.localeCompare(a.date)));
const { grouped: groupedHistory, toggleDate, isExpanded } = useDateGrouping(allHistory);

// 运动周趋势（规则见 journey.ts computeExerciseTrends 头部文档注释）
const exerciseTrends = computed(() => computeExerciseTrends(store.exerciseRecords, store.user?.id));
const exerciseTrendMax = computed(() => Math.max(...exerciseTrends.value.map((t) => t.totalDuration), 1));

// 全部运动统计（不限时间范围，包含所有历史记录）
const totalExerciseCount = computed(() => userExercises.value.length);
const totalExerciseDuration = computed(() => userExercises.value.reduce((sum, r) => sum + r.duration, 0));
const qualifiedExerciseCount = computed(() => userExercises.value.filter(r => r.duration >= 40).length);
const avgExerciseDuration = computed(() => totalExerciseCount.value > 0 ? Math.round(totalExerciseDuration.value / totalExerciseCount.value) : 0);

const activities = ref<ActivityItem[]>([
  { id: Date.now().toString(), type: '跑步', customType: '', duration: '', intensity: 3 },
]);
const notes = ref('');
const photos = ref<string[]>([]);
const error = ref('');

// Media upload: 'photo' or 'video' - mutually exclusive
const mediaType = ref<'photo' | 'video'>('photo');
const videoUrls = ref<string[]>([]);
const videoCompressing = ref(false);
const compressProgress = ref(0);

const photoInputRef = ref<HTMLInputElement | null>(null);
const videoInputRef = ref<HTMLInputElement | null>(null);

const MAX_VIDEOS = 5;

const switchMediaType = (type: 'photo' | 'video') => {
  if (mediaType.value === type) return;
  mediaType.value = type;
  if (type === 'photo') {
    videoUrls.value = [];
  } else {
    photos.value = [];
  }
  error.value = '';
};

const handlePhotoSelect = async (e: Event) => {
  const files = Array.from((e.target as HTMLInputElement).files || []) as File[];
  if (files.length === 0) return;
  const remaining = 6 - photos.value.length;
  const urls = await Promise.all(files.slice(0, remaining).map((f) => uploadFile(f)));
  photos.value = [...photos.value, ...urls];
  (e.target as HTMLInputElement).value = '';
};

const removePhoto = (index: number) => {
  photos.value = photos.value.filter((_, i) => i !== index);
};

const handleVideoSelect = async (e: Event) => {
  const files = Array.from((e.target as HTMLInputElement).files || []) as File[];
  if (files.length === 0) return;
  const remaining = MAX_VIDEOS - videoUrls.value.length;
  if (remaining <= 0) {
    error.value = `最多上传 ${MAX_VIDEOS} 个视频`;
    (e.target as HTMLInputElement).value = '';
    return;
  }
  const toUpload = files.slice(0, remaining);
  error.value = '';
  videoCompressing.value = true;
  compressProgress.value = 0;

  try {
    const urls = await Promise.all(
      toUpload.map(async (file, idx) => {
        const compressed = await compressVideo(file, 50, (p) => {
          const base = idx / toUpload.length;
          const span = 1 / toUpload.length;
          compressProgress.value = Math.round((base + p * span) * 100);
        });
        return uploadFile(compressed);
      }),
    );
    videoUrls.value = [...videoUrls.value, ...urls];
  } catch {
    error.value = '视频处理失败，请重试';
  } finally {
    videoCompressing.value = false;
    compressProgress.value = 0;
    (e.target as HTMLInputElement).value = '';
  }
};

const removeVideo = (index: number) => {
  videoUrls.value = videoUrls.value.filter((_, i) => i !== index);
};

const handleAddActivity = () => {
  activities.value.push({ id: Date.now().toString(), type: '力量训练', customType: '', duration: '', intensity: 3 });
};

const handleRemoveActivity = (id: string) => {
  if (activities.value.length > 1) {
    activities.value = activities.value.filter((a) => a.id !== id);
  }
};

const updateActivity = (id: string, field: keyof ActivityItem, value: any) => {
  activities.value = activities.value.map((a) => (a.id === id ? { ...a, [field]: value } : a));
  error.value = '';
};

const getIntensityConfig = (level: number) => INTENSITY_CONFIG[level - 1] || INTENSITY_CONFIG[2];

// Burst animation state - tracks which button was just clicked for ripple effect
const burstKey = ref('');
const burstId = ref(0);
let burstTimer: ReturnType<typeof setTimeout> | null = null;

const triggerBurst = (activityId: string, level: number) => {
  burstKey.value = `${activityId}-${level}`;
  burstId.value++;
  if (burstTimer) clearTimeout(burstTimer);
  burstTimer = setTimeout(() => {
    burstKey.value = '';
  }, 700);
};

const handleIntensityClick = (activityId: string, level: number) => {
  // If a swipe just ended, skip the click to avoid double-trigger
  if (swipeJustEnded.value) {
    swipeJustEnded.value = false;
    return;
  }
  updateActivity(activityId, 'intensity', level);
  triggerBurst(activityId, level);
};

// ---- Swipe/Slide support for intensity selector ----
const touchStartX = ref(0);
const touchStartY = ref(0);
const isSwiping = ref(false);
const swipeJustEnded = ref(false); // flag to suppress click after swipe

const getLevelFromTouchX = (clientX: number, bar: HTMLElement): number => {
  const rect = bar.getBoundingClientRect();
  const relX = clientX - rect.left;
  const stepWidth = rect.width / 5;
  const idx = Math.floor(relX / stepWidth);
  return Math.max(1, Math.min(5, idx + 1));
};

const handleTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0];
  touchStartX.value = touch.clientX;
  touchStartY.value = touch.clientY;
  isSwiping.value = false;
};

const handleTouchMove = (e: TouchEvent, activityId: string) => {
  const touch = e.touches[0];
  const dx = touch.clientX - touchStartX.value;
  const dy = touch.clientY - touchStartY.value;
  // Only treat as swipe if horizontal movement dominates and exceeds threshold
  if (!isSwiping.value) {
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      isSwiping.value = true;
    } else {
      return; // don't preventDefault for vertical scroll
    }
  }
  e.preventDefault(); // prevent scrolling during horizontal swipe
  const level = getLevelFromTouchX(touch.clientX, e.currentTarget as HTMLElement);
  const activity = activities.value.find((a) => a.id === activityId);
  if (activity && activity.intensity !== level) {
    updateActivity(activityId, 'intensity', level);
  }
};

const handleTouchEnd = (activityId: string) => {
  if (isSwiping.value) {
    const activity = activities.value.find((a) => a.id === activityId);
    if (activity) {
      triggerBurst(activityId, activity.intensity);
    }
    // Set flag to suppress the subsequent click event
    swipeJustEnded.value = true;
    setTimeout(() => { swipeJustEnded.value = false; }, 300);
  }
  isSwiping.value = false;
};

// 学员对运动批注的反馈（点按钮同时视为已读）
const markExerciseFeedback = (recordId: string, feedback: 'received' | 'helpful') => {
  store.updateExerciseRecord(recordId, { studentFeedback: feedback, commentRead: true });
};

// 学员展开未读批注所在日期分组 → 该分组内批注标记为已读（真正看到才算已读）
const markGroupCommentsRead = (date: string) => {
  const group = groupedHistory.value.find((g) => g.date === date);
  if (!group) return;
  group.records.forEach((r) => {
    if (r.dietitianComment && !r.commentRead) {
      store.updateExerciseRecord(r.id, { commentRead: true });
    }
  });
};

const handleToggleDate = (date: string) => {
  const willExpand = !isExpanded(date);
  toggleDate(date);
  if (willExpand) markGroupCommentsRead(date);
};

// 默认展开的"今天"分组直接可见，其中的未读批注视为已读
markGroupCommentsRead(format(new Date(), 'yyyy-MM-dd'));

// 消息中心跳转：自动展开目标日期并滚动到对应记录
onMounted(() => {
  if (store.selectedDateStr) {
    const targetDate = store.selectedDateStr;
    store.setSelectedDateStr(null);
    if (!isExpanded(targetDate)) toggleDate(targetDate);
    markGroupCommentsRead(targetDate);
    nextTick(() => {
      nextTick(() => {
        const el = document.getElementById(`exercise-group-${targetDate}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
});

const handleSubmit = () => {
  for (const a of activities.value) {
    if (!a.duration) {
      error.value = '请填写所有运动的时长';
      return;
    }
    if (a.type === '其他' && !a.customType.trim()) {
      error.value = '请填写自定义运动名称';
      return;
    }
  }

  error.value = '';

  activities.value.forEach((a, index) => {
    store.addExerciseRecord({
      id: `ex_${Date.now()}_${index}`,
      studentId: store.user?.id || 's1',
      date: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      type: a.type === '其他' ? a.customType : a.type,
      duration: parseInt(a.duration),
      intensity: a.intensity,
      notes: index === 0 ? notes.value : undefined,
      photos: index === 0 && mediaType.value === 'photo' ? photos.value : undefined,
      videoUrls: index === 0 && mediaType.value === 'video' && videoUrls.value.length > 0 ? videoUrls.value : undefined,
    });
  });

  // Check if this check-in unlocks a reward
  const streakResult = calculateStreak(store.exerciseRecords, store.dietRecords, store.weightRecords, store.user?.id);
  const matchedTier = store.rewardTiers.find(t => t.requiredDays === streakResult.currentStreak);
  if (matchedTier) {
    celebrateReward(matchedTier.name);
  } else {
    celebrateCheckin('exercise');
  }
  // Stay on current page - reset form instead of navigating
  activities.value = activities.value.map(a => ({ ...a, duration: '', customType: '' }));
  notes.value = '';
  photos.value = [];
  videoUrls.value = [];
};
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] pb-8 font-sans">
    <NavBar title="运动打卡" :on-back="store.goBack" />

    <div class="p-4 space-y-4">
      <Card v-for="(activity, index) in activities" :key="activity.id" class="space-y-5 relative pt-8 shadow-sm transition-transform hover:scale-[1.005]">
        <button
          v-if="activities.length > 1"
          class="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors p-1"
          @click="handleRemoveActivity(activity.id)"
        >
          <X class="w-5 h-5" />
        </button>

        <div class="absolute top-0 left-0 bg-[#07C160]/10 text-[#07C160] px-3 py-1 rounded-br-lg font-bold text-xs">
          运动项 {{ index + 1 }}
        </div>

        <div class="space-y-3">
          <label class="text-sm font-bold text-gray-900 block">运动类型</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="type in EXERCISE_TYPES"
              :key="type"
              @click="updateActivity(activity.id, 'type', type)"
              :class="['px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95', activity.type === type ? 'bg-[#07C160] text-white shadow-sm scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
            >
              {{ type }}
            </button>
          </div>
        </div>

        <div v-if="activity.type === '其他'" class="space-y-2 animate-pop-in">
          <label class="text-sm font-bold text-gray-900 block">自定义运动名称 <span class="text-red-500">*</span></label>
          <Input
            type="text"
            placeholder="例如：普拉提、爬山"
            :value="activity.customType"
            @input="updateActivity(activity.id, 'customType', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-bold text-gray-900 block">运动时长 (分钟) <span class="text-red-500">*</span></label>
          <!-- 快捷选择 -->
          <div class="flex gap-2">
            <button
              v-for="d in [15, 30, 45, 60]"
              :key="d"
              @click="updateActivity(activity.id, 'duration', String(d))"
              :class="['flex-1 py-2 rounded-lg text-sm font-bold transition-all active:scale-95', activity.duration === String(d) ? 'bg-[#07C160] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
            >
              {{ d }}
            </button>
          </div>
          <Input
            type="number"
            placeholder="或手动输入时长，例如 30"
            :value="activity.duration"
            @input="updateActivity(activity.id, 'duration', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-sm font-bold text-gray-900 block">主观强度</label>
            <span class="text-xs text-gray-400">RPE 自感用力程度</span>
          </div>

          <!-- Intensity buttons with gradient spectrum bar -->
          <div class="relative px-2 py-3">
            <!-- Gradient spectrum background -->
            <div class="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-1.5 rounded-full opacity-10"
                 style="background: linear-gradient(to right, #3B82F6 0%, #10B981 25%, #F59E0B 50%, #F97316 75%, #EF4444 100%);"></div>

            <div
              class="relative flex justify-between items-center touch-pan-y"
              @touchstart="handleTouchStart"
              @touchmove="(e) => handleTouchMove(e, activity.id)"
              @touchend="() => handleTouchEnd(activity.id)"
            >
              <button
                v-for="config in INTENSITY_CONFIG"
                :key="config.level"
                @click="handleIntensityClick(activity.id, config.level)"
                :class="['relative flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 active:scale-90', activity.intensity === config.level ? 'scale-110' : 'bg-gray-100 hover:bg-gray-200']"
                :style="activity.intensity === config.level ? { backgroundColor: config.color, color: 'white', boxShadow: `0 4px 14px ${config.color}50` } : { color: '#9CA3AF' }"
              >
                <span class="font-bold text-sm relative z-10">{{ config.level }}</span>

                <!-- Burst ring 1 -->
                <span
                  v-if="burstKey === `${activity.id}-${config.level}`"
                  :key="`${burstId}-r1`"
                  class="absolute inset-0 rounded-full pointer-events-none"
                  :style="{ animation: `burst-${config.level} 0.6s ease-out forwards`, backgroundColor: config.color }"
                ></span>

                <!-- Burst ring 2 - only for level 4-5, with slight delay for layered effect -->
                <span
                  v-if="burstKey === `${activity.id}-${config.level}` && config.level >= 4"
                  :key="`${burstId}-r2`"
                  class="absolute inset-0 rounded-full pointer-events-none"
                  :style="{ animation: `burst-${config.level}-outer 0.6s ease-out 0.12s forwards`, backgroundColor: config.color }"
                ></span>
              </button>
            </div>
            <!-- Hint text -->
            <p class="text-center text-[10px] text-gray-400 mt-1">点击或左右滑动选择强度</p>
          </div>

          <!-- Intensity description card -->
          <transition name="desc-fade" mode="out-in">
            <div
              :key="activity.intensity"
              class="rounded-xl p-3 border transition-colors duration-300"
              :style="{ backgroundColor: getIntensityConfig(activity.intensity).lightBg, borderColor: getIntensityConfig(activity.intensity).color + '25' }"
            >
              <div class="flex items-center gap-2 mb-1.5">
                <div class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: getIntensityConfig(activity.intensity).color }"></div>
                <span class="text-sm font-bold" :style="{ color: getIntensityConfig(activity.intensity).color }">
                  {{ getIntensityConfig(activity.intensity).label }}
                </span>
                <span class="text-[10px] text-gray-400 font-medium">Lv.{{ activity.intensity }}</span>
              </div>
              <p class="text-xs text-gray-600 leading-relaxed">{{ getIntensityConfig(activity.intensity).description }}</p>
              <p class="text-[10px] text-gray-400 mt-1">{{ getIntensityConfig(activity.intensity).example }}</p>
            </div>
          </transition>
        </div>
      </Card>

      <button
        @click="handleAddActivity"
        class="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 flex items-center justify-center gap-2 hover:border-[#07C160] hover:text-[#07C160] transition-all font-medium bg-white active:scale-[0.98]"
      >
        <Plus class="w-5 h-5" />
        添加运动项
      </button>

      <Card class="space-y-4 shadow-sm">
        <!-- Media type toggle -->
        <div>
          <div class="flex gap-2 mb-3">
            <button
              @click="switchMediaType('photo')"
              :class="['flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95', mediaType === 'photo' ? 'bg-[#07C160] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200']"
            >
              <Camera class="w-4 h-4" />
              图片打卡
            </button>
            <button
              @click="switchMediaType('video')"
              :class="['flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95', mediaType === 'video' ? 'bg-[#07C160] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200']"
            >
              <Video class="w-4 h-4" />
              视频打卡
            </button>
          </div>
          <p class="text-[10px] text-gray-400 text-center">图片和视频二选一，选择一种类型上传</p>
        </div>

        <!-- Photo upload -->
        <div v-if="mediaType === 'photo'">
          <label class="text-sm font-bold text-gray-900 block mb-2">运动照片 (最多 6 张)</label>
          <input ref="photoInputRef" type="file" accept="image/*" multiple class="hidden" @change="handlePhotoSelect" />
          <div class="grid grid-cols-3 gap-2">
            <div v-for="(url, idx) in photos" :key="idx" class="aspect-square rounded-xl bg-gray-100 overflow-hidden relative animate-pop-in">
              <img :src="url" alt="运动打卡" class="w-full min-h-full object-cover" />
              <button
                @click="removePhoto(idx)"
                class="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
              >
                <X class="w-3 h-3" />
              </button>
            </div>
            <div
              v-if="photos.length < 6"
              @click="photoInputRef?.click()"
              class="aspect-square rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors active:scale-95"
            >
              <Camera class="h-6 w-6 text-gray-400 mb-1" />
              <span class="text-[10px] text-gray-400">添加图片</span>
            </div>
          </div>
        </div>

        <!-- Video upload -->
        <div v-if="mediaType === 'video'">
          <label class="text-sm font-bold text-gray-900 block mb-2">运动视频 (最多 {{ MAX_VIDEOS }} 个)</label>
          <input ref="videoInputRef" type="file" accept="video/*" multiple class="hidden" @change="handleVideoSelect" />

          <!-- Compression loading -->
          <div v-if="videoCompressing" class="aspect-video rounded-xl border-2 border-[#07C160]/30 bg-[#07C160]/5 flex flex-col items-center justify-center gap-3">
            <Loader class="h-8 w-8 text-[#07C160] animate-spin" />
            <span class="text-sm text-[#07C160] font-medium">正在处理视频 {{ compressProgress }}%</span>
            <span class="text-[10px] text-gray-400">请耐心等待</span>
          </div>

          <!-- Video grid -->
          <div v-else class="grid grid-cols-3 gap-2">
            <div
              v-for="(url, idx) in videoUrls"
              :key="idx"
              class="aspect-square rounded-xl bg-black overflow-hidden relative animate-pop-in"
            >
              <video
                :src="url"
                class="w-full min-h-full object-cover cursor-pointer"
                preload="metadata"
                @click="store.openVideoPreview(url)"
              />
              <button
                @click="removeVideo(idx)"
                class="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 z-10"
              >
                <X class="w-3 h-3" />
              </button>
              <span class="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                {{ idx + 1 }}/{{ MAX_VIDEOS }}
              </span>
            </div>

            <div
              v-if="videoUrls.length < MAX_VIDEOS"
              @click="videoInputRef?.click()"
              class="aspect-square rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors active:scale-95"
            >
              <Video class="h-6 w-6 text-[#07C160] mb-1" />
              <span class="text-[10px] text-gray-400">上传视频</span>
            </div>
          </div>

          <p v-if="videoUrls.length > 0" class="text-[10px] text-gray-400 mt-2">点击视频可预览，已上传 {{ videoUrls.length }}/{{ MAX_VIDEOS }} 个</p>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-bold text-gray-900 block">综合备注 (选填)</label>
          <textarea
            class="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:border-[#07C160] bg-gray-50 focus:bg-white transition-colors"
            rows="3"
            placeholder="记录一下今天整体的运动感受吧~"
            :value="notes"
            @input="notes = ($event.target as HTMLTextAreaElement).value"
          />
        </div>
      </Card>

      <div v-if="error" class="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded-lg animate-shake">{{ error }}</div>

      <div class="pt-4 pb-8">
        <Button class="w-full shadow-lg shadow-[#07C160]/20 active:scale-95 transition-transform" size="lg" @click="handleSubmit">
          完成打卡
        </Button>
      </div>

      <!-- 运动周趋势（规则见 journey.ts computeExerciseTrends 头部文档注释） -->
      <Card v-if="exerciseTrends.length > 0" class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
            <TrendingUp class="h-4 w-4 text-[#07C160]" />
            每周运动趋势
          </h3>
          <span class="text-[10px] text-gray-400">单位：分钟</span>
        </div>
        <p class="text-[10px] text-gray-400">每周运动总时长，坚持就是胜利</p>
        <!-- 柱状图：每周总时长（分钟） -->
        <div class="flex items-end justify-between gap-1.5 h-24">
          <div v-for="t in exerciseTrends" :key="t.weekLabel" class="flex-1 flex flex-col items-center justify-end h-full">
            <div class="text-[10px] font-bold text-[#07C160] mb-0.5">{{ t.totalDuration }}</div>
            <div class="w-full rounded-t transition-all min-h-[3px] bg-[#07C160]" :style="{ height: `${Math.max((t.totalDuration / exerciseTrendMax) * 100, 3)}%` }"></div>
            <div class="text-[9px] text-gray-400 mt-1">{{ t.weekLabel }}</div>
          </div>
        </div>
        <!-- 图例 -->
        <div class="flex items-center gap-3 text-[9px] text-gray-400">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-[#07C160]"></span>运动总时长(分钟)</span>
        </div>
        <!-- 全部运动统计 -->
        <div class="pt-2 border-t border-gray-50 space-y-2">
          <div class="text-[10px] text-gray-400">全部运动统计：</div>
          <div class="grid grid-cols-4 gap-2 text-center">
            <div class="bg-gray-50 rounded-lg py-2">
              <div class="text-sm font-bold text-gray-900">{{ totalExerciseCount }}</div>
              <div class="text-[9px] text-gray-500">总次数</div>
            </div>
            <div class="bg-[#07C160]/5 rounded-lg py-2">
              <div class="text-sm font-bold text-[#07C160]">{{ totalExerciseDuration }}</div>
              <div class="text-[9px] text-gray-500">总时长(分)</div>
            </div>
            <div class="bg-[#FF976A]/5 rounded-lg py-2">
              <div class="text-sm font-bold text-[#FF976A]">{{ qualifiedExerciseCount }}</div>
              <div class="text-[9px] text-gray-500">达标(≥40min)</div>
            </div>
            <div class="bg-blue-50 rounded-lg py-2">
              <div class="text-sm font-bold text-blue-600">{{ avgExerciseDuration }}</div>
              <div class="text-[9px] text-gray-500">平均(分/次)</div>
            </div>
          </div>
        </div>
        <!-- 最近一周分解 -->
        <div v-if="exerciseTrends.length > 0" class="pt-2 border-t border-gray-50 space-y-2">
          <div class="text-[10px] text-gray-400">最近一周 {{ exerciseTrends[exerciseTrends.length - 1].weekLabel }} 分解：</div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div v-for="t in exerciseTrends.slice(-1)" :key="t.weekLabel" class="contents">
              <div class="bg-gray-50 rounded-lg py-2">
                <div class="text-sm font-bold text-gray-900">{{ t.count }}</div>
                <div class="text-[9px] text-gray-500">本周次数</div>
              </div>
              <div class="bg-[#07C160]/5 rounded-lg py-2">
                <div class="text-sm font-bold text-[#07C160]">{{ t.qualifiedCount }}</div>
                <div class="text-[9px] text-gray-500">达标(≥40min)</div>
              </div>
              <div class="bg-[#FF976A]/5 rounded-lg py-2">
                <div class="text-sm font-bold text-[#FF976A]">{{ t.avgIntensity !== null ? t.avgIntensity.toFixed(1) : '--' }}</div>
                <div class="text-[9px] text-gray-500">平均强度(1-5)</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div class="pt-2 pb-6 border-t border-gray-100">
        <h3 class="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <div class="w-1.5 h-4 bg-[#07C160] rounded-full"></div>
          历史运动记录
        </h3>

        <div v-if="groupedHistory.length === 0" class="text-center py-10 bg-white rounded-2xl border border-gray-100 animate-pop-in">
          <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-[#07C160]/10 flex items-center justify-center">
            <Dumbbell class="w-8 h-8 text-[#07C160]" />
          </div>
          <div class="text-sm font-bold text-gray-700 mb-1">还没有运动记录</div>
          <div class="text-xs text-gray-400 mb-4">完成今天的第一次运动打卡吧</div>
          <button @click="activities[0].duration = '30'" class="text-xs font-bold text-[#07C160] bg-[#07C160]/10 px-4 py-2 rounded-full active:scale-95 transition-transform">从 30 分钟开始 →</button>
        </div>
        <div v-else class="space-y-4">
          <div v-for="group in groupedHistory" :key="group.date" :id="`exercise-group-${group.date}`">
            <!-- Date header -->
            <button
              @click="handleToggleDate(group.date)"
              class="w-full flex items-center justify-between bg-white rounded-xl px-4 py-2.5 mb-2 border border-gray-100 sticky top-0 z-10 shadow-sm"
            >
              <div class="flex items-center gap-2">
                <span class="w-1 h-4 rounded-full bg-[#07C160]"></span>
                <span class="text-sm font-bold text-gray-800">{{ group.label }}</span>
                <span class="text-[10px] text-gray-400">{{ group.records.length }}条记录</span>
                <span v-if="group.records.some((r) => r.dietitianComment && !r.commentRead)" class="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">新批注</span>
              </div>
              <ChevronDown
                class="w-4 h-4 text-gray-400 transition-transform duration-200"
                :class="{ 'rotate-180': isExpanded(group.date) }"
              />
            </button>
            <!-- Records for this date -->
            <div v-show="isExpanded(group.date)" class="space-y-4 animate-pop-in">
              <Card v-for="record in group.records" :key="record.id" class="p-0 overflow-hidden transition-transform hover:scale-[1.01]">
                <div class="p-4 border-b border-gray-50">
                  <div class="flex justify-between items-center mb-3">
                    <span class="text-xs text-gray-500 font-medium">{{ formatDateTime(record.date) }}</span>
                    <span class="text-[10px] px-2 py-0.5 rounded text-[#07C160] bg-[#07C160]/10 font-bold uppercase">
                      {{ record.type }}
                    </span>
                  </div>

                  <div class="flex justify-between mb-2">
                    <span class="text-sm font-medium text-gray-900">时长: {{ record.duration }} 分钟</span>
                    <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                          :style="{ backgroundColor: getIntensityConfig(record.intensity).lightBg, color: getIntensityConfig(record.intensity).color }">
                      <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getIntensityConfig(record.intensity).color }"></span>
                      {{ getIntensityConfig(record.intensity).label }}
                    </span>
                  </div>

                  <p v-if="record.notes" class="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{{ record.notes }}</p>

                  <div v-if="record.photos && record.photos.length > 0" class="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <img
                      v-for="(url, idx) in record.photos"
                      :key="idx"
                      :src="url"
                      alt="运动"
                      class="h-20 w-20 object-cover rounded-lg shrink-0 snap-center border border-gray-100 cursor-pointer"
                      @click="store.openImagePreview(record.photos || [], idx)"
                    />
                  </div>

                  <div v-if="record.videoUrls && record.videoUrls.length > 0" class="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div
                      v-for="(url, idx) in record.videoUrls"
                      :key="idx"
                      class="h-20 w-20 rounded-lg shrink-0 snap-center border border-gray-100 overflow-hidden relative bg-black cursor-pointer"
                      @click="store.openVideoPreview(url)"
                    >
                      <video :src="url" class="w-full h-full object-cover" preload="metadata" />
                      <div class="absolute inset-0 flex items-center justify-center bg-black/20">
                        <PlayCircle class="w-6 h-6 text-white drop-shadow" />
                      </div>
                    </div>
                  </div>

                  <div v-if="record.dietitianComment" class="mt-3 p-2.5 rounded-lg bg-[#07C160]/5 border border-[#07C160]/10">
                    <div class="flex items-center gap-1.5 mb-1">
                      <MessageCircle class="w-3 h-3 text-[#07C160]" />
                      <span class="text-[11px] font-bold text-[#07C160]">批注</span>
                      <span v-if="record.dietitianScore === 2" class="text-[10px] font-bold text-white bg-[#07C160] px-1.5 py-0.5 rounded">+2</span>
                      <span v-else-if="record.dietitianScore === 1" class="text-[10px] font-bold text-white bg-[#FF976A] px-1.5 py-0.5 rounded">+1</span>
                      <span v-else-if="record.dietitianScore === 0" class="text-[10px] font-bold text-white bg-gray-400 px-1.5 py-0.5 rounded">0</span>
                      <span v-if="!record.commentRead" class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    </div>
                    <p class="text-xs text-gray-700 leading-relaxed">{{ record.dietitianComment }}</p>
                    <!-- 学员反馈 -->
                    <div class="flex gap-2 mt-2">
                      <button
                        @click="markExerciseFeedback(record.id, 'received')"
                        :class="['text-[10px] px-2.5 py-1 rounded-full font-bold transition-all active:scale-95', record.studentFeedback === 'received' ? 'bg-[#07C160] text-white' : 'bg-white text-gray-500 border border-gray-200']"
                      >
                        {{ record.studentFeedback === 'received' ? '✓ 已收到' : '收到' }}
                      </button>
                      <button
                        @click="markExerciseFeedback(record.id, 'helpful')"
                        :class="['text-[10px] px-2.5 py-1 rounded-full font-bold transition-all active:scale-95', record.studentFeedback === 'helpful' ? 'bg-[#FF976A] text-white' : 'bg-white text-gray-500 border border-gray-200']"
                      >
                        {{ record.studentFeedback === 'helpful' ? '✓ 有用' : '👍 有用' }}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes popIn {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

/* Intensity burst animations - scale grows with intensity level */
@keyframes burst-1 { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(1.6); opacity: 0; } }
@keyframes burst-2 { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(1.9); opacity: 0; } }
@keyframes burst-3 { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2.3); opacity: 0; } }
@keyframes burst-4 { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2.7); opacity: 0; } }
@keyframes burst-5 { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(3.2); opacity: 0; } }
/* Second outer ring for level 4-5 - even larger, creates layered explosion effect */
@keyframes burst-4-outer { 0% { transform: scale(1); opacity: 0.3; } 100% { transform: scale(3.8); opacity: 0; } }
@keyframes burst-5-outer { 0% { transform: scale(1); opacity: 0.3; } 100% { transform: scale(4.5); opacity: 0; } }

/* Description card transition */
.desc-fade-enter-active, .desc-fade-leave-active {
  transition: all 0.25s ease;
}
.desc-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.desc-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.animate-pop-in {
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.animate-shake {
  animation: shake 0.4s ease-in-out;
}
</style>

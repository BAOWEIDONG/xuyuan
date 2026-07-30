<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from 'date-fns';
import { useAppStore } from '../store/app';
import { uploadFile } from '../lib/api';
import { MOCK_STUDENTS } from '../mock/data';
import { NavBar, Card, Button } from './ui';
import { Camera, X, UserCircle } from 'lucide-vue-next';

const store = useAppStore();

const student = computed(() => MOCK_STUDENTS.find((s) => s.id === store.selectedStudentId));

const photos = ref<string[]>([]);
const remarks = ref('');
const error = ref('');

const photoInputRef = ref<HTMLInputElement | null>(null);

const handlePhotoSelect = async (e: Event) => {
  const files = Array.from((e.target as HTMLInputElement).files || []) as File[];
  if (files.length === 0) return;
  const remaining = 20 - photos.value.length;
  const urls = await Promise.all(files.slice(0, remaining).map((f) => uploadFile(f)));
  photos.value = [...photos.value, ...urls];
  (e.target as HTMLInputElement).value = '';
};

const removePhoto = (idx: number) => {
  photos.value = photos.value.filter((_, i) => i !== idx);
};

const handleSubmit = () => {
  if (photos.value.length === 0) {
    error.value = '请至少上传一张照片';
    return;
  }

  error.value = '';
  store.addExerciseRecord({
    id: `act_${Date.now()}`,
    date: format(new Date(), 'yyyy-MM-dd'),
    type: '线下活动陪练',
    duration: 60,
    intensity: 3,
    notes: remarks.value || '教练上传的活动记录',
    photos: photos.value,
  });

  store.setCurrentView('coach-dashboard');
};
</script>

<template>
  <div v-if="!student" class="flex min-h-full flex-col bg-[#F7F8FA] pb-safe">
    <NavBar title="上传陪练记录" :on-back="store.goBack" />
    <div class="flex-1 flex items-center justify-center text-gray-500 text-sm">
      未选择学员
    </div>
  </div>
  <div v-else class="flex min-h-screen flex-col bg-[#F7F8FA] pb-safe">
    <NavBar title="上传活动照片" :on-back="store.goBack" />

    <div class="p-4 space-y-4">
      <Card class="flex items-center space-x-3 p-4 bg-[#07C160]/5 border-[#07C160]/20">
        <div class="h-10 w-10 rounded-full bg-[#07C160]/10 flex items-center justify-center text-[#07C160]">
          <UserCircle class="h-6 w-6" />
        </div>
        <div>
          <div class="text-sm font-bold text-gray-900 mb-1">目标学员: {{ student.name }}</div>
          <div class="text-xs text-gray-500">
            {{ format(new Date(), 'yyyy-MM-dd HH:mm') }}
          </div>
        </div>
      </Card>

      <Card class="space-y-4">
        <div class="space-y-2">
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-medium text-gray-700 block">现场照片 <span class="text-red-500">*</span></label>
            <input ref="photoInputRef" type="file" accept="image/*" multiple class="hidden" @change="handlePhotoSelect" />
            <span class="text-xs text-gray-400">{{ photos.length }}/20 张</span>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div v-for="(url, idx) in photos" :key="idx" class="relative aspect-square rounded-lg overflow-hidden border border-gray-100 group">
              <img :src="url" :alt="`照片 ${idx + 1}`" class="w-full min-h-full object-cover" />
              <button
                @click="removePhoto(idx)"
                class="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white hover:bg-black/70"
              >
                <X class="w-3 h-3" />
              </button>
            </div>

            <button
              v-if="photos.length < 20"
              @click="photoInputRef?.click()"
              class="aspect-square flex flex-col items-center justify-center rounded-lg border border-dashed border-[#07C160]/40 bg-[#07C160]/5 text-[#07C160] hover:bg-[#07C160]/10 transition-colors"
            >
              <Camera class="w-6 h-6 mb-1" />
              <span class="text-[10px]">添加照片</span>
            </button>
          </div>
          <p class="text-[10px] text-gray-400 mt-2">支持 JPG/PNG 格式，单张不超过 10MB</p>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 block">备注说明</label>
          <textarea
            placeholder="请输入本次训练的重点或学员表现..."
            :value="remarks"
            @input="remarks = ($event.target as HTMLTextAreaElement).value"
            class="w-full h-24 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#07C160]/20 focus:border-[#07C160] resize-none text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
      </Card>

      <div v-if="error" class="text-red-500 text-sm text-center">{{ error }}</div>

      <div class="pt-4">
        <Button
          class="w-full bg-[#07C160] hover:bg-[#07C160]/90 text-white"
          size="lg"
          @click="handleSubmit"
        >
          提交记录
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { format } from 'date-fns';
import { useAppStore } from '../store/app';
import { uploadFile } from '../lib/api';
import { NavBar, Card, Button, Input } from './ui';
import { Camera, Video, X } from 'lucide-vue-next';

const store = useAppStore();

const formData = reactive({ title: '', description: '' });
const imageFiles = ref<string[]>([]);
const videoUrls = ref<string[]>([]);
const mediaType = ref<'image' | 'video'>('image');
const error = ref('');

const photoInputRef = ref<HTMLInputElement | null>(null);
const videoInputRef = ref<HTMLInputElement | null>(null);

const handlePhotoSelect = async (e: Event) => {
  const files = Array.from((e.target as HTMLInputElement).files || []) as File[];
  if (files.length === 0) return;
  const remaining = 5 - imageFiles.value.length;
  const urls = await Promise.all(files.slice(0, remaining).map((f) => uploadFile(f)));
  imageFiles.value = [...imageFiles.value, ...urls];
  (e.target as HTMLInputElement).value = '';
};

const handleVideoSelect = async (e: Event) => {
  const files = Array.from((e.target as HTMLInputElement).files || []) as File[];
  if (files.length === 0) return;
  const remaining = 5 - videoUrls.value.length;
  const urls = await Promise.all(files.slice(0, remaining).map((f) => uploadFile(f)));
  videoUrls.value = [...videoUrls.value, ...urls];
  (e.target as HTMLInputElement).value = '';
};

const removeImage = (i: number) => { imageFiles.value = imageFiles.value.filter((_, x) => x !== i); };
const removeVideo = (i: number) => { videoUrls.value = videoUrls.value.filter((_, x) => x !== i); };

const switchType = (t: 'image' | 'video') => {
  mediaType.value = t;
  if (t === 'image') videoUrls.value = [];
  else imageFiles.value = [];
  error.value = '';
};

const handleSubmit = () => {
  if (!formData.title) { error.value = '请输入活动标题'; return; }
  if (!formData.description) { error.value = '请输入活动介绍'; return; }
  if (mediaType.value === 'image' && imageFiles.value.length === 0) { error.value = '请至少上传一张图片'; return; }
  if (mediaType.value === 'video' && videoUrls.value.length === 0) { error.value = '请至少上传一个视频'; return; }

  store.addCoachActivity({
    id: `act_${Date.now()}`,
    title: formData.title,
    description: formData.description,
    imageUrls: mediaType.value === 'image' ? imageFiles.value : [],
    videoUrls: mediaType.value === 'video' ? videoUrls.value : [],
    coachName: store.user?.name || '教练',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  store.setCurrentView('coach-dashboard');
};
</script>

<template>
  <div class="flex min-h-full flex-col bg-[#F7F8FA] pb-safe">
    <NavBar title="发布锻炼活动" :on-back="store.goBack" />

    <div class="p-4 space-y-4">
      <Card>
        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700 block mb-2">活动多媒体 <span class="text-red-500">*</span></label>

            <div class="flex bg-gray-100 p-1 rounded-lg mb-3">
              <button
                :class="['flex-1 py-1.5 text-sm font-medium rounded-md transition-colors', mediaType === 'image' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500']"
                @click="switchType('image')"
              >上传图片</button>
              <button
                :class="['flex-1 py-1.5 text-sm font-medium rounded-md transition-colors', mediaType === 'video' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500']"
                @click="switchType('video')"
              >上传视频</button>
            </div>

            <input ref="photoInputRef" type="file" accept="image/*" multiple class="hidden" @change="handlePhotoSelect" />
            <input ref="videoInputRef" type="file" accept="video/*" multiple class="hidden" @change="handleVideoSelect" />

            <div class="grid grid-cols-3 gap-2">
              <template v-if="mediaType === 'video'">
                <div v-for="(url, index) in videoUrls" :key="index" class="aspect-square rounded-xl bg-black overflow-hidden relative">
                  <video :src="url" class="w-full min-h-full object-cover cursor-pointer" preload="metadata" playsinline webkit-playsinline @click="store.openVideoPreview(url)" />
                  <button @click="removeVideo(index)" class="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 z-10">
                    <X class="w-3 h-3" />
                  </button>
                </div>
                <div
                  v-if="videoUrls.length < 5"
                  @click="videoInputRef?.click()"
                  class="aspect-square rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <Video class="h-6 w-6 text-[#1677FF] mb-1" />
                  <span class="text-[10px] text-gray-400">上传视频</span>
                </div>
              </template>

              <template v-else>
                <div v-for="(url, index) in imageFiles" :key="index" class="aspect-square rounded-xl bg-gray-100 overflow-hidden relative">
                  <img :src="url" :alt="`Preview ${index}`" class="w-full min-h-full object-cover cursor-pointer" @click="store.openImagePreview(imageFiles, index)" />
                  <button @click="removeImage(index)" class="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
                    <X class="w-3 h-3" />
                  </button>
                </div>
                <div
                  v-if="imageFiles.length < 5"
                  @click="photoInputRef?.click()"
                  class="aspect-square rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <Camera class="h-6 w-6 text-gray-400 mb-1" />
                  <span class="text-[10px] text-gray-400">上传图片</span>
                </div>
              </template>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700 block">活动标题 <span class="text-red-500">*</span></label>
            <Input
              placeholder="例如：全身燃脂 HIIT"
              :value="formData.title"
              @input="formData.title = ($event.target as HTMLInputElement).value; error = ''"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700 block">活动介绍 <span class="text-red-500">*</span></label>
            <textarea
              placeholder="请输入详细的锻炼动作说明、注意事项及建议时长..."
              :value="formData.description"
              @input="formData.description = ($event.target as HTMLTextAreaElement).value; error = ''"
              class="w-full h-32 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1677FF]/20 focus:border-[#1677FF] resize-none text-sm text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>
      </Card>

      <div v-if="error" class="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded-lg">{{ error }}</div>

      <div class="pt-4">
        <Button
          class="w-full bg-[#1677FF] hover:bg-[#1677FF]/90 text-white shadow-lg shadow-[#1677FF]/20"
          size="lg"
          @click="handleSubmit"
        >
          发布活动
        </Button>
      </div>
    </div>
  </div>
</template>

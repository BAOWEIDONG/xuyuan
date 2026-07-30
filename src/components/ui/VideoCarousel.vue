<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  videoUrls: string[];
  heightClass?: string;
  onVideoClick?: (index: number) => void;
}>(), {
  heightClass: 'aspect-video',
});

const currentIndex = ref(0);
const scrollRef = ref<HTMLDivElement | null>(null);

const handleScroll = (e: Event) => {
  if (!scrollRef.value) return;
  const scrollPosition = (e.currentTarget as HTMLDivElement).scrollLeft;
  const width = scrollRef.value.clientWidth;
  const newIndex = Math.round(scrollPosition / width);
  if (newIndex !== currentIndex.value) {
    currentIndex.value = newIndex;
  }
};

watch(() => props.videoUrls, () => {
  currentIndex.value = 0;
});
</script>

<template>
  <div v-if="videoUrls && videoUrls.length > 0" class="relative group bg-black">
    <div
      ref="scrollRef"
      @scroll="handleScroll"
      class="flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      <div v-for="(url, idx) in videoUrls" :key="idx" :class="['relative w-full shrink-0 snap-center', heightClass]">
        <video
          :src="url"
          :class="['w-full h-full object-contain', onVideoClick ? 'cursor-pointer' : '']"
          preload="metadata"
          @click="onVideoClick?.(idx)"
        />
        <div
          v-if="onVideoClick"
          class="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none"
        >
          <div class="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <svg class="w-6 h-6 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
    <template v-if="videoUrls.length > 1">
      <div class="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-medium px-2 py-1 rounded-full backdrop-blur-sm pointer-events-none">
        滑动查看 ({{ videoUrls.length }}个视频)
      </div>
      <div class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
        <div
          v-for="(_, idx) in videoUrls"
          :key="idx"
          :class="['h-1.5 rounded-full transition-all', idx === currentIndex ? 'w-4 bg-[#07C160] shadow-sm' : 'w-1.5 bg-white/70 backdrop-blur-sm']"
        />
      </div>
    </template>
  </div>
</template>

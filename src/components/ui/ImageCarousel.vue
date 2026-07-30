<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  imageUrls: string[];
  heightClass?: string;
  onImageClick?: (index: number) => void;
}>(), {
  heightClass: 'h-48',
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

watch(() => props.imageUrls, () => {
  currentIndex.value = 0;
});
</script>

<template>
  <div v-if="imageUrls && imageUrls.length > 0" class="relative group">
    <div
      ref="scrollRef"
      @scroll="handleScroll"
      class="flex overflow-x-auto snap-x snap-mandatory bg-gray-50 border-b border-gray-100 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      <div v-for="(url, idx) in imageUrls" :key="idx" :class="['relative w-full shrink-0 snap-center', heightClass]">
        <img
          :src="url"
          :alt="`img ${idx + 1}`"
          :class="['w-full h-full object-cover', onImageClick ? 'cursor-pointer' : '']"
          @click="onImageClick?.(idx)"
        />
      </div>
    </div>
    <template v-if="imageUrls.length > 1">
      <div class="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-medium px-2 py-1 rounded-full backdrop-blur-sm pointer-events-none">
        滑动多图 ({{ imageUrls.length }}张)
      </div>
      <div class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
        <div
          v-for="(_, idx) in imageUrls"
          :key="idx"
          :class="['h-1.5 rounded-full transition-all', idx === currentIndex ? 'w-4 bg-[#07C160] shadow-sm' : 'w-1.5 bg-white/70 backdrop-blur-sm']"
        />
      </div>
    </template>
  </div>
</template>

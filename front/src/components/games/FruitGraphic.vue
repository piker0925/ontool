<template>
  <div
      class="relative rounded-full flex flex-col items-center justify-center select-none overflow-hidden border-2 shadow-2xl transition-transform duration-75 shrink-0"
      :style="containerStyle"
  >
    <!-- 1. 2D 입체 광택 하이라이트 (Upper-Left Glossy Specular) -->
    <div class="absolute inset-0 rounded-full bg-gradient-to-b from-white/45 via-white/10 to-transparent pointer-events-none z-10"/>

    <!-- 2. 과일별 고유 그래픽 패턴 & 데코레이션 -->

    <!-- 체리 (Lv.0): 줄기 & 체리 잎사귀 -->
    <div v-if="level === 0" class="absolute top-0.5 z-20 flex flex-col items-center pointer-events-none">
      <div class="w-1 h-2 bg-emerald-700 rounded-full transform -rotate-12"/>
    </div>

    <!-- 딸기 (Lv.1): 상단 초록 잎사귀 왕관 + 씨앗 점 패턴 -->
    <template v-if="level === 1">
      <div class="absolute top-0 inset-x-0 flex justify-center gap-0.5 z-20 pointer-events-none">
        <div class="w-2.5 h-1.5 bg-emerald-600 rounded-b-full transform -rotate-12"/>
        <div class="w-3 h-2 bg-emerald-500 rounded-b-full"/>
        <div class="w-2.5 h-1.5 bg-emerald-600 rounded-b-full transform rotate-12"/>
      </div>
      <div class="absolute inset-0 grid grid-cols-3 gap-1 p-2 opacity-70 pointer-events-none z-0 items-center justify-items-center">
        <div v-for="n in 6" :key="n" class="w-1 h-1.5 bg-amber-200 rounded-full transform rotate-12"/>
      </div>
    </template>

    <!-- 포도 (Lv.2): 포도 알맹이 서클들 -->
    <template v-if="level === 2">
      <div class="absolute inset-1.5 rounded-full border-2 border-purple-200/50 opacity-80 pointer-events-none"/>
    </template>

    <!-- 한라봉 (Lv.3): 상단 꼭지 볼록 이펙트 -->
    <div v-if="level === 3" class="absolute top-0 w-4 h-2.5 bg-amber-700 rounded-t-full z-20 pointer-events-none border-b border-amber-800"/>

    <!-- 귤 (Lv.4): 단면 텍스처 센서 -->
    <div v-if="level === 4" class="absolute inset-2 rounded-full border-2 border-amber-100/50 opacity-60 pointer-events-none"/>

    <!-- 사과 (Lv.5): 상단 갈색 줄기 & 초록 잎사귀 -->
    <div v-if="level === 5" class="absolute top-0 z-20 flex items-center justify-center pointer-events-none">
      <div class="w-1.5 h-3 bg-amber-950 rounded-sm"/>
      <div class="w-3 h-2 bg-emerald-500 rounded-full transform rotate-45 -ml-1"/>
    </div>

    <!-- 배 (Lv.6): 상단 꼭지 -->
    <div v-if="level === 6" class="absolute top-0 z-20 flex items-center justify-center pointer-events-none">
      <div class="w-1.5 h-3 bg-amber-900 rounded-sm"/>
    </div>

    <!-- 파인애플 (Lv.8): 다이아몬드 격자 패턴 & 상단 뾰족 잎 -->
    <template v-if="level === 8">
      <div class="absolute top-0 z-20 flex justify-center gap-0.5 pointer-events-none">
        <div class="w-2 h-4 bg-emerald-600 rounded-t-full transform -rotate-12"/>
        <div class="w-2.5 h-5 bg-emerald-500 rounded-t-full"/>
        <div class="w-2 h-4 bg-emerald-600 rounded-t-full transform rotate-12"/>
      </div>
      <div class="absolute inset-0 bg-[radial-gradient(#713f12_2px,transparent_2px)] [background-size:12px_12px] opacity-40 pointer-events-none"/>
    </template>

    <!-- 멜론 (Lv.9): 이중 화이트 격자 그물망 -->
    <div v-if="level === 9" class="absolute inset-0 bg-[radial-gradient(#ffffff_2px,transparent_2px)] [background-size:10px_10px] opacity-40 pointer-events-none"/>

    <!-- 수박 (Lv.10): 검은색 물결 줄무늬 패턴 -->
    <div v-if="level === 10" class="absolute inset-0 flex justify-around pointer-events-none opacity-60 z-0">
      <div class="w-4 h-full bg-emerald-950 rounded-full transform -rotate-12"/>
      <div class="w-5 h-full bg-emerald-950 rounded-full"/>
      <div class="w-4 h-full bg-emerald-950 rounded-full transform rotate-12"/>
    </div>

    <!-- 3. 귀여운 아케이드 표정 (Kawaii Face) -->
    <div
        v-if="radius >= 16"
        class="relative z-20 flex flex-col items-center justify-center pointer-events-none"
        :style="{ transform: `scale(${Math.max(0.65, radius / 45)})` }"
    >
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-0.5">
          <div class="w-1.5 h-1.5 rounded-full bg-slate-950"/>
          <div class="w-1 h-1 rounded-full bg-pink-400/90 -mt-1"/>
        </div>
        <div class="flex items-center gap-0.5">
          <div class="w-1 h-1 rounded-full bg-pink-400/90 -mt-1"/>
          <div class="w-1.5 h-1.5 rounded-full bg-slate-950"/>
        </div>
      </div>
      <div class="w-2.5 h-1 border-b-2 border-slate-950 rounded-full mt-0.5 opacity-90"/>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed} from 'vue'

const props = defineProps<{
  level: number
  radius: number
}>()

const FRUIT_GRADIENTS: Record<number, string> = {
  0: 'radial-gradient(circle at 35% 35%, #fca5a5, #ef4444, #7f1d1d)', // 체리
  1: 'radial-gradient(circle at 35% 35%, #fda4af, #f43f5e, #881337)', // 딸기
  2: 'radial-gradient(circle at 35% 35%, #c084fc, #8b5cf6, #4c1d95)', // 포도
  3: 'radial-gradient(circle at 35% 35%, #ffb74d, #f97316, #9a3412)', // 한라봉
  4: 'radial-gradient(circle at 35% 35%, #fde047, #eab308, #713f12)', // 귤
  5: 'radial-gradient(circle at 35% 35%, #f87171, #dc2626, #7f1d1d)', // 사과
  6: 'radial-gradient(circle at 35% 35%, #bef264, #a3e635, #3f6212)', // 배
  7: 'radial-gradient(circle at 35% 35%, #fbcfe8, #f43f5e, #9f1239)', // 복숭아
  8: 'radial-gradient(circle at 35% 35%, #fef08a, #ca8a04, #713f12)', // 파인애플
  9: 'radial-gradient(circle at 35% 35%, #86efac, #22c55e, #14532d)', // 멜론
  10: 'radial-gradient(circle at 35% 35%, #4ade80, #15803d, #022c22)', // 수박
}

const BORDER_COLORS: Record<number, string> = {
  0: '#b91c1c', 1: '#be123c', 2: '#6b21a8', 3: '#c2410c', 4: '#a16207',
  5: '#991b1b', 6: '#4d7c0f', 7: '#be123c', 8: '#854d0e', 9: '#15803d', 10: '#064e3b'
}

const containerStyle = computed(() => {
  const diameter = props.radius * 2
  return {
    width: `${diameter}px`,
    height: `${diameter}px`,
    background: FRUIT_GRADIENTS[props.level] ?? '#15803d',
    borderColor: BORDER_COLORS[props.level] ?? '#ffffff',
    boxShadow: `0 6px 14px rgba(0,0,0,0.4)`
  }
})
</script>

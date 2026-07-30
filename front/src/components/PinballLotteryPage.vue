<template>
  <div class="flex flex-col items-center gap-5 py-6 select-none max-w-md mx-auto">
    <!-- 헤더 & 당첨 조건 토글 -->
    <div class="flex flex-col items-center gap-2 w-full text-center">
      <h2 class="text-xl font-bold text-foreground">🔮 핀볼 추첨기</h2>
      <p class="text-xs text-muted-foreground">위에서 떨어지는 2D 물리 핀볼 구슬로 당첨자를 결정하세요!</p>

      <div class="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 p-1 mt-1">
        <button
            :class="rule === 'first'
              ? 'bg-amber-500 text-white font-bold shadow-md'
              : 'text-muted-foreground hover:text-foreground'"
            class="px-3 py-1.5 rounded-lg text-xs transition-[background-color,color]"
            type="button"
            @click="setRule('first')"
        >
          🥇 1등 당첨 (가장 먼저)
        </button>
        <button
            :class="rule === 'last'
              ? 'bg-purple-600 text-white font-bold shadow-md'
              : 'text-muted-foreground hover:text-foreground'"
            class="px-3 py-1.5 rounded-lg text-xs transition-[background-color,color]"
            type="button"
            @click="setRule('last')"
        >
          🐢 꼴찌 당첨 (가장 늦게)
        </button>
      </div>
    </div>

    <!-- 참가자 이름 입력 -->
    <div v-if="state.status === 'idle'" class="flex w-full flex-col gap-2">
      <label class="text-xs font-mono font-bold text-muted-foreground">참가자 목록 (쉼표로 구분)</label>
      <input
          v-model="namesInput"
          class="w-full rounded-xl border border-border/80 bg-muted/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-zone-accent focus:outline-none"
          placeholder="예: 김철수, 이영희, 박지성, 손흥민"
          @keyup.enter="onStart"
      />
      <button
          class="flex w-full items-center justify-center gap-2 rounded-2xl bg-zone-accent py-3 font-bold text-white shadow-[0_0_20px_color-mix(in_oklch,var(--zone-accent)_35%,transparent)] transition-[transform,box-shadow] hover:-translate-y-0.5 active:scale-95 mt-1"
          type="button"
          @click="onStart"
      >
        <span>🚀 핀볼 추첨 시작!</span>
      </button>
    </div>

    <!-- 2D 물리 핀볼 보드 -->
    <div
        class="relative border-4 border-purple-900/80 bg-gradient-to-b from-slate-950 via-purple-950 to-indigo-950 rounded-2xl shadow-2xl overflow-hidden"
        :style="{ width: `${PINBALL_WIDTH}px`, height: `${PINBALL_HEIGHT}px` }"
        data-testid="pinball-board"
    >
      <!-- 삼각/원형 핀 (Pegs) -->
      <div
          v-for="(peg, i) in state.pegs"
          :key="i"
          :style="{
            left: `${peg.x - peg.radius}px`,
            top: `${peg.y - peg.radius}px`,
            width: `${peg.radius * 2}px`,
            height: `${peg.radius * 2}px`
          }"
          class="absolute rounded-full bg-amber-400 border border-amber-100 shadow-[0_0_8px_#facc15] z-10"
      />

      <!-- 구슬 (Marbles with nickname bubbles) -->
      <div
          v-for="b in state.balls"
          :key="b.id"
          :style="{
            left: `${b.x - b.radius}px`,
            top: `${b.y - b.radius}px`,
            width: `${b.radius * 2}px`,
            height: `${b.radius * 2}px`,
            backgroundColor: b.color
          }"
          class="absolute rounded-full border border-white shadow-[0_0_10px_#ffffff] z-20 flex items-center justify-center transition-transform duration-75"
      >
        <!-- 닉네임 말풍선 뱃지 -->
        <span class="absolute -top-4 whitespace-nowrap text-[9px] font-bold text-white bg-slate-950/80 px-1.5 py-0.5 rounded-full border border-white/20 pointer-events-none">
          {{ b.name }}
        </span>
      </div>

      <!-- 바닥 골인 라인 -->
      <div class="absolute bottom-0 inset-x-0 h-4 border-t-2 border-dashed border-amber-400/60 bg-amber-400/10 flex items-center justify-center">
        <span class="text-[9px] font-mono font-bold text-amber-300">GOAL LINE</span>
      </div>

      <!-- 당첨 결과 오버레이 -->
      <div
          v-if="state.status === 'finished'"
          class="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3 p-4 animate-fade-in"
          data-testid="pinball-result"
      >
        <span class="text-4xl animate-bounce">🏆</span>
        <div class="flex flex-col items-center text-center">
          <span class="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
            {{ rule === 'first' ? '🥇 1등 당첨자' : '🐢 꼴찌 당첨자' }}
          </span>
          <span class="text-2xl font-black text-white mt-1 drop-shadow-[0_0_12px_#ffffff]">
            {{ state.winner?.name }}
          </span>
        </div>
        <button
            class="mt-2 rounded-xl bg-zone-accent px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-zone-accent/90"
            type="button"
            @click="resetAll"
        >
          다시 추첨하기
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {onUnmounted, ref} from 'vue'
import {
  createPinballState,
  PINBALL_HEIGHT,
  PINBALL_WIDTH,
  startPinball,
  tickPinball
} from '../utils/pinballLottery'

const rule = ref<'first' | 'last'>('first')
const namesInput = ref('김철수, 이영희, 박지성, 손흥민')

const state = ref(createPinballState(parseNames(namesInput.value), rule.value))
let intervalId: ReturnType<typeof setInterval> | null = null

function parseNames(input: string): string[] {
  return input
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
}

function setRule(r: 'first' | 'last') {
  rule.value = r
  resetAll()
}

function resetAll() {
  if (intervalId) clearInterval(intervalId)
  state.value = createPinballState(parseNames(namesInput.value), rule.value)
}

function onStart() {
  const names = parseNames(namesInput.value)
  if (names.length < 2) return
  if (intervalId) clearInterval(intervalId)

  state.value = createPinballState(names, rule.value)
  state.value = startPinball(state.value)

  intervalId = setInterval(() => {
    state.value = tickPinball(state.value, 40)
    if (state.value.status === 'finished') {
      if (intervalId) clearInterval(intervalId)
    }
  }, 40)
}

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

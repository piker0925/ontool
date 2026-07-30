<template>
  <div class="flex flex-col items-center gap-4 py-4 select-none">
    <!-- 전진 거리 & 최고 기록 & 스탯 뱃지 -->
    <div class="flex items-center justify-between gap-2 w-full max-w-lg px-2">
      <GameStat label="전진 거리" testid="crossy-score" :value="`${state.score}m`"/>
      <div class="flex items-center gap-2">
        <span class="text-xs font-mono text-muted-foreground border border-border/40 px-2.5 py-1 rounded-lg bg-muted/20">
          최고 기록: <strong class="text-foreground">{{ maxScore }}m</strong>
        </span>
      </div>
    </div>

    <!-- 깔끔한 2D 플랫 스타일 길건너 캔버스 (560x560) -->
    <div
        class="relative border-2 border-border bg-slate-900 rounded-2xl overflow-hidden shadow-lg cursor-pointer focus:outline-none max-w-full"
        style="width: 560px; height: 560px;"
        tabindex="0"
        data-testid="crossy-board"
    >
      <!-- Ready 대기 오버레이 -->
      <div v-if="state.status === 'ready'" class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm p-4 text-center">
        <div class="space-y-1">
          <h3 class="text-xl font-bold text-foreground">길건너 친구들</h3>
          <p class="text-xs text-muted-foreground">방향키(↑ ↓ ← →)나 W A S D로 자동차와 기차를 피해 전진하세요</p>
        </div>
        <button
            class="rounded-xl bg-primary px-7 py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            data-testid="start-crossy-button"
            type="button"
            @click="handleStart"
        >
          🎮 게임 시작
        </button>
      </div>

      <!-- 카메라 스크롤 레인 레이어 -->
      <div
          class="absolute inset-x-0 bottom-0 flex flex-col-reverse transition-transform duration-100 ease-out"
          :style="{ transform: `translateY(${cameraY * 40}px)` }"
      >
        <div
            v-for="(lane, lIndex) in renderedLanes"
            :key="lIndex"
            :class="lane.type === 'grass'
              ? 'bg-emerald-900/60 border-b border-emerald-800/40'
              : lane.type === 'road'
              ? 'bg-zinc-800/90 border-b border-zinc-700/50'
              : 'bg-stone-900 border-y border-amber-700/60'"
            class="relative h-[40px] w-full flex items-center overflow-hidden shrink-0"
        >
          <!-- 잔디밭 레인 구분 텍스처 -->
          <template v-if="lane.type === 'grass'">
            <div class="absolute inset-0 flex items-center justify-around opacity-30 pointer-events-none text-xs">
              <span>🌱</span>
              <span>🌳</span>
              <span>🌱</span>
            </div>
          </template>

          <!-- 도로 차선 중앙 실선/점선 -->
          <div v-if="lane.type === 'road'" class="absolute inset-x-0 h-[1px] bg-zinc-600/60 pointer-events-none"/>

          <!-- 철길 궤도 선 및 접근 경고 -->
          <template v-if="lane.type === 'rail'">
            <div class="absolute inset-x-0 h-1 bg-amber-600/50 top-1.5 pointer-events-none"/>
            <div class="absolute inset-x-0 h-1 bg-amber-600/50 bottom-1.5 pointer-events-none"/>

            <div v-if="lane.railWarningMs && lane.railWarningMs > 0" class="absolute right-3 flex items-center gap-1.5 z-20 pointer-events-none">
              <span class="size-2 rounded-full bg-rose-500 animate-ping"/>
              <span class="text-[10px] font-bold text-rose-400">기차 접근 중!</span>
            </div>
          </template>

          <!-- 2D 플랫 디자인 차량 / 기차 -->
          <div
              v-for="v in lane.vehicles"
              :key="v.id"
              :style="{
                left: `${v.x}px`,
                width: `${v.width}px`,
                height: lane.type === 'rail' ? '26px' : '20px'
              }"
              :class="lane.type === 'rail'
                ? 'bg-stone-700 border border-stone-500 text-stone-200'
                : VEHICLE_STYLES[v.colorStyle || 0]"
              class="absolute z-10 rounded border flex items-center justify-between px-1.5 select-none"
          >
            <!-- 2D 라이트 헤드/테일 표현 -->
            <div v-if="lane.dir === 1" class="size-1.5 rounded-full bg-red-400" />
            <div v-else class="size-1.5 rounded-full bg-amber-300" />

            <div v-if="lane.type === 'rail'" class="text-[10px] font-mono font-bold opacity-70">
              TRAIN
            </div>
            <div v-else class="h-2 w-1/2 rounded bg-slate-900/60 border border-white/20" />

            <div v-if="lane.dir === 1" class="size-1.5 rounded-full bg-amber-300" />
            <div v-else class="size-1.5 rounded-full bg-red-400" />
          </div>
        </div>
      </div>

      <!-- 2D 플랫 병아리/닭 플레이어 -->
      <div
          :style="{
            left: `${state.chickenX * 56 + 14}px`,
            bottom: `${(state.chickenY - cameraY) * 40 + 6}px`
          }"
          class="absolute size-7 rounded-lg bg-amber-400 border border-amber-200 shadow z-20 transition-[top,left,transform] duration-100 ease-out flex items-center justify-center text-base select-none"
      >
        🐥
      </div>

      <GameResultOverlay :restart="resetGame" :show="state.status === 'over'" testid="crossy-over" title="게임 종료!" tone="lose">
        <div class="flex flex-col items-center gap-1">
          <span data-testid="final-score" class="text-base font-extrabold text-foreground">{{ state.score }}m 전진 달성</span>
          <span class="text-xs text-muted-foreground">버튼을 눌러 다시 도전해보세요</span>
        </div>
      </GameResultOverlay>
    </div>

    <!-- 깔끔한 방향 컨트롤 버튼 -->
    <div class="flex flex-col items-center gap-1 my-1">
      <button
          type="button"
          class="px-5 py-1.5 rounded-lg border border-border bg-secondary hover:bg-accent text-xs font-semibold flex items-center gap-1 cursor-pointer"
          @click="onMove('up')"
      >
        ▲ 전진 (W / ↑)
      </button>
      <div class="flex gap-2">
        <button
            type="button"
            class="px-4 py-1.5 rounded-lg border border-border bg-secondary hover:bg-accent text-xs font-semibold flex items-center gap-1 cursor-pointer"
            @click="onMove('left')"
        >
          ◀ 좌 (A / ←)
        </button>
        <button
            type="button"
            class="px-4 py-1.5 rounded-lg border border-border bg-secondary hover:bg-accent text-xs font-semibold flex items-center gap-1 cursor-pointer"
            @click="onMove('down')"
        >
          ▼ 후퇴 (S / ↓)
        </button>
        <button
            type="button"
            class="px-4 py-1.5 rounded-lg border border-border bg-secondary hover:bg-accent text-xs font-semibold flex items-center gap-1 cursor-pointer"
            @click="onMove('right')"
        >
          ▶ 우 (D / →)
        </button>
      </div>
    </div>

    <p class="text-[12px] font-medium text-muted-foreground/90 bg-muted/30 px-3.5 py-1.5 rounded-full border border-border/40 flex items-center gap-1">
      <span>💡</span> <span>방향키, WASD 키, 또는 하단 버튼을 눌러 길을 건너세요</span>
    </p>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {createCrossyState, moveChicken, startCrossyGame, tickCrossy} from '../../utils/crossyRoad'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

import {consumeGameRetry, requestGameRetry} from '../../utils/gameRetryState'

const props = defineProps<{
  submitScore?: (score: number) => void
  restart?: () => void
  onGameEnd?: () => void
}>()

const VEHICLE_STYLES = [
  'bg-rose-700 border-rose-500 text-rose-100',
  'bg-sky-700 border-sky-500 text-sky-100',
  'bg-amber-700 border-amber-500 text-amber-100',
  'bg-purple-700 border-purple-500 text-purple-100'
]

const initialStatus = consumeGameRetry('game-crossy-road') ? 'playing' : 'ready'
const state = ref(createCrossyState(initialStatus))
const maxScore = ref(0)
const {playSuccess, playFail} = useGameSound()
let intervalId: ReturnType<typeof setInterval> | null = null

const cameraY = computed(() => Math.max(0, state.value.chickenY - 2))

const renderedLanes = computed(() => {
  const maxLaneNeeded = cameraY.value + 16
  return state.value.lanes.slice(0, maxLaneNeeded)
})

function handleStart() {
  state.value = startCrossyGame(state.value)
  if (!intervalId) {
    intervalId = setInterval(step, 40)
  }
}

function onMove(dir: 'up' | 'down' | 'left' | 'right') {
  if (state.value.status !== 'playing') return
  const beforeScore = state.value.score
  state.value = moveChicken(state.value, dir)
  if (state.value.score > beforeScore) {
    if (state.value.score > maxScore.value) {
      maxScore.value = state.value.score
    }
    playSuccess()
  }
}

function resetGame() {
  requestGameRetry('game-crossy-road')
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  props.restart?.()
}

function step() {
  if (state.value.status !== 'playing') return
  const {nextState} = tickCrossy(state.value, 40)
  state.value = nextState
}

intervalId = setInterval(step, 40)

watch(() => state.value.status, status => {
  if (status === 'over') {
    if (intervalId) clearInterval(intervalId)
    playFail()
    props.submitScore?.(state.value.score)
    props.onGameEnd?.()
  }
})

function handleGlobalKey(e: KeyboardEvent) {
  const isGameKey = [
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'w', 'W', 's', 'S', 'a', 'A', 'd', 'D', ' ', 'Spacebar'
  ].includes(e.key)

  if (isGameKey) {
    e.preventDefault() // 게임 오버 등 어떤 상태에서도 브라우저 스크롤 100% 방지!
  }

  if (state.value.status === 'ready') {
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      handleStart()
    }
    return
  }

  if (state.value.status === 'playing') {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') onMove('up')
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') onMove('down')
    else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') onMove('left')
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') onMove('right')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKey)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  window.removeEventListener('keydown', handleGlobalKey)
})
</script>

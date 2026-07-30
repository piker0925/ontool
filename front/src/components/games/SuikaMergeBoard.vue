<template>
  <div class="flex flex-col items-center gap-4 py-4 select-none">
    <div class="flex items-center justify-between gap-2 w-full max-w-md px-2">
      <GameStat label="점수" testid="suika-score" :value="state.score"/>
      <!-- 다음 과일 그래픽 미리보기 -->
      <div class="flex items-center gap-2 border border-border/60 bg-muted/30 px-3 py-1.5 rounded-xl shadow-sm">
        <span class="text-xs text-muted-foreground font-mono font-bold">NEXT</span>
        <FruitGraphic :level="nextFruitDef.level" :radius="14" />
        <span class="text-xs font-bold text-foreground">{{ nextFruitDef.name }}</span>
      </div>
    </div>

    <!-- 2D Canvas 과일 합성 용기 (420x560 대형 아케이드 비율) -->
    <div
        class="relative border-4 border-amber-900 bg-background/95 rounded-b-3xl overflow-hidden shadow-2xl cursor-crosshair"
        :style="{ width: `${CONTAINER_WIDTH}px`, height: `${CONTAINER_HEIGHT}px` }"
        data-testid="suika-board"
        @mousemove="onMouseMove"
        @click="onClickDrop"
    >
      <!-- Ready 대기 오버레이 (게임 시작 버튼) -->
      <div v-if="state.status === 'ready'" class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm p-4 text-center">
        <div class="space-y-1">
          <h3 class="text-lg font-black text-amber-500">수박게임</h3>
          <p class="text-xs text-muted-foreground">마우스/터치로 위치를 맞추고 클릭해 과일을 떨어뜨리세요</p>
          <p class="text-[11px] text-muted-foreground/80">같은 과일이 만나면 더 큰 과일로 합성됩니다! (총 11단계)</p>
        </div>
        <button
            class="rounded-full bg-zone-accent px-6 py-2.5 text-xs font-extrabold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            data-testid="start-suika-button"
            type="button"
            @click.stop="handleStart"
        >
          🎮 과일 합성 시작
        </button>
      </div>

      <!-- 상단 마지노선 (DEADLINE_Y) 및 침범 딥 레드 경고 이펙트 -->
      <div
          class="absolute inset-x-0 border-b-2 border-dashed z-20 pointer-events-none flex justify-between px-3 items-center transition-colors duration-200"
          :class="state.overTimerMs > 0 ? 'border-red-500 bg-red-500/20 animate-pulse' : 'border-destructive/60'"
          :style="{ top: `${DEADLINE_Y}px` }"
      >
        <span v-if="state.overTimerMs > 0" class="text-[11px] font-black text-red-500 animate-bounce">
          ⚠️ OVERFLOW WARNING! ({{ (3.0 - state.overTimerMs / 1000).toFixed(1) }}s)
        </span>
        <span v-else class="text-[10px] font-mono font-bold text-destructive/80">LIMIT DEADLINE</span>
      </div>

      <!-- 드롭 가이드라인 & 상단 조준 과일 그래픽 (연타 쿨다운 중 무반응 보호) -->
      <div
          v-if="state.status === 'playing'"
          class="absolute top-0 bottom-0 w-[1px] bg-zone-accent/40 pointer-events-none z-10"
          :style="{ left: `${state.dropX}px` }"
      />

      <div
          v-if="state.status === 'playing'"
          :style="{
            left: `${currentFruitDef.radius}px`,
            transform: `translateX(${state.dropX - currentFruitDef.radius}px)`,
            opacity: state.dropCooldownMs > 0 ? 0.4 : 1
          }"
          class="absolute top-2 z-20 pointer-events-none transition-[left,transform] duration-75"
      >
        <FruitGraphic :level="currentFruitDef.level" :radius="currentFruitDef.radius" />
      </div>

      <!-- 100% 2D 풀 그래픽 과일 렌더링 리스트 -->
      <div
          v-for="f in state.fruits"
          :key="f.id"
          :style="{
            left: `${f.x - f.radius}px`,
            top: `${f.y - f.radius}px`,
          }"
          class="absolute transition-transform duration-75 select-none pointer-events-none z-10"
      >
        <FruitGraphic :level="f.level" :radius="f.radius" />
      </div>

      <GameResultOverlay :restart="resetGame" :show="state.status === 'over'" testid="suika-over" title="게임 오버!" tone="lose">
        <span data-testid="final-score">{{ state.score }}점 달성!</span>
      </GameResultOverlay>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {
  CONTAINER_HEIGHT,
  CONTAINER_WIDTH,
  createSuikaState,
  DEADLINE_Y,
  dropFruit,
  FRUITS,
  startSuikaGame,
  stepPhysics
} from '../../utils/suikaMerge'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'
import FruitGraphic from './FruitGraphic.vue'

const props = defineProps<{
  submitScore?: (score: number) => void
  restart?: () => void
  onGameEnd?: () => void
}>()

const {playSuccess} = useGameSound()
const state = ref(createSuikaState('ready'))
let intervalId: ReturnType<typeof setInterval> | null = null

const currentFruitDef = computed(() => FRUITS[state.value.currentLevel])
const nextFruitDef = computed(() => FRUITS[state.value.nextLevel])

function handleStart() {
  state.value = startSuikaGame(state.value)
}

function onMouseMove(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  state.value.dropX = e.clientX - rect.left
}

function onClickDrop() {
  if (state.value.status !== 'playing' || state.value.dropCooldownMs > 0) return
  state.value = dropFruit(state.value)
  playSuccess()
}

function step() {
  if (state.value.status !== 'playing') return
  state.value = stepPhysics(state.value, 60)
}

function resetGame() {
  state.value = createSuikaState()
}

function handleGlobalKey(e: KeyboardEvent) {
  if (state.value.status === 'ready') {
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      e.preventDefault()
      handleStart()
    }
    return
  }
  if (state.value.status !== 'playing') return
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    state.value.dropX = Math.max(30, state.value.dropX - 25)
    e.preventDefault()
  } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    state.value.dropX = Math.min(395, state.value.dropX + 25)
    e.preventDefault()
  } else if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    onClickDrop()
    e.preventDefault()
  }
}

onMounted(() => {
  intervalId = setInterval(step, 60)
  window.addEventListener('keydown', handleGlobalKey)
})

watch(() => state.value.status, status => {
  if (status === 'over') {
    if (intervalId) clearInterval(intervalId)
    props.submitScore?.(state.value.score)
    props.onGameEnd?.()
  }
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  window.removeEventListener('keydown', handleGlobalKey)
})
</script>

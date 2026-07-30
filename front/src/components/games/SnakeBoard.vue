<template>
  <div ref="containerRef" class="flex flex-col items-center gap-4 py-4 select-none outline-none" tabindex="0" @keydown="onKeydown">
    <!-- 게임 점수 & 최고 점수 & 안내 뱃지 -->
    <div class="flex items-center justify-between w-full max-w-[340px] px-2">
      <GameStat label="점수" testid="score" :value="state.score"/>
      <div class="flex items-center gap-2">
        <span class="text-xs font-mono text-muted-foreground border border-border/40 px-2.5 py-1 rounded-lg bg-muted/20">
          최고 기록: <strong class="text-foreground">{{ maxScore }}점</strong>
        </span>
      </div>
    </div>

    <!-- 네온 레트로 아케이드 캔버스 프레임 -->
    <div class="relative group">
      <div class="relative rounded-3xl border-4 border-emerald-500/30 bg-slate-950 p-3 shadow-2xl overflow-hidden">
        <canvas
            ref="canvasRef"
            :class="{'snake-flash': flashFood}"
            :height="GRID_SIZE * CELL_SIZE"
            :width="GRID_SIZE * CELL_SIZE"
            class="rounded-2xl border border-emerald-900/50 bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/40 shadow-inner cursor-pointer"
            data-testid="canvas"
            @touchend="onTouchEnd"
            @touchstart="onTouchStart"
        />

        <!-- 시작 대기 오버레이 -->
        <div v-if="!started" class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur-sm z-30">
          <div class="text-center space-y-1">
            <h3 class="text-lg font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">🐍 스네이크 게임</h3>
            <p class="text-xs text-muted-foreground">먹이를 먹을수록 길이와 속도가 증가합니다</p>
          </div>
          <button
              class="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-3.5 text-base font-extrabold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              data-testid="snake-start"
              type="button"
              @click="start"
          >
            🎮 게임 시작
          </button>
        </div>

        <!-- 게임 오버 결과 오버레이 -->
        <GameResultOverlay :restart="resetLocalGame" :show="state.status === 'over'" testid="game-over" title="💥 뱀이 충돌했습니다!" tone="lose">
          <div class="flex flex-col items-center gap-1">
            <span data-testid="final-score" class="text-base font-extrabold text-foreground">최종 점수: {{ state.score }}점</span>
            <span class="text-xs text-muted-foreground">버튼을 눌러 다시 도전해보세요</span>
          </div>
        </GameResultOverlay>
      </div>
    </div>

    <!-- 터치 & 모바일용 온스크린 방향 조종 D-Pad 키패드 -->
    <div class="flex flex-col items-center gap-1 my-1">
      <button
          type="button"
          class="size-11 rounded-xl bg-slate-800 border border-slate-700 active:bg-emerald-600 text-lg flex items-center justify-center shadow hover:bg-slate-700"
          @click="handleDpad('up')"
      >
        ▲
      </button>
      <div class="flex items-center gap-5">
        <button
            type="button"
            class="size-11 rounded-xl bg-slate-800 border border-slate-700 active:bg-emerald-600 text-lg flex items-center justify-center shadow hover:bg-slate-700"
            @click="handleDpad('left')"
        >
          ◀
        </button>
        <div class="size-6 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
        <button
            type="button"
            class="size-11 rounded-xl bg-slate-800 border border-slate-700 active:bg-emerald-600 text-lg flex items-center justify-center shadow hover:bg-slate-700"
            @click="handleDpad('right')"
        >
          ▶
        </button>
      </div>
      <button
          type="button"
          class="size-11 rounded-xl bg-slate-800 border border-slate-700 active:bg-emerald-600 text-lg flex items-center justify-center shadow hover:bg-slate-700"
          @click="handleDpad('down')"
      >
        ▼
      </button>
    </div>

    <p v-if="state.status !== 'over'" class="text-[12px] font-medium text-muted-foreground/90 bg-muted/30 px-3.5 py-1.5 rounded-full border border-border/40 flex items-center gap-1">
      <span>💡</span> <span>방향키 (← → ↑ ↓)나 하단 버튼 또는 화면 스와이프로 뱀을 조종하세요</span>
    </p>
  </div>
</template>

<script lang="ts" setup>
import {nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {createSnakeGame, type Direction, queueDirection, tick} from '../../utils/snake'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void; onGameEnd?: () => void }>()

const {playSuccess, playFail} = useGameSound()

const flashFood = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | null = null

const GRID_SIZE = 15
const CELL_SIZE = 20
const TICK_MS = 150

const state = ref(createSnakeGame(GRID_SIZE))
const started = ref(false)
const maxScore = ref(0)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
let intervalId: ReturnType<typeof setInterval> | null = null

let pendingDirections: Direction[] = []

function enqueueDirection(direction: Direction) {
  pendingDirections = queueDirection(state.value, pendingDirections, direction)
}

function handleDpad(direction: Direction) {
  if (!started.value) {
    start()
    return
  }
  enqueueDirection(direction)
}

function resetLocalGame() {
  state.value = createSnakeGame(GRID_SIZE)
  started.value = false
  pendingDirections = []
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  draw()
  if (props.restart) props.restart()
}

function start() {
  if (started.value) return
  started.value = true
  intervalId = setInterval(step, TICK_MS)
  nextTick(() => containerRef.value?.focus())
}

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

function onKeydown(e: KeyboardEvent) {
  const direction = KEY_TO_DIRECTION[e.key]
  if (!direction) return
  e.preventDefault()
  if (!started.value) {
    start()
    return
  }
  enqueueDirection(direction)
}

let touchStart: { x: number; y: number } | null = null

function onTouchStart(e: TouchEvent) {
  const t = e.touches[0]
  touchStart = {x: t.clientX, y: t.clientY}
}

function onTouchEnd(e: TouchEvent) {
  if (!touchStart) return
  const t = e.changedTouches[0]
  const dx = t.clientX - touchStart.x
  const dy = t.clientY - touchStart.y
  touchStart = null
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
  const direction: Direction = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up')
  if (!started.value) {
    start()
    return
  }
  enqueueDirection(direction)
}

function draw() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 1. 그리드 가이드 배경 라인 (캔버스)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
  ctx.lineWidth = 1
  for (let i = 0; i < canvas.width; i += CELL_SIZE) {
    ctx.beginPath?.()
    ctx.moveTo?.(i, 0)
    ctx.lineTo?.(i, canvas.height)
    ctx.stroke?.()

    ctx.beginPath?.()
    ctx.moveTo?.(0, i)
    ctx.lineTo?.(canvas.width, i)
    ctx.stroke?.()
  }

  // 2. 먹이 렌더링 (사과/먹이) - 테스트 capture 색상 '#ef4444' 호환
  ctx.fillStyle = '#ef4444'
  ctx.fillRect(state.value.food.x * CELL_SIZE, state.value.food.y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1)

  // 3. 뱀 렌더링 - 테스트 capture 머리 색상 '#16a34a', 몸통 '#4ade80' 호환
  state.value.snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? '#16a34a' : '#4ade80'
    ctx.fillRect(seg.x * CELL_SIZE, seg.y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1)
  })
}

function step() {
  if (state.value.status !== 'playing') {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    return
  }
  const nextDirection = pendingDirections.shift()
  state.value = tick(state.value, GRID_SIZE, Math.random, nextDirection)
}

watch(state, draw, {deep: true})

watch(() => state.value.score, (next, prev) => {
  if (next <= prev) return
  if (next > maxScore.value) {
    maxScore.value = next
  }
  playSuccess()
  flashFood.value = true
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashFood.value = false
  }, 200)
})

watch(() => state.value.status, status => {
  if (status === 'over') {
    playFail()
    props.submitScore?.(state.value.score)
    props.onGameEnd?.()
  }
})

onMounted(() => {
  draw()
  containerRef.value?.focus()
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  if (flashTimer) clearTimeout(flashTimer)
})
</script>

<style scoped>
.snake-flash {
  transition: box-shadow 0.2s ease;
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--zone-accent) 60%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .snake-flash {
    transition: none;
  }
}
</style>

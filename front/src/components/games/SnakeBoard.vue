<template>
  <div ref="containerRef" class="flex flex-col items-center gap-4 py-6" tabindex="0" @keydown="onKeydown">
    <p class="font-mono text-sm text-muted-foreground">점수 <span class="text-foreground" data-testid="score">{{ state.score }}</span></p>

    <div class="relative">
      <canvas
          ref="canvasRef"
          :height="GRID_SIZE * CELL_SIZE"
          :width="GRID_SIZE * CELL_SIZE"
          class="rounded-xl border border-border bg-muted/40"
          data-testid="canvas"
          @touchend="onTouchEnd"
          @touchstart="onTouchStart"
      />
      <div v-if="!started" class="absolute inset-0 flex items-center justify-center">
        <button
            class="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            data-testid="snake-start"
            type="button"
            @click="start"
        >시작
        </button>
      </div>
    </div>

    <p v-if="state.status === 'over'" class="text-sm font-medium text-destructive" data-testid="game-over">게임 오버!</p>
    <p v-else class="text-[11px] text-muted-foreground/70">방향키 또는 스와이프로 이동하세요</p>
  </div>
</template>

<script lang="ts" setup>
import {nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {changeDirection, createSnakeGame, type Direction, tick} from '../../utils/snake'

const GRID_SIZE = 15
const CELL_SIZE = 20
const TICK_MS = 150

const state = ref(createSnakeGame(GRID_SIZE))
const started = ref(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
let intervalId: ReturnType<typeof setInterval> | null = null

// 시작 버튼(컨테이너 안쪽 자식)이 사라지면 포커스가 body로 밀려나 방향키 입력이 이 컨테이너의
// keydown 리스너에 더 이상 닿지 않는다 — 시작 직후 컨테이너로 포커스를 되돌려준다.
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
  state.value = changeDirection(state.value, direction)
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
  state.value = changeDirection(state.value, direction)
}

function draw() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#ef4444'
  ctx.fillRect(state.value.food.x * CELL_SIZE, state.value.food.y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1)

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
  state.value = tick(state.value, GRID_SIZE)
}

watch(state, draw, {deep: true})

onMounted(() => {
  draw()
  containerRef.value?.focus()
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

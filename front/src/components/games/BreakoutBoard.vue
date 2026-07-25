<template>
  <div
      ref="containerRef"
      class="flex flex-col items-center gap-4 py-6"
      tabindex="0"
      @keydown.left="onKeyMove(-1)"
      @keydown.right="onKeyMove(1)"
  >
    <GameStat label="점수" testid="score" :value="state.score"/>

    <div class="relative">
      <canvas
          ref="canvasRef"
          :height="BOARD_HEIGHT"
          :width="BOARD_WIDTH"
          class="touch-none rounded-xl border border-border bg-muted/40"
          data-testid="canvas"
          @mousemove="onPointerMove"
          @touchmove.prevent="onPointerMove"
      />
      <GameResultOverlay :restart="props.restart" :show="state.status !== 'playing'" testid="game-over" :title="resultTitle" :tone="resultTone">
        <span data-testid="final-score">점수 {{ state.score }}</span>
      </GameResultOverlay>
    </div>

    <p v-if="state.status === 'playing'" class="text-[11px] text-muted-foreground">마우스/터치로 움직이거나 방향키로 패들을 조작하세요</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {createBreakoutState, movePaddle, tick} from '../../utils/breakout'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const BOARD_WIDTH = 320
const BOARD_HEIGHT = 400
const TICK_MS = 16
const PADDLE_KEY_STEP = 16

const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void }>()

const state = ref(createBreakoutState(BOARD_WIDTH, BOARD_HEIGHT))
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
let intervalId: ReturnType<typeof setInterval> | null = null

const {playClick, playSuccess, playFail} = useGameSound()

function onKeyMove(dir: -1 | 1) {
  state.value = movePaddle(state.value, state.value.paddleX + dir * PADDLE_KEY_STEP)
}

function onPointerMove(e: MouseEvent | TouchEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
  if (clientX === undefined) return
  const x = clientX - rect.left - state.value.paddleWidth / 2
  state.value = movePaddle(state.value, x)
}

function step() {
  if (state.value.status !== 'playing') {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    return
  }
  const before = state.value.score
  state.value = tick(state.value, TICK_MS)
  if (state.value.score > before) playClick()
}

function draw() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#8b5cf6'
  state.value.bricks.forEach((row, r) => {
    const brickWidth = BOARD_WIDTH / row.length
    row.forEach((alive, c) => {
      if (!alive) return
      ctx.fillRect(c * brickWidth + 1, 30 + r * 16 + 1, brickWidth - 2, 14)
    })
  })

  ctx.fillStyle = '#7c3aed'
  ctx.fillRect(state.value.paddleX, BOARD_HEIGHT - 20, state.value.paddleWidth, 8)

  ctx.beginPath()
  ctx.fillStyle = '#f43f5e'
  ctx.arc(state.value.ball.x, state.value.ball.y, 6, 0, Math.PI * 2)
  ctx.fill()
}

const resultTitle = computed(() => state.value.status === 'won' ? '클리어!' : '게임 오버')
const resultTone = computed<'win' | 'lose'>(() => state.value.status === 'won' ? 'win' : 'lose')

watch(state, draw, {deep: true})

watch(() => state.value.status, status => {
  if (status !== 'playing') {
    if (status === 'won') playSuccess()
    else playFail()
    props.submitScore?.(state.value.score)
  }
})

onMounted(() => {
  draw()
  containerRef.value?.focus()
  intervalId = setInterval(step, TICK_MS)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

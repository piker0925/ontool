<template>
  <div
      class="flex flex-col items-center gap-4 py-6"
      tabindex="0"
      @keydown.space.prevent="onJump"
      @keydown.up.prevent="onJump"
  >
    <GameStat label="점수" testid="score" :value="state.score"/>

    <div class="relative">
      <canvas
          ref="canvasRef"
          :height="BOARD_HEIGHT"
          :width="BOARD_WIDTH"
          class="rounded-xl border border-border bg-sky-100 dark:bg-slate-800"
          data-testid="canvas"
          @click="onJump"
          @touchstart.prevent="onJump"
      />
      <GameResultOverlay :restart="props.restart" :show="state.status === 'over'" testid="game-over" title="충돌했습니다!" tone="lose">
        <span data-testid="final-score">점수 {{ state.score }}</span>
      </GameResultOverlay>
    </div>

    <p v-if="state.status !== 'over'" class="text-[11px] text-muted-foreground">클릭/탭, 스페이스바 또는 위쪽 화살표로 점프하세요</p>
  </div>
</template>

<script lang="ts" setup>
import {onMounted, onUnmounted, ref, watch} from 'vue'
import {createObstacleDodgeState, jump, tick} from '../../utils/obstacleDodge'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const BOARD_WIDTH = 320
const BOARD_HEIGHT = 480
const TICK_MS = 16
const BIRD_X = 60

const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void }>()

const state = ref(createObstacleDodgeState(BOARD_WIDTH, BOARD_HEIGHT))
const canvasRef = ref<HTMLCanvasElement | null>(null)
let intervalId: ReturnType<typeof setInterval> | null = null

const {playClick, playFail} = useGameSound()

function onJump() {
  if (state.value.status !== 'playing') return
  state.value = jump(state.value)
  playClick()
}

function step() {
  if (state.value.status !== 'playing') {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    return
  }
  state.value = tick(state.value, TICK_MS)
}

function draw() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#16a34a'
  const gapHeight = 110
  const pipeWidth = 40
  state.value.pipes.forEach(pipe => {
    const gapTop = pipe.gapY - gapHeight / 2
    const gapBottom = pipe.gapY + gapHeight / 2
    ctx.fillRect(pipe.x, 0, pipeWidth, gapTop)
    ctx.fillRect(pipe.x, gapBottom, pipeWidth, canvas.height - gapBottom)
  })

  ctx.beginPath()
  ctx.fillStyle = '#f59e0b'
  ctx.arc(BIRD_X, state.value.birdY, 10, 0, Math.PI * 2)
  ctx.fill()
}

watch(state, draw, {deep: true})

watch(() => state.value.status, status => {
  if (status === 'over') {
    playFail()
    props.submitScore?.(state.value.score)
  }
})

onMounted(() => {
  draw()
  intervalId = setInterval(step, TICK_MS)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

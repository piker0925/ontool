<template>
  <div class="flex flex-col items-center gap-4 py-6" tabindex="0" @keydown.space.prevent="onPlace">
    <GameStat label="높이" testid="score" :value="state.score"/>

    <div class="relative">
      <canvas
          ref="canvasRef"
          :height="CANVAS_HEIGHT"
          :width="BOARD_WIDTH"
          class="rounded-xl border border-border bg-muted/40"
          data-testid="canvas"
          @click="onPlace"
          @touchstart.prevent="onPlace"
      />
      <GameResultOverlay :restart="props.restart" :show="state.status === 'over'" testid="game-over" title="무너졌습니다!" tone="lose">
        <span data-testid="final-height">높이 {{ state.score }}</span>
      </GameResultOverlay>
    </div>

    <p v-if="state.status !== 'over'" class="text-[11px] text-muted-foreground">클릭/탭 또는 스페이스바로 블록을 쌓으세요</p>
  </div>
</template>

<script lang="ts" setup>
import {onMounted, onUnmounted, ref, watch} from 'vue'
import {createTowerStackState, placeBlock, tick} from '../../utils/towerStack'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const BOARD_WIDTH = 300
const CANVAS_HEIGHT = 400
const BLOCK_HEIGHT = 26
const TOP_ROW_Y = 40
const TICK_MS = 16

const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void }>()

const state = ref(createTowerStackState(BOARD_WIDTH))
const canvasRef = ref<HTMLCanvasElement | null>(null)
let intervalId: ReturnType<typeof setInterval> | null = null

const {playClick, playFail} = useGameSound()

function onPlace() {
  if (state.value.status !== 'playing') return
  const before = state.value.score
  state.value = placeBlock(state.value)
  if (state.value.score > before) playClick()
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

  // 스택 맨 위(가장 최근 블록)부터 아래로 그린다 — 현재 움직이는 블록은 항상 고정된
  // TOP_ROW_Y에 그려 카메라 스크롤 없이도 "쌓는 감각"을 준다.
  const stack = state.value.stack
  stack.forEach((block, i) => {
    const distanceFromTop = stack.length - 1 - i
    const y = TOP_ROW_Y + BLOCK_HEIGHT * (1 + distanceFromTop)
    if (y > canvas.height) return
    ctx.fillStyle = i === stack.length - 1 ? '#8b5cf6' : '#a78bfa'
    ctx.fillRect(block.x, y, block.width, BLOCK_HEIGHT - 2)
  })

  if (state.value.status === 'playing') {
    ctx.fillStyle = '#7c3aed'
    ctx.fillRect(state.value.current.x, TOP_ROW_Y, state.value.current.width, BLOCK_HEIGHT - 2)
  }
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

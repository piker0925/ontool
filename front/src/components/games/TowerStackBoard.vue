<template>
  <div class="flex flex-col items-center gap-4 py-4 select-none outline-none" tabindex="0" @keydown.space.prevent="onPlace">
    <!-- 게임 통계 & 퍼펙트 콤보 뱃지 -->
    <div class="flex items-center justify-between w-full max-w-[340px] px-3">
      <div class="flex items-center gap-2">
        <GameStat label="현재 높이" testid="score" :value="state.score"/>
        <span v-if="comboCount > 1" class="text-xs font-black text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40 animate-pulse">
          🔥 PERFECT x{{ comboCount }}
        </span>
      </div>
      <div class="text-xs font-mono text-muted-foreground border border-border/40 px-2.5 py-1 rounded-lg bg-muted/20">
        최고 기록: <span class="font-bold text-foreground">{{ maxScore }}층</span>
      </div>
    </div>

    <!-- 캔버스 컨테이너 (고품격 시각 효과) -->
    <div class="relative group">
      <canvas
          ref="canvasRef"
          :height="CANVAS_HEIGHT"
          :width="BOARD_WIDTH"
          class="rounded-2xl border-2 border-border/80 bg-slate-950 shadow-2xl transition-[border-color,box-shadow] duration-200 cursor-pointer"
          data-testid="canvas"
          @click="onPlace"
          @touchstart.prevent="onPlace"
      />
      <GameResultOverlay :restart="resetLocalGame" :show="state.status === 'over'" testid="game-over" title="🏗️ 타워가 무너졌습니다!" tone="lose">
        <div class="flex flex-col gap-1 items-center">
          <span data-testid="final-height" class="text-base font-extrabold text-foreground">최종 빌딩 높이: {{ state.score }}층</span>
          <span class="text-xs text-muted-foreground">버튼을 눌러 다시 타워를 올려보세요!</span>
        </div>
      </GameResultOverlay>
    </div>

    <p v-if="state.status !== 'over'" class="text-[12px] font-medium text-muted-foreground/90 flex items-center gap-1.5 bg-muted/30 px-3.5 py-1.5 rounded-full border border-border/40">
      <span>💡</span> <span>화면 클릭 / 탭 / <kbd class="px-1.5 py-0.5 text-[10px] bg-background border border-border rounded font-mono font-bold">Space</kbd> 키를 눌러 블록을 쌓으세요</span>
    </p>
  </div>
</template>

<script lang="ts" setup>
import {onMounted, onUnmounted, ref, watch} from 'vue'
import {createTowerStackState, placeBlock, tick} from '../../utils/towerStack'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const BOARD_WIDTH = 300
const CANVAS_HEIGHT = 440
const BLOCK_HEIGHT = 28
const TOP_ROW_Y = 60
const TICK_MS = 16

const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void; onGameEnd?: () => void }>()

const state = ref(createTowerStackState(BOARD_WIDTH))
const canvasRef = ref<HTMLCanvasElement | null>(null)
const comboCount = ref(0)
const maxScore = ref(0)
let animationFrameId: number | null = null

const {playClick, playSuccess, playFail} = useGameSound()

function resetLocalGame() {
  state.value = createTowerStackState(BOARD_WIDTH)
  comboCount.value = 0
  if (props.restart) props.restart()
}

function onPlace() {
  if (state.value.status !== 'playing') return
  const beforeScore = state.value.score
  const prevTop = state.value.stack[state.value.stack.length - 1]
  const currentX = state.value.current.x

  state.value = placeBlock(state.value)

  if (state.value.score > beforeScore) {
    if (Math.abs(prevTop.x - currentX) <= 3) {
      comboCount.value++
      playSuccess()
    } else {
      comboCount.value = 0
      playClick()
    }
    if (state.value.score > maxScore.value) {
      maxScore.value = state.value.score
    }
  }
}

function getBlockColor(index: number): { fill: string; highlight: string; shadow: string } {
  // 층수에 따라 무지개 HSL 그라디언트 전환
  const hue = (index * 14 + 200) % 360
  return {
    fill: `hsl(${hue}, 85%, 55%)`,
    highlight: `hsl(${hue}, 90%, 75%)`,
    shadow: `hsl(${hue}, 80%, 35%)`
  }
}

function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, index: number, isCurrent = false) {
  const { fill, highlight, shadow } = getBlockColor(index)

  // 1. 블록 메인 바디
  ctx.fillStyle = fill
  ctx.beginPath?.()
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, 6)
  } else {
    ctx.fillRect(x, y, width, height)
  }
  ctx.fill?.()

  // 2. 상단 3D 하이라이트 베벨
  ctx.fillStyle = highlight
  ctx.beginPath?.()
  if (ctx.roundRect) {
    ctx.roundRect(x + 2, y + 2, width - 4, Math.max(3, height * 0.25), 3)
  } else {
    ctx.fillRect(x + 2, y + 2, width - 4, Math.max(3, height * 0.25))
  }
  ctx.fill?.()

  // 3. 하단 입체 그림자
  ctx.fillStyle = shadow
  ctx.beginPath?.()
  if (ctx.roundRect) {
    ctx.roundRect(x + 2, y + height - 5, width - 4, 3, 2)
  } else {
    ctx.fillRect(x + 2, y + height - 5, width - 4, 3)
  }
  ctx.fill?.()

  // 4. 네온 테두리
  ctx.strokeStyle = isCurrent ? '#ffffff' : 'rgba(255, 255, 255, 0.25)'
  ctx.lineWidth = isCurrent ? 2 : 1
  ctx.beginPath?.()
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, 6)
  } else {
    ctx.rect?.(x, y, width, height)
  }
  ctx.stroke?.()
}

let intervalId: ReturnType<typeof setInterval> | null = null

function step() {
  if (state.value.status !== 'playing') return
  state.value = tick(state.value, TICK_MS)
}

function render() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  // 1. 모던 배경 그라디언트 및 그리드 레이어
  if (ctx.createLinearGradient) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    bgGrad.addColorStop(0, '#090d16')
    bgGrad.addColorStop(1, '#111827')
    ctx.fillStyle = bgGrad
  } else {
    ctx.fillStyle = '#090d16'
  }
  ctx.fillRect(0, 0, BOARD_WIDTH, CANVAS_HEIGHT)

  // 격자 가이드 라인
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
  ctx.lineWidth = 1
  for (let i = 0; i < BOARD_WIDTH; i += 20) {
    ctx.beginPath?.()
    ctx.moveTo?.(i, 0)
    ctx.lineTo?.(i, CANVAS_HEIGHT)
    ctx.stroke?.()
  }

  // 2. 스택 블록 렌더링
  const stack = state.value.stack
  stack.forEach((block, i) => {
    const distanceFromTop = stack.length - 1 - i
    const y = TOP_ROW_Y + BLOCK_HEIGHT * (1 + distanceFromTop)
    if (y > CANVAS_HEIGHT) return
    drawBlock(ctx, block.x, y, block.width, BLOCK_HEIGHT - 3, i)
  })

  // 3. 현재 좌우로 이동하는 조종 블록
  if (state.value.status === 'playing') {
    drawBlock(ctx, state.value.current.x, TOP_ROW_Y, state.value.current.width, BLOCK_HEIGHT - 3, stack.length, true)
  }

  animationFrameId = requestAnimationFrame(render)
}

watch(() => state.value.status, status => {
  if (status === 'over') {
    playFail()
    props.submitScore?.(state.value.score)
    props.onGameEnd?.()
  }
})

onMounted(() => {
  render()
  intervalId = setInterval(step, TICK_MS)
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (intervalId) clearInterval(intervalId)
})
</script>

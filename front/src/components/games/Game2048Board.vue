<template>
  <div class="flex flex-col items-center gap-4 py-6" tabindex="0" @keydown="onKeydown" @touchend="onTouchEnd" @touchstart="onTouchStart">
    <p class="font-mono text-sm text-muted-foreground">점수 <span class="text-foreground" data-testid="score">{{ score }}</span></p>

    <div class="grid grid-cols-4 gap-2 rounded-xl bg-muted/60 p-2" data-testid="board">
      <template v-for="(row, r) in board" :key="r">
        <div
            v-for="(cell, c) in row"
            :key="c"
            :class="tileClass(cell)"
            class="flex size-16 items-center justify-center rounded-lg text-lg font-bold transition-colors"
        >
          {{ cell || '' }}
        </div>
      </template>
    </div>

    <p v-if="gameOver" class="text-sm font-medium text-destructive" data-testid="game-over">게임 오버!</p>
    <p v-else class="text-[11px] text-muted-foreground">방향키 또는 스와이프로 이동하세요</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue'
import {addRandomTile, type Board, createEmptyBoard, type Direction, isGameOver, move} from '../../utils/game2048'

const board = ref<Board>(createEmptyBoard(4))
const score = ref(0)
const gameOver = computed(() => isGameOver(board.value))

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

// 키보드·터치 스와이프 공통 이동 처리 — 두 입력 방식이 같은 로직을 타도록 한곳에 모은다.
function applyDirection(direction: Direction) {
  if (gameOver.value) return
  const result = move(board.value, direction)
  if (!result.moved) return
  score.value += result.scoreGained
  board.value = addRandomTile(result.board)
}

function onKeydown(e: KeyboardEvent) {
  const direction = KEY_TO_DIRECTION[e.key]
  if (!direction || gameOver.value) return
  e.preventDefault()
  applyDirection(direction)
}

// 모바일 스와이프 입력 — SnakeBoard.vue의 스와이프 판정 로직(20px 임계값, 축별 절댓값 비교)을 그대로 이식.
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
  applyDirection(direction)
}

function tileClass(value: number): string {
  if (value === 0) return 'bg-foreground/10'
  const palette: Record<number, string> = {
    2: 'bg-amber-100 text-amber-900',
    4: 'bg-amber-200 text-amber-900',
    8: 'bg-orange-300 text-white',
    16: 'bg-orange-400 text-white',
    32: 'bg-orange-500 text-white',
    64: 'bg-orange-600 text-white',
    128: 'bg-yellow-400 text-white',
    256: 'bg-yellow-500 text-white',
    512: 'bg-yellow-600 text-white',
    1024: 'bg-red-500 text-white',
    2048: 'bg-red-600 text-white',
  }
  return palette[value] ?? 'bg-red-700 text-white'
}

onMounted(() => {
  board.value = addRandomTile(addRandomTile(createEmptyBoard(4)))
})
</script>

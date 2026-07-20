<template>
  <div class="flex flex-col items-center gap-4 py-6" tabindex="0" @keydown="onKeydown">
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
    <p v-else class="text-[11px] text-muted-foreground/70">방향키를 눌러 시작하세요</p>
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

function onKeydown(e: KeyboardEvent) {
  const direction = KEY_TO_DIRECTION[e.key]
  if (!direction || gameOver.value) return
  e.preventDefault()
  const result = move(board.value, direction)
  if (!result.moved) return
  score.value += result.scoreGained
  board.value = addRandomTile(result.board)
}

function tileClass(value: number): string {
  if (value === 0) return 'bg-transparent'
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

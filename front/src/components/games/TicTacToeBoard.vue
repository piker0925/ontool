<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <p class="text-sm font-medium" :class="statusClass" data-testid="status">{{ statusText }}</p>

    <div class="grid grid-cols-3 gap-2" data-testid="board">
      <button
          v-for="(cell, i) in board"
          :key="i"
          :class="cell ? 'bg-card border-border' : 'bg-secondary hover:bg-accent border-transparent'"
          :disabled="!!cell || !!winner || draw || thinking"
          class="flex size-16 items-center justify-center rounded-lg border text-2xl font-bold transition-colors"
          type="button"
          @click="onCellClick(i)"
      >{{ cell }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onUnmounted, ref} from 'vue'
import {type Board, checkWinner, computerMove, isDraw} from '../../utils/tictactoe'

const HUMAN = 'X'
const COMPUTER = 'O'

const board = ref<Board>(Array(9).fill(null))
const thinking = ref(false)
let computerTimer: ReturnType<typeof setTimeout> | null = null

const winner = computed(() => checkWinner(board.value))
const draw = computed(() => isDraw(board.value))

const statusText = computed(() => {
  if (winner.value === HUMAN) return '승리했습니다!'
  if (winner.value === COMPUTER) return '패배했습니다'
  if (draw.value) return '무승부입니다'
  return thinking.value ? '컴퓨터가 두는 중...' : '당신 차례입니다 (X)'
})

const statusClass = computed(() => {
  if (winner.value === HUMAN) return 'text-zone-accent'
  if (winner.value === COMPUTER) return 'text-destructive'
  return 'text-muted-foreground'
})

function onCellClick(i: number) {
  if (board.value[i] || winner.value || draw.value || thinking.value) return
  board.value = board.value.map((c, idx) => idx === i ? HUMAN : c)
  if (checkWinner(board.value) || isDraw(board.value)) return

  thinking.value = true
  computerTimer = setTimeout(() => {
    const move = computerMove(board.value, COMPUTER, HUMAN)
    board.value = board.value.map((c, idx) => idx === move ? COMPUTER : c)
    thinking.value = false
  }, 400)
}

onUnmounted(() => {
  if (computerTimer) clearTimeout(computerTimer)
})
</script>

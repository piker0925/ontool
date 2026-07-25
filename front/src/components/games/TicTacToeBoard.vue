<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <GameStat v-if="!winner && !draw" testid="status" :text="statusText" tone="neutral"/>

    <div class="relative">
      <div class="grid grid-cols-3 gap-2" data-testid="board">
        <button
            v-for="(cell, i) in board"
            :key="`${i}-${cell ?? 'empty'}`"
            :class="cell ? 'bg-card border-border mark-pop' : 'bg-secondary hover:bg-accent border-transparent'"
            :disabled="!!cell || !!winner || draw || thinking"
            class="flex size-16 items-center justify-center rounded-lg border text-2xl font-bold transition-colors"
            type="button"
            @click="onCellClick(i)"
        >{{ cell }}
        </button>
      </div>

      <GameResultOverlay :show="!!winner || draw" :title="statusText" :tone="resultTone" testid="game-result-overlay"/>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onUnmounted, ref, watch} from 'vue'
import {type Board, checkWinner, computerMove, isDraw} from '../../utils/tictactoe'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const HUMAN = 'X'
const COMPUTER = 'O'

const board = ref<Board>(Array(9).fill(null))
const thinking = ref(false)
let computerTimer: ReturnType<typeof setTimeout> | null = null

const {playClick, playSuccess, playFail} = useGameSound()

const winner = computed(() => checkWinner(board.value))
const draw = computed(() => isDraw(board.value))

const statusText = computed(() => {
  if (winner.value === HUMAN) return '승리했습니다!'
  if (winner.value === COMPUTER) return '패배했습니다'
  if (draw.value) return '무승부입니다'
  return thinking.value ? '컴퓨터가 두는 중…' : '당신 차례입니다 (X)'
})

const resultTone = computed<'win' | 'lose' | 'neutral'>(() => {
  if (winner.value === HUMAN) return 'win'
  if (winner.value === COMPUTER) return 'lose'
  return 'neutral'
})

function onCellClick(i: number) {
  if (board.value[i] || winner.value || draw.value || thinking.value) return
  board.value = board.value.map((c, idx) => idx === i ? HUMAN : c)
  // 이 수로 곧바로 승부가 나는 경우, watch(winner)가 승리/패배음을 따로 울리므로
  // 클릭음까지 같이 재생해 소리가 겹치지 않도록 건너뛴다.
  if (checkWinner(board.value) || isDraw(board.value)) return
  playClick()

  thinking.value = true
  computerTimer = setTimeout(() => {
    const move = computerMove(board.value, COMPUTER, HUMAN)
    board.value = board.value.map((c, idx) => idx === move ? COMPUTER : c)
    thinking.value = false
  }, 400)
}

watch(winner, next => {
  if (next === HUMAN) playSuccess()
  else if (next === COMPUTER) playFail()
})

onUnmounted(() => {
  if (computerTimer) clearTimeout(computerTimer)
})
</script>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .mark-pop {
    animation: mark-pop 0.18s ease-out both;
  }

  @keyframes mark-pop {
    from {
      transform: scale(0.5);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
}
</style>

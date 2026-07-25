<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <GameStat v-if="!winner && !draw" testid="status" :text="statusText" tone="neutral"/>
    <!-- 053: 승패만 있는 게임이라 "내가 둔 수"를 승패·무승부와 무관하게 항상 보여준다 —
         지뢰찾기 경과시간·카드짝맞추기 시도횟수와 동일하게 결과와 상관없이 상시 노출한다. -->
    <GameStat label="내가 둔 수" testid="move-count" :value="moveCount"/>

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

      <GameResultOverlay :show="!!winner || draw" :title="statusText" :tone="resultTone" testid="game-result-overlay">
        <span v-if="winner === HUMAN" data-testid="win-moves">{{ moveCount }}수 만에 승리했습니다</span>
      </GameResultOverlay>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onUnmounted, ref, watch} from 'vue'
import {type Board, checkWinner, computerMove, isDraw} from '../../utils/tictactoe'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const props = defineProps<{ submitScore?: (score: number) => void }>()

const HUMAN = 'X'
const COMPUTER = 'O'

const board = ref<Board>(Array(9).fill(null))
const thinking = ref(false)
// 053: 컴퓨터를 상대로 한 승패 자체는 "얼마나 잘했는지"를 못 재므로(이길 수 있으면 다 같은 승리),
// 대신 "승리까지 둔 사람 수(적을수록 좋음)"를 점수로 쓴다 — 빠른 승리일수록 상대의 실수를 더 적게
// 이용했다는 뜻이라 나름의 실력 신호가 된다.
const moveCount = ref(0)
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
  moveCount.value++
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

// 053: 패배·무승부는 제출하지 않는다(순위표에 의미 있는 신호가 아니므로) — 승리만 제출.
watch(winner, next => {
  if (next === HUMAN) {
    playSuccess()
    props.submitScore?.(moveCount.value)
  } else if (next === COMPUTER) {
    playFail()
  }
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

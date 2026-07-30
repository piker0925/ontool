<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <!-- 난이도 선택기 (초급 / 중급 / 상급) -->
    <div class="flex items-center gap-2 border border-border/60 bg-muted/30 p-1.5 rounded-xl">
      <button
          v-for="d in DIFFICULTIES"
          :key="d.id"
          :class="difficulty.id === d.id ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          class="px-3 py-1 rounded-lg text-xs transition-colors"
          type="button"
          @click="selectDifficulty(d)"
      >
        {{ d.label }} ({{ d.rows }}×{{ d.cols }})
      </button>
    </div>

    <div class="flex items-center gap-4">
      <GameStat label="남은 지뢰" testid="remaining-mines" :value="remainingMines"/>
      <GameStat label="경과 시간" testid="elapsed" :value="`${elapsedSeconds}초`"/>
    </div>

    <div class="flex items-center gap-2">
      <button
          :class="flagMode ? 'bg-destructive text-destructive-foreground font-bold shadow-md' : 'bg-muted border border-border text-muted-foreground'"
          class="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
          type="button"
          @click="flagMode = !flagMode"
      >
        🚩 깃발모드 {{ flagMode ? 'ON' : 'OFF' }}
      </button>
      <span class="text-[11px] text-muted-foreground">터치 롱프레스 또는 깃발모드 토글</span>
    </div>

    <div class="relative overflow-x-auto max-w-full p-2">
      <div
          class="grid gap-1 rounded-xl bg-muted/60 p-2"
          :style="{gridTemplateColumns: `repeat(${difficulty.cols}, minmax(0, 1fr))`}"
          data-testid="board"
      >
        <template v-for="(row, r) in state.grid" :key="r">
          <button
              v-for="(cell, c) in row"
              :key="`${r}-${c}-${cell.revealed}-${cell.flagged}`"
              :class="cellClass(cell)"
              class="flex size-7 items-center justify-center rounded text-[12px] font-bold transition-colors"
              type="button"
              @click="onCellAction(r, c)"
              @click.right.prevent="onFlag(r, c)"
              @contextmenu.prevent
              @touchcancel="onCellTouchEnd"
              @touchend="onCellTouchEnd"
              @touchmove="onCellTouchMove"
              @touchstart="onCellTouchStart(r, c, $event)"
          >
            <template v-if="cell.revealed">{{ cell.hasMine ? '💣' : (cell.adjacentCount || '') }}</template>
            <template v-else-if="cell.flagged">🚩</template>
          </button>
        </template>
      </div>

      <GameResultOverlay :restart="resetGame" :show="state.status !== 'playing'" :title="statusText" :tone="resultTone" testid="game-result-overlay">
        <span v-if="state.status === 'won'" data-testid="clear-time">{{ elapsedSeconds }}초 만에 클리어했습니다</span>
      </GameResultOverlay>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onUnmounted, ref, watch} from 'vue'
import {type Cell, createMinesweeperState, type MinesweeperState, placeMines, reveal, toggleFlag} from '../../utils/minesweeper'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

interface Difficulty {
  id: string
  label: string
  rows: number
  cols: number
  mines: number
}

const DIFFICULTIES: Difficulty[] = [
  { id: 'easy', label: '초급', rows: 9, cols: 9, mines: 10 },
  { id: 'medium', label: '중급', rows: 16, cols: 16, mines: 40 },
  { id: 'hard', label: '상급', rows: 16, cols: 30, mines: 99 }
]

const difficulty = ref<Difficulty>(DIFFICULTIES[0])
const flagMode = ref(false)

const props = defineProps<{
  submitScore?: (score: number) => void
  restart?: () => void
  onGameEnd?: () => void
}>()

const LONG_PRESS_MS = 500
const TOUCH_MOVE_CANCEL_PX = 10

const state = ref<MinesweeperState>(createMinesweeperState(placeMines(difficulty.value.rows, difficulty.value.cols, difficulty.value.mines)))
const elapsedSeconds = ref(0)
const {playSuccess, playFail} = useGameSound()

let timerId: ReturnType<typeof setInterval> | null = null
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let touchStartPos: { x: number; y: number } | null = null

const remainingMines = computed(() => {
  let flagged = 0
  for (const row of state.value.grid) {
    for (const cell of row) {
      if (cell.flagged) flagged++
    }
  }
  return difficulty.value.mines - flagged
})

function selectDifficulty(d: Difficulty) {
  difficulty.value = d
  resetGame()
}

function resetGame() {
  state.value = createMinesweeperState(placeMines(difficulty.value.rows, difficulty.value.cols, difficulty.value.mines))
  elapsedSeconds.value = 0
  if (timerId) clearInterval(timerId)
  timerId = setInterval(() => {
    if (state.value.status === 'playing') elapsedSeconds.value++
  }, 1000)
}

function onCellAction(r: number, c: number) {
  if (flagMode.value) {
    onFlag(r, c)
  } else {
    onReveal(r, c)
  }
}

function onReveal(r: number, c: number) {
  const before = state.value.status
  state.value = reveal(state.value, r, c)
  if (before === 'playing' && state.value.status === 'won') playSuccess()
  else if (before === 'playing' && state.value.status === 'lost') playFail()
}

function onFlag(r: number, c: number) {
  state.value = toggleFlag(state.value, r, c)
}

function onCellTouchStart(r: number, c: number, e: TouchEvent) {
  const touch = e.touches[0]
  touchStartPos = { x: touch.clientX, y: touch.clientY }
  if (longPressTimer) clearTimeout(longPressTimer)
  longPressTimer = setTimeout(() => {
    onFlag(r, c)
    longPressTimer = null
  }, LONG_PRESS_MS)
}

function onCellTouchMove(e: TouchEvent) {
  if (!touchStartPos || !longPressTimer) return
  const touch = e.touches[0]
  const dist = Math.hypot(touch.clientX - touchStartPos.x, touch.clientY - touchStartPos.y)
  if (dist > TOUCH_MOVE_CANCEL_PX) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function onCellTouchEnd() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  touchStartPos = null
}

const statusText = computed(() => {
  if (state.value.status === 'won') return '클리어 성공!'
  if (state.value.status === 'lost') return '지뢰 폭발!'
  return ''
})

const resultTone = computed(() => (state.value.status === 'won' ? 'win' : 'lose'))

function cellClass(cell: Cell): string {
  if (!cell.revealed) return 'bg-muted-foreground/20 hover:bg-muted-foreground/30'
  if (cell.hasMine) return 'bg-destructive text-destructive-foreground'
  return 'bg-background border border-border/40'
}

resetGame()

watch(() => state.value.status, status => {
  if (status !== 'playing') {
    if (timerId) clearInterval(timerId)
    if (status === 'won') props.submitScore?.(elapsedSeconds.value * 1000)
    props.onGameEnd?.()
  }
})

onUnmounted(() => {
  if (timerId) clearInterval(timerId)
})
</script>

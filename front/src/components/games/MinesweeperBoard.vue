<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <GameStat v-if="state.status === 'playing'" testid="status" text="지뢰가 아닌 칸을 모두 열어보세요" tone="neutral"/>
    <GameStat label="경과 시간" testid="elapsed" :value="`${elapsedSeconds}초`"/>
    <p v-if="state.status === 'playing'" class="text-[11px] text-muted-foreground">칸을 길게 누르면 깃발을 꽂을 수 있어요 (데스크톱은 우클릭)</p>

    <div class="relative">
      <div
          class="grid gap-1 rounded-xl bg-muted/60 p-2"
          :style="{gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`}"
          data-testid="board"
      >
        <template v-for="(row, r) in state.grid" :key="r">
          <button
              v-for="(cell, c) in row"
              :key="`${r}-${c}-${cell.revealed}-${cell.flagged}`"
              :class="cellClass(cell)"
              class="flex size-8 items-center justify-center rounded text-[13px] font-bold transition-colors"
              type="button"
              @click="onReveal(r, c)"
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

      <GameResultOverlay :restart="props.restart" :show="state.status !== 'playing'" :title="statusText" :tone="resultTone" testid="game-result-overlay">
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

const ROWS = 9
const COLS = 9
const MINE_COUNT = 10
const LONG_PRESS_MS = 500
// 롱프레스 도중 손가락이 이 픽셀만큼 움직이면 스크롤 의도로 보고 깃발 꽂기를 취소한다.
const TOUCH_MOVE_CANCEL_PX = 10

// 053: 지뢰찾기는 자체 점수 개념이 없으므로 "클리어까지 걸린 시간(ms, 낮을수록 좋음)"을 점수로 쓴다.
// 컴포넌트가 마운트된 시점을 시작 시각으로 본다 — GamePage가 재시작마다 slot 전체를 재마운트하므로
// 별도 reset 로직 없이 매 판마다 새로 잰다. elapsedSeconds는 화면 표시용(053 AC: "게임 종료 시 항상
// 점수 표시") — 1초마다 갱신하고, 게임이 끝나면(승/패 무관) 그 시점의 값에서 멈춘다.
const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void }>()
const startedAt = Date.now()
const elapsedSeconds = ref(0)
let tickTimer: ReturnType<typeof setInterval> | null = null
tickTimer = setInterval(() => {
  elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000)
}, 1000)

const state = ref<MinesweeperState>(createMinesweeperState(placeMines(ROWS, COLS, MINE_COUNT)))

const {playClick, playSuccess, playFail} = useGameSound()

function onReveal(r: number, c: number) {
  if (state.value.status !== 'playing') return
  // 이 칸을 여는 것으로 곧바로 승패가 갈리면(지뢰를 밟거나 마지막 안전 칸을 열면) 클릭음 대신
  // watch(status)가 울리는 승리/패배음만 나가도록 한다 — 안 그러면 같은 입력에 소리가 겹친다.
  const next = reveal(state.value, r, c)
  state.value = next
  if (next.status === 'playing') playClick()
}

function onFlag(r: number, c: number) {
  if (state.value.status !== 'playing') return
  playClick()
  state.value = toggleFlag(state.value, r, c)
}

// 모바일에는 우클릭이 없으므로 칸을 길게 누르면 깃발을 꽂도록 지원한다.
// 롱프레스가 발동하면 뒤이어 브라우저가 만들어내는 합성 클릭(reveal 중복 트리거)을 막는다.
let touchTimer: ReturnType<typeof setTimeout> | null = null
let touchStartPos: { x: number; y: number } | null = null
let longPressTriggered = false

function onCellTouchStart(r: number, c: number, e: TouchEvent) {
  longPressTriggered = false
  const t = e.touches[0]
  touchStartPos = {x: t.clientX, y: t.clientY}
  if (touchTimer) clearTimeout(touchTimer)
  touchTimer = setTimeout(() => {
    longPressTriggered = true
    onFlag(r, c)
  }, LONG_PRESS_MS)
}

function onCellTouchMove(e: TouchEvent) {
  if (!touchStartPos || !touchTimer) return
  const t = e.touches[0]
  const moved = Math.max(Math.abs(t.clientX - touchStartPos.x), Math.abs(t.clientY - touchStartPos.y))
  if (moved > TOUCH_MOVE_CANCEL_PX) {
    clearTimeout(touchTimer)
    touchTimer = null
  }
}

function onCellTouchEnd(e: TouchEvent) {
  if (touchTimer) {
    clearTimeout(touchTimer)
    touchTimer = null
  }
  touchStartPos = null
  if (longPressTriggered) {
    e.preventDefault()
  }
}

watch(() => state.value.status, (next, prev) => {
  if (next === prev) return
  if (next === 'won' || next === 'lost') {
    if (tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
    elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000)
  }
  if (next === 'won') {
    playSuccess()
    props.submitScore?.(Date.now() - startedAt)
  } else if (next === 'lost') {
    playFail()
  }
})

const statusText = computed(() => {
  if (state.value.status === 'won') return '승리했습니다!'
  if (state.value.status === 'lost') return '게임 오버'
  return '지뢰가 아닌 칸을 모두 열어보세요'
})

const resultTone = computed<'win' | 'lose' | 'neutral'>(() => {
  if (state.value.status === 'won') return 'win'
  if (state.value.status === 'lost') return 'lose'
  return 'neutral'
})

const NUMBER_COLORS: Record<number, string> = {
  1: 'text-blue-600',
  2: 'text-emerald-600',
  3: 'text-red-600',
  4: 'text-indigo-700',
  5: 'text-amber-700',
  6: 'text-cyan-600',
  7: 'text-foreground',
  8: 'text-muted-foreground',
}

function cellClass(cell: Cell): string {
  if (!cell.revealed) return 'bg-secondary hover:bg-accent'
  const revealAnim = 'cell-reveal'
  if (cell.hasMine) return `bg-destructive/20 ${revealAnim}`
  return `bg-background border border-border ${revealAnim} ${NUMBER_COLORS[cell.adjacentCount] ?? ''}`
}

onUnmounted(() => {
  if (touchTimer) clearTimeout(touchTimer)
  if (tickTimer) clearInterval(tickTimer)
})
</script>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .cell-reveal {
    animation: cell-reveal 0.15s ease-out both;
  }

  @keyframes cell-reveal {
    from {
      transform: scale(0.7);
      opacity: 0.4;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
}
</style>

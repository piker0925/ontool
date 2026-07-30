<template>
  <div class="flex flex-col items-center gap-4 py-6" tabindex="0" @keydown="onKeydown" @touchend="onTouchEnd" @touchstart="onTouchStart">
    <GameStat label="점수" testid="score" :value="score"/>

    <div class="flex items-center gap-2 mb-2">
      <button
          :class="infiniteMode ? 'bg-zone-accent text-background font-bold shadow-md' : 'bg-muted border border-border text-muted-foreground'"
          class="px-3 py-1 rounded-full text-xs transition-colors"
          type="button"
          @click="infiniteMode = !infiniteMode"
      >
        ♾️ 무한 모드 (4096+) {{ infiniteMode ? 'ON' : 'OFF' }}
      </button>
    </div>

    <div class="relative">
      <div
        :class="comboActive ? 'shadow-[0_0_25px_var(--zone-accent-fun)] border-zone-accent-fun/50' : 'border-transparent'"
        class="grid grid-cols-4 gap-2 rounded-xl bg-muted/60 p-2 border transition-[box-shadow,border-color] duration-300"
        data-testid="board"
      >
        <template v-for="(row, r) in board" :key="r">
          <div
              v-for="(cell, c) in row"
              :key="`${r}-${c}-${moveTick}`"
              :class="[tileClass(cell), tileAnimClass(r, c)]"
              class="flex size-16 items-center justify-center rounded-lg text-lg font-bold transition-[transform,background-color] duration-100 active:scale-95"
          >
            {{ cell || '' }}
          </div>
        </template>
      </div>

      <GameResultOverlay :restart="props.restart" :show="gameOver" testid="game-over" title="게임 오버!" tone="lose"/>
    </div>

    <p v-if="!gameOver" class="text-[11px] text-muted-foreground">방향키 또는 스와이프로 이동하세요</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, ref, watch} from 'vue'
import {addRandomTile, type Board, createEmptyBoard, type Direction, isGameOver, move} from '../../utils/game2048'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

// 053: GamePage가 넘겨주는 제출 훅. optional로 둬 기존 테스트(prop 없이 마운트)가 깨지지 않게 한다.
// 166: restart도 함께 받아 GameResultOverlay 안의 재시작 버튼에 그대로 연결한다.
// 174: onGameEnd는 결과 오버레이가 뜨는 시점(2048은 게임오버 하나뿐)에 submitScore와 함께 호출된다.
const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void; onGameEnd?: () => void }>()

const board = ref<Board>(createEmptyBoard(4))
const score = ref(0)
const infiniteMode = ref(false)
const gameOver = computed(() => infiniteMode.value ? false : isGameOver(board.value))

const {playClick, playSuccess, playFail} = useGameSound()

// 이번 이동에서 병합된 칸(값이 2배가 된 칸)과 새로 생긴 랜덤 타일의 위치.
// 이동마다 moveTick을 올려 각 칸의 :key를 바꿔주면 애니메이션 클래스가 그대로여도
// 엘리먼트가 다시 마운트되어 CSS 애니메이션이 매번 새로 재생된다.
const mergedFlags = ref<boolean[][]>(createEmptyBoard(4).map(row => row.map(() => false)))
const newTilePos = ref<{ r: number; c: number } | null>(null)
const moveTick = ref(0)

function tileAnimClass(r: number, c: number): string {
  if (mergedFlags.value[r]?.[c]) return 'tile-pop-merge'
  if (newTilePos.value?.r === r && newTilePos.value?.c === c) return 'tile-pop-in'
  return ''
}

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

function transposeGrid<T>(grid: T[][]): T[][] {
  return grid[0].map((_, c) => grid.map(row => row[c]))
}

function reverseRowsGrid<T>(grid: T[][]): T[][] {
  return grid.map(row => [...row].reverse())
}

// 병합 애니메이션 전용 판정 함수. game2048.ts의 move()가 실제 게임 상태(보드·점수)의
// 단일 소스이므로 그 로직은 건드리지 않고, 여기서는 move()의 압축·전치 패턴을 그대로 미러링해
// "이번 이동에서 어느 칸이 병합 결과인가"만 화면 연출용으로 계산한다.
function computeMergedFlags(beforeBoard: Board, direction: Direction): boolean[][] {
  let working: Board = beforeBoard
  if (direction === 'right') working = reverseRowsGrid(working)
  if (direction === 'up') working = transposeGrid(working)
  if (direction === 'down') working = reverseRowsGrid(transposeGrid(working))

  const flagRows = working.map(row => {
    const compact = row.filter(v => v !== 0)
    const flags: boolean[] = []
    let i = 0
    while (i < compact.length) {
      if (i + 1 < compact.length && compact[i] === compact[i + 1]) {
        flags.push(true)
        i += 2
      } else {
        flags.push(false)
        i += 1
      }
    }
    while (flags.length < row.length) flags.push(false)
    return flags
  })

  let result: boolean[][] = flagRows
  if (direction === 'right') result = reverseRowsGrid(result)
  if (direction === 'up') result = transposeGrid(result)
  if (direction === 'down') result = transposeGrid(reverseRowsGrid(result))
  return result
}

function findNewTile(afterMerge: Board, afterRandom: Board): { r: number; c: number } | null {
  for (let r = 0; r < afterRandom.length; r++) {
    for (let c = 0; c < afterRandom[r].length; c++) {
      if (afterMerge[r][c] === 0 && afterRandom[r][c] !== 0) return {r, c}
    }
  }
  return null
}

// 키보드·터치 스와이프 공통 이동 처리 — 두 입력 방식이 같은 로직을 타도록 한곳에 모은다.
const comboActive = ref(false)
let comboTimer: ReturnType<typeof setTimeout> | null = null

function triggerComboGlow() {
  comboActive.value = true
  if (comboTimer) clearTimeout(comboTimer)
  comboTimer = setTimeout(() => {
    comboActive.value = false
  }, 400)
}

function applyDirection(direction: Direction) {
  if (gameOver.value) return
  const before = board.value
  const result = move(before, direction)
  if (!result.moved) return

  score.value += result.scoreGained
  const withRandom = addRandomTile(result.board)

  mergedFlags.value = computeMergedFlags(before, direction)
  newTilePos.value = findNewTile(result.board, withRandom)
  moveTick.value++
  board.value = withRandom

  if (result.scoreGained > 0) {
    playSuccess()
    triggerComboGlow()
  } else {
    playClick()
  }
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

watch(gameOver, isOver => {
  if (isOver) {
    playFail()
    props.submitScore?.(score.value)
    props.onGameEnd?.()
  }
})

onMounted(() => {
  board.value = addRandomTile(addRandomTile(createEmptyBoard(4)))
})
</script>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .tile-pop-in {
    animation: tile-pop-in 0.18s ease-out both;
  }

  .tile-pop-merge {
    animation: tile-pop-merge 0.18s ease-out both;
  }

  @keyframes tile-pop-in {
    from {
      transform: scale(0);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes tile-pop-merge {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.15);
    }
    100% {
      transform: scale(1);
    }
  }
}
</style>

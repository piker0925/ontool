<template>
  <div class="flex flex-col items-center gap-4 py-4 select-none">
    <div class="flex items-center justify-center gap-2 w-full max-w-md px-2">
      <GameStat label="점수" testid="tetris-score" :value="state.score"/>
      <GameStat label="레벨" testid="tetris-level" :value="state.level"/>
      <GameStat label="라인" testid="tetris-lines" :value="state.linesCleared"/>
    </div>

    <!-- 방해 블록 WARNING 배너 -->
    <div v-if="attackBanner" class="animate-bounce rounded-xl border border-destructive/80 bg-destructive/20 backdrop-blur-sm px-4 py-2 text-xs font-bold text-destructive shadow-[0_0_20px_oklch(0.577_0.245_27)] ring-1 ring-destructive/40">
      ⚠️ {{ attackBanner }}
    </div>

    <div class="flex gap-4 items-start">
      <!-- 메인 10x20 보드 -->
      <div
          ref="boardRef"
          class="relative border border-border/60 rounded-2xl overflow-hidden bg-muted/20 backdrop-blur-sm p-1 shadow-[0_0_30px_rgba(0,0,0,0.5)] ring-1 ring-border/30 focus:outline-none"
          tabindex="0"
          data-testid="tetris-board"
      >
        <!-- Ready 대기 오버레이 (게임 시작 버튼) -->
        <div v-if="state.status === 'ready'" class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm p-4 text-center">
          <div class="space-y-1">
            <h3 class="text-base font-bold">테트리스</h3>
            <p class="text-xs text-muted-foreground">방향키(← → ↓ ↑) 조종 | Space 하드드롭</p>
            <p class="text-[11px] text-muted-foreground/80">고스트 블록 조준선 기본 탑재</p>
          </div>
          <button
              class="rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition-transform duration-200 hover:scale-105 active:scale-95 shadow-md"
              data-testid="start-tetris-button"
              type="button"
              @click="handleStart"
          >
            🎮 게임 시작
          </button>
        </div>

        <div class="grid grid-cols-10 gap-0.5 w-[280px] h-[540px] max-w-full bg-background/80 rounded-lg p-0.5">
          <template v-for="(row, r) in displayGrid" :key="r">
            <div
                v-for="(cell, c) in row"
                :key="c"
                :class="cellClass(cell)"
                :style="cellStyle(cell)"
                class="rounded-[2px] transition-colors duration-75"
            />
          </template>
        </div>

        <GameResultOverlay v-if="!props.isMulti" :restart="resetGame" :show="state.status === 'over'" testid="tetris-over" title="게임 오버!" tone="lose">
          <span data-testid="final-score">{{ state.score }}점 ({{ state.linesCleared }}라인)</span>
        </GameResultOverlay>
      </div>

      <!-- 다음 블록 미니 미리보기 박스 -->
      <div class="flex flex-col items-center gap-2 border border-border/60 bg-muted/20 backdrop-blur-md p-3 rounded-2xl shadow-lg">
        <span class="text-[10px] font-mono font-bold uppercase tracking-widest text-zone-accent">NEXT</span>
        <div class="grid grid-cols-4 gap-0.5 w-16 h-16 bg-background/60 rounded-md p-1 items-center justify-center">
          <template v-for="(row, r) in nextGrid" :key="r">
            <div
                v-for="(cell, c) in row"
                :key="c"
                :class="cellClass(cell)"
                :style="cellStyle(cell)"
                class="size-3.5 rounded-[1px]"
            />
          </template>
        </div>
      </div>
    </div>

    <!-- 모바일/화면 터치 조작 패드 -->
    <div class="flex flex-col items-center gap-2 mt-2 w-full max-w-xs">
      <div class="flex items-center gap-2">
        <button class="px-4 py-2 rounded-lg border border-border bg-muted/60 text-sm font-medium hover:bg-muted" type="button" @click="onRotate">🔄 회전 (↑)</button>
        <button class="px-4 py-2 rounded-lg border border-border bg-muted/60 text-sm font-medium hover:bg-muted" type="button" @click="onHardDrop">⚡ 하드드롭 (Space)</button>
      </div>
      <div class="flex items-center gap-2">
        <button class="px-4 py-2 rounded-lg border border-border bg-muted/60 text-sm font-medium hover:bg-muted" type="button" @click="onLeft">◀ (←)</button>
        <button class="px-4 py-2 rounded-lg border border-border bg-muted/60 text-sm font-medium hover:bg-muted" type="button" @click="onSoftDrop">▼ (↓)</button>
        <button class="px-4 py-2 rounded-lg border border-border bg-muted/60 text-sm font-medium hover:bg-muted" type="button" @click="onRight">▶ (→)</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {
  addGarbageLines,
  BOARD_COLS,
  BOARD_ROWS,
  createTetrisState,
  getGhostY,
  hardDrop,
  moveLeft,
  moveRight,
  rotatePiece,
  softDrop,
  startTetrisGame,
  tickTetris
} from '../../utils/tetris'
import {consumeGameRetry, requestGameRetry} from '../../utils/gameRetryState'
import {clearTetrisLinesApi} from '../../api/games'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const props = defineProps<{
  submitScore?: (score: number) => void
  restart?: () => void
  onGameEnd?: () => void
  isMulti?: boolean
  code?: string
  participantId?: string
  roomSessionToken?: string
}>()

const initialStatus = props.isMulti || consumeGameRetry('game-tetris') ? 'playing' : 'ready'
const state = ref(createTetrisState(Math.random, initialStatus))
const boardRef = ref<HTMLDivElement | null>(null)
const {playSuccess, playFail} = useGameSound()
const attackBanner = ref<string | null>(null)
let intervalId: ReturnType<typeof setInterval> | null = null

if (props.isMulti || initialStatus === 'playing') {
  intervalId = setInterval(step, 100)
  nextTick(() => {
    boardRef.value?.focus()
  })
}

const COLOR_GRADIENTS: Record<number, string> = {
  1: 'linear-gradient(135deg, #22d3ee, #0891b2)', // I Cyan
  2: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', // J Blue
  3: 'linear-gradient(135deg, #fb923c, #c2410c)', // L Orange
  4: 'linear-gradient(135deg, #fde047, #ca8a04)', // O Yellow
  5: 'linear-gradient(135deg, #4ade80, #15803d)', // S Green
  6: 'linear-gradient(135deg, #c084fc, #7e22ce)', // T Purple
  7: 'linear-gradient(135deg, #f87171, #b91c1c)', // Z Red
  8: 'linear-gradient(135deg, #94a3b8, #475569)', // Garbage Gray
}

function cellStyle(val: number) {
  if (val === 0) return { backgroundColor: 'transparent' }
  if (val >= 100) {
    const colorIndex = val - 100
    return {
      background: COLOR_GRADIENTS[colorIndex] || 'var(--primary)',
      opacity: 0.45,
      border: '2px dashed rgba(255, 255, 255, 0.9)',
      boxShadow: '0 0 8px rgba(255, 255, 255, 0.3)',
    }
  }
  return {
    background: COLOR_GRADIENTS[val] || 'var(--primary)',
    boxShadow: 'inset 1px 1px 2px rgba(255, 255, 255, 0.5), inset -1px -1px 2px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
  }
}

function cellClass(val: number) {
  if (val === 0) return 'bg-muted/15 border border-white/5'
  if (val >= 100) return 'animate-pulse rounded-[3px]'
  return 'rounded-[3px]'
}

function handleStart() {
  state.value = startTetrisGame(state.value)
  if (!intervalId) {
    intervalId = setInterval(step, 100)
  }
  nextTick(() => {
    boardRef.value?.focus()
  })
}

// 캔버스 디스플레이 격자 (고스트 블록 + 현재 블록 포함)
const displayGrid = computed(() => {
  const grid = state.value.grid.map(row => [...row])
  const p = state.value.currentPiece
  if (!p || state.value.status !== 'playing') return grid

  const ghostY = getGhostY(state.value)

  // 1. 고스트 표시 (100 + colorIndex)
  for (let r = 0; r < p.shape.length; r++) {
    for (let c = 0; c < p.shape[r].length; c++) {
      if (p.shape[r][c] !== 0) {
        const targetY = ghostY + r
        const targetX = p.x + c
        if (targetY >= 0 && targetY < BOARD_ROWS && targetX >= 0 && targetX < BOARD_COLS && grid[targetY][targetX] === 0) {
          grid[targetY][targetX] = 100 + p.colorIndex
        }
      }
    }
  }

  // 2. 현재 블록 표시
  for (let r = 0; r < p.shape.length; r++) {
    for (let c = 0; c < p.shape[r].length; c++) {
      if (p.shape[r][c] !== 0) {
        const targetY = p.y + r
        const targetX = p.x + c
        if (targetY >= 0 && targetY < BOARD_ROWS && targetX >= 0 && targetX < BOARD_COLS) {
          grid[targetY][targetX] = p.colorIndex
        }
      }
    }
  }

  return grid
})

const nextGrid = computed(() => {
  const grid = Array.from({length: 4}, () => Array(4).fill(0))
  const next = state.value.nextPiece
  if (!next) return grid
  for (let r = 0; r < next.shape.length; r++) {
    for (let c = 0; c < next.shape[r].length; c++) {
      if (next.shape[r][c] !== 0) {
        grid[r][c] = next.colorIndex
      }
    }
  }
  return grid
})

function resetGame() {
  requestGameRetry('game-tetris')
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  props.restart?.()
}

function handleClearedLines(cleared: number) {
  if (cleared > 0) {
    playSuccess()
    if (props.isMulti && props.code && props.participantId && props.roomSessionToken && cleared >= 2) {
      clearTetrisLinesApi("game-tetris", props.code, props.participantId, props.roomSessionToken, cleared).catch(() => {})
    }
  }
}

function onLeft() { state.value = moveLeft(state.value) }
function onRight() { state.value = moveRight(state.value) }
function onRotate() { state.value = rotatePiece(state.value) }
function onSoftDrop() {
  state.value = softDrop(state.value)
}
function onHardDrop() {
  const beforeCleared = state.value.linesCleared
  state.value = hardDrop(state.value)
  const cleared = state.value.linesCleared - beforeCleared
  handleClearedLines(cleared)
}

function step() {
  if (state.value.status !== 'playing') return
  const {nextState, clearedCount} = tickTetris(state.value, 100)
  state.value = nextState
  handleClearedLines(clearedCount)
}

function receiveGarbageLines(lines: number, attacker: string) {
  attackBanner.value = `${attacker}의 방해 블록 공격! (+${lines}줄)`
  setTimeout(() => { attackBanner.value = null }, 1800)
  state.value = addGarbageLines(state.value, lines)
  playFail()
}

defineExpose({ receiveGarbageLines })

if (props.isMulti) {
  intervalId = setInterval(step, 100)
}

watch(() => state.value.status, status => {
  if (status === 'over') {
    if (intervalId) clearInterval(intervalId)
    props.submitScore?.(state.value.score)
    props.onGameEnd?.()
  }
})

let spacePressed = false

function handleGlobalKey(e: KeyboardEvent) {
  if (state.value.status === 'ready') {
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      e.preventDefault()
      handleStart()
    }
    return
  }
  if (state.value.status !== 'playing') return
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { onLeft(); e.preventDefault(); }
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { onRight(); e.preventDefault(); }
  else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { onRotate(); e.preventDefault(); }
  else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { onSoftDrop(); e.preventDefault(); }
  else if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault()
    if (!spacePressed) {
      spacePressed = true
      onHardDrop()
    }
  }
}

function handleGlobalKeyUp(e: KeyboardEvent) {
  if (e.key === ' ' || e.key === 'Spacebar') {
    spacePressed = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKey)
  window.addEventListener('keyup', handleGlobalKeyUp)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  window.removeEventListener('keydown', handleGlobalKey)
  window.removeEventListener('keyup', handleGlobalKeyUp)
})
</script>

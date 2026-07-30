<template>
  <div class="flex flex-col items-center gap-4 py-4 select-none">
    <!-- 게임 통계 & 기록 뱃지 -->
    <div class="flex items-center justify-between w-full max-w-[340px] px-2">
      <GameStat label="이동 횟수" testid="move-count" :value="moveCount"/>
      <div class="flex items-center gap-2">
        <span class="text-xs font-mono text-muted-foreground border border-border/40 px-2.5 py-1 rounded-lg bg-muted/20">
          최소 기록: <strong class="text-foreground">{{ minMoves === Infinity ? '-' : `${minMoves}회` }}</strong>
        </span>
      </div>
    </div>

    <!-- 완벽하게 대칭 정렬된 슬라이딩 퍼즐 보드판 (CSS Grid + Smooth FLIP Slide) -->
    <div class="relative group">
      <div
          class="grid grid-cols-4 gap-2.5 w-[336px] h-[336px] rounded-3xl border-4 border-primary/20 bg-slate-950 p-3.5 shadow-2xl touch-none"
          data-testid="board"
      >
        <button
            v-for="(val, i) in board"
            :key="i"
            :data-testid="`tile-${i}`"
            :disabled="val === 0 || solved"
            :class="[
              val === 0
                ? 'invisible border-none shadow-none pointer-events-none'
                : canMoveTile(i)
                ? 'bg-slate-800 text-amber-300 border-slate-600 hover:border-amber-400 active:scale-[0.97] cursor-grab active:cursor-grabbing'
                : 'bg-slate-900/90 text-slate-400 border-slate-800'
            ]"
            :style="getTileStyle(i)"
            class="flex items-center justify-center rounded-2xl border-2 text-2xl font-extrabold font-mono transition-[transform,background-color,border-color] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] select-none outline-none z-10"
            type="button"
            @mousedown="onMouseDown($event, i)"
            @touchstart="onTouchStart($event, i)"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd(i)"
            @click="onSlotClick(i)"
        >
          <span>{{ val || '' }}</span>
        </button>
      </div>

      <GameResultOverlay :restart="resetLocalGame" :show="solved" testid="game-clear" title="🎉 퍼즐을 완성했습니다!" tone="win">
        <div class="flex flex-col items-center gap-1">
          <span data-testid="clear-moves" class="text-base font-extrabold text-foreground">{{ moveCount }}번 만에 맞췄습니다!</span>
          <span class="text-xs text-muted-foreground">버튼을 눌러 새로 섞고 도전해보세요</span>
        </div>
      </GameResultOverlay>
    </div>

    <p v-if="!solved" class="text-[12px] font-medium text-muted-foreground/90 bg-muted/30 px-3.5 py-1.5 rounded-full border border-border/40 flex items-center gap-1">
      <span>💡</span> <span>블록을 눌러 빈 공간으로 매끄럽게 슬라이딩시키세요</span>
    </p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {canMove, isSolved, move, shuffle} from '../../utils/slidingPuzzle'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const SIZE = 4

const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void; onGameEnd?: () => void }>()

const board = ref(shuffle(SIZE))
const moveCount = ref(0)
const minMoves = ref(Infinity)
const solved = computed(() => isSolved(board.value))

const {playClick, playSuccess} = useGameSound()

const activeDragIndex = ref<number | null>(null)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)
const movingAnim = ref<{ index: number; dx: number; dy: number } | null>(null)

function getTileStyle(index: number) {
  if (activeDragIndex.value === index) {
    const blankIdx = board.value.indexOf(0)
    const srcRow = Math.floor(index / 4)
    const srcCol = index % 4
    const destRow = Math.floor(blankIdx / 4)
    const destCol = blankIdx % 4

    const maxDx = (destCol - srcCol) * 74
    const maxDy = (destRow - srcRow) * 74

    let dx = dragOffsetX.value
    let dy = dragOffsetY.value

    if (maxDx > 0) dx = Math.max(0, Math.min(maxDx, dx))
    else if (maxDx < 0) dx = Math.min(0, Math.max(maxDx, dx))
    else dx = 0

    if (maxDy > 0) dy = Math.max(0, Math.min(maxDy, dy))
    else if (maxDy < 0) dy = Math.min(0, Math.max(maxDy, dy))
    else dy = 0

    return {
      transform: `translate3d(${dx}px, ${dy}px, 0)`,
      transition: 'none'
    }
  }

  if (movingAnim.value && movingAnim.value.index === index) {
    return {
      transform: `translate3d(${movingAnim.value.dx}px, ${movingAnim.value.dy}px, 0)`,
      transition: 'none'
    }
  }
  return {
    transform: 'translate3d(0, 0, 0)'
  }
}

function canMoveTile(index: number): boolean {
  return canMove(board.value, index, SIZE)
}

function resetLocalGame() {
  board.value = shuffle(SIZE)
  moveCount.value = 0
  if (props.restart) props.restart()
}

function tryMoveIndex(i: number) {
  if (solved.value || movingAnim.value) return
  if (!canMoveTile(i)) return

  const blankIdx = board.value.indexOf(0)
  const srcRow = Math.floor(i / 4)
  const srcCol = i % 4
  const destRow = Math.floor(blankIdx / 4)
  const destCol = blankIdx % 4

  const cellStep = 74
  const dx = (destCol - srcCol) * cellStep
  const dy = (destRow - srcRow) * cellStep

  const next = move(board.value, i, SIZE)
  if (next === board.value) return

  movingAnim.value = { index: i, dx: -dx, dy: -dy }
  board.value = next
  moveCount.value++

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      movingAnim.value = null
    })
  })

  if (isSolved(next)) {
    if (moveCount.value < minMoves.value) {
      minMoves.value = moveCount.value
    }
    playSuccess()
    props.submitScore?.(moveCount.value)
    props.onGameEnd?.()
  } else {
    playClick()
  }
}

function onSlotClick(i: number) {
  if (activeDragIndex.value !== null) return
  tryMoveIndex(i)
}

// 터치 & 마우스 드래그/스와이프
let startX = 0
let startY = 0

function onTouchStart(e: TouchEvent, index: number) {
  if (!e.touches[0] || !canMoveTile(index)) return
  startX = e.touches[0].clientX
  startY = e.touches[0].clientY
  activeDragIndex.value = index
  dragOffsetX.value = 0
  dragOffsetY.value = 0
}

function onTouchMove(e: TouchEvent) {
  if (activeDragIndex.value === null || !e.touches[0]) return
  dragOffsetX.value = e.touches[0].clientX - startX
  dragOffsetY.value = e.touches[0].clientY - startY
}

function onTouchEnd(index: number) {
  if (activeDragIndex.value === index) {
    const isMoved = Math.abs(dragOffsetX.value) > 15 || Math.abs(dragOffsetY.value) > 15
    activeDragIndex.value = null
    dragOffsetX.value = 0
    dragOffsetY.value = 0
    if (isMoved) {
      tryMoveIndex(index)
    }
  }
}

function onMouseDown(e: MouseEvent, index: number) {
  if (!canMoveTile(index)) return
  startX = e.clientX
  startY = e.clientY
  activeDragIndex.value = index
  dragOffsetX.value = 0
  dragOffsetY.value = 0

  const onMouseMove = (moveEvt: MouseEvent) => {
    dragOffsetX.value = moveEvt.clientX - startX
    dragOffsetY.value = moveEvt.clientY - startY
  }

  const onMouseUp = (_upEvt: MouseEvent) => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    const isMoved = Math.abs(dragOffsetX.value) > 15 || Math.abs(dragOffsetY.value) > 15
    const targetIdx = activeDragIndex.value
    activeDragIndex.value = null
    dragOffsetX.value = 0
    dragOffsetY.value = 0
    if (isMoved && targetIdx !== null) {
      tryMoveIndex(targetIdx)
    }
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp, { once: true })
}
</script>

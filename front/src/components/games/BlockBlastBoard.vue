<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <GameStat label="점수" testid="score" :value="state.score"/>

    <div class="relative">
      <div
          class="grid gap-0.5 rounded-xl bg-muted/60 p-2"
          :style="{gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`}"
          data-testid="grid"
      >
        <template v-for="(row, r) in state.grid" :key="r">
          <button
              v-for="(cell, c) in row"
              :key="`${r}-${c}`"
              :class="cell ? 'bg-zone-accent' : 'bg-secondary hover:bg-accent'"
              :data-testid="`cell-${r}-${c}`"
              class="size-6 rounded-sm transition-colors"
              type="button"
              @click="onCellClick(r, c)"
          />
        </template>
      </div>

      <GameResultOverlay :show="state.status === 'over'" testid="game-over" title="더 이상 놓을 자리가 없습니다!" tone="lose"/>
    </div>

    <div class="flex gap-3" data-testid="tray">
      <button
          v-for="(piece, i) in state.pieces"
          :key="i"
          :class="[
            'flex h-16 w-16 items-center justify-center rounded-lg border p-1',
            piece ? 'border-border bg-card' : 'border-transparent opacity-30',
            selectedIndex === i ? 'ring-2 ring-zone-accent' : '',
          ]"
          :data-testid="`piece-${i}`"
          :disabled="!piece"
          type="button"
          @click="selectedIndex = i"
      >
        <div v-if="piece" class="grid gap-px" :style="pieceGridStyle(piece)">
          <div
              v-for="idx in pieceCellCount(piece)"
              :key="idx"
              :class="pieceCellClass(piece, idx - 1)"
              class="size-2.5 rounded-[2px]"
          />
        </div>
      </button>
    </div>

    <p v-if="state.status !== 'over'" class="text-[11px] text-muted-foreground">조각을 고른 뒤 놓을 칸을 눌러보세요</p>
  </div>
</template>

<script lang="ts" setup>
import {ref, watch} from 'vue'
import {createBlockBlastState, place, type Piece} from '../../utils/blockBlast'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const GRID_SIZE = 8

const props = defineProps<{ submitScore?: (score: number) => void }>()

const state = ref(createBlockBlastState())
const selectedIndex = ref(0)

const {playClick, playSuccess, playFail} = useGameSound()

function pieceBounds(piece: Piece) {
  const maxRow = Math.max(...piece.cells.map(([r]) => r))
  const maxCol = Math.max(...piece.cells.map(([, c]) => c))
  return {rows: maxRow + 1, cols: maxCol + 1}
}

function pieceCellCount(piece: Piece): number {
  return pieceBounds(piece).rows * pieceBounds(piece).cols
}

function pieceGridStyle(piece: Piece) {
  const {cols} = pieceBounds(piece)
  return {gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`}
}

function pieceCellClass(piece: Piece, flatIndex: number): string {
  const {cols} = pieceBounds(piece)
  const r = Math.floor(flatIndex / cols)
  const c = flatIndex % cols
  const filled = piece.cells.some(([pr, pc]) => pr === r && pc === c)
  return filled ? 'bg-zone-accent' : 'invisible'
}

// 클릭한 칸을 선택된 조각의 좌상단 기준점으로 삼아 배치를 시도한다 — 탭 하나로 데스크톱
// 마우스와 모바일 터치를 동시에 지원한다(드래그 앤 드롭 불필요).
function onCellClick(row: number, col: number) {
  if (state.value.status !== 'playing') return
  const before = state.value.score
  const next = place(state.value, selectedIndex.value, row, col)
  if (next === state.value) return // 배치 불가능한 자리 — 아무 일도 일어나지 않는다
  state.value = next
  if (next.score > before) playSuccess()
  else playClick()

  const nextSelectable = next.pieces.findIndex(p => p !== null)
  if (nextSelectable !== -1) selectedIndex.value = nextSelectable
}

watch(() => state.value.status, status => {
  if (status === 'over') {
    playFail()
    props.submitScore?.(state.value.score)
  }
})
</script>

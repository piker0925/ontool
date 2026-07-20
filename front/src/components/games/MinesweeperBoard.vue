<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <p class="text-sm font-medium" :class="statusClass" data-testid="status">{{ statusText }}</p>

    <div
        class="grid gap-1 rounded-xl bg-muted/60 p-2"
        :style="{gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`}"
        data-testid="board"
    >
      <template v-for="(row, r) in state.grid" :key="r">
        <button
            v-for="(cell, c) in row"
            :key="c"
            :class="cellClass(cell)"
            class="flex size-8 items-center justify-center rounded text-[13px] font-bold transition-colors"
            type="button"
            @click="onReveal(r, c)"
            @click.right.prevent="onFlag(r, c)"
            @contextmenu.prevent
        >
          <template v-if="cell.revealed">{{ cell.hasMine ? '💣' : (cell.adjacentCount || '') }}</template>
          <template v-else-if="cell.flagged">🚩</template>
        </button>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {type Cell, createMinesweeperState, type MinesweeperState, placeMines, reveal, toggleFlag} from '../../utils/minesweeper'

const ROWS = 9
const COLS = 9
const MINE_COUNT = 10

const state = ref<MinesweeperState>(createMinesweeperState(placeMines(ROWS, COLS, MINE_COUNT)))

function onReveal(r: number, c: number) {
  state.value = reveal(state.value, r, c)
}

function onFlag(r: number, c: number) {
  state.value = toggleFlag(state.value, r, c)
}

const statusText = computed(() => {
  if (state.value.status === 'won') return '승리했습니다!'
  if (state.value.status === 'lost') return '게임 오버'
  return '지뢰가 아닌 칸을 모두 열어보세요'
})

const statusClass = computed(() => {
  if (state.value.status === 'won') return 'text-zone-accent'
  if (state.value.status === 'lost') return 'text-destructive'
  return 'text-muted-foreground'
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
  if (cell.hasMine) return 'bg-destructive/20'
  return `bg-background border border-border ${NUMBER_COLORS[cell.adjacentCount] ?? ''}`
}
</script>

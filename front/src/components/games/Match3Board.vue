<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <GameStat label="점수" testid="score" :value="score"/>

    <div
        class="grid gap-1 rounded-xl bg-muted/60 p-2"
        :style="{gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`}"
        data-testid="grid"
    >
      <template v-for="(row, r) in grid" :key="r">
        <button
            v-for="(tile, c) in row"
            :key="`${r}-${c}`"
            :class="[TILE_COLORS[tile], selected && selected[0] === r && selected[1] === c ? 'ring-2 ring-foreground' : '']"
            :data-testid="`tile-${r}-${c}`"
            class="size-9 rounded-md transition-colors"
            type="button"
            @click="onTileClick(r, c)"
        />
      </template>
    </div>

    <p class="text-[11px] text-muted-foreground">타일을 눌러 선택한 뒤 인접한 타일을 눌러 교환하세요</p>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {clearAndRefill, createGrid, findMatches, type Grid, trySwap} from '../../utils/match3'
import {useGameSound} from '../../composables/useGameSound'
import GameStat from '../GameStat.vue'

const GRID_SIZE = 8
const TILE_COLORS = ['bg-rose-500', 'bg-amber-400', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500']

// 매치3은 이 이슈 범위에서 "게임 종료" 개념 없이 계속 이어지는 스코어 어택 방식으로 둔다
// (제한 이동 횟수·목표 점수 등은 향후 확장 여지) — submitScore는 연결하지 않는다.
const grid = ref<Grid>(createGrid(GRID_SIZE))
const score = ref(0)
const selected = ref<[number, number] | null>(null)

const {playClick, playSuccess} = useGameSound()

// 매치가 더 안 생길 때까지 클리어→낙하→보충을 반복해 연쇄(콤보)를 전부 처리한다.
function resolveCascade(startGrid: Grid) {
  let current = startGrid
  let matches = findMatches(current)
  while (matches.length > 0) {
    const {grid: refilled, scoreGained} = clearAndRefill(current, matches)
    score.value += scoreGained
    current = refilled
    matches = findMatches(current)
  }
  grid.value = current
}

function onTileClick(r: number, c: number) {
  if (!selected.value) {
    selected.value = [r, c]
    playClick()
    return
  }

  const [sr, sc] = selected.value
  if (sr === r && sc === c) {
    selected.value = null
    return
  }

  const result = trySwap(grid.value, selected.value, [r, c])
  selected.value = null
  if (!result.matched) return

  playSuccess()
  resolveCascade(result.grid)
}
</script>

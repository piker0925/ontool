<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <div class="flex items-center gap-4">
      <GameStat label="점수" testid="score" :value="state.score"/>
      <GameStat label="남은 이동" testid="moves-left" :value="state.movesLeft"/>
    </div>

    <div class="relative">
      <div
          class="grid gap-1 rounded-xl bg-muted/60 p-2"
          :style="{gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`}"
          data-testid="grid"
      >
        <template v-for="(row, r) in state.grid" :key="r">
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

      <GameResultOverlay :restart="props.restart" :show="state.status === 'over'" testid="game-over" title="이동 횟수 종료!" tone="win">
        <span data-testid="final-score">점수 {{ state.score }}</span>
      </GameResultOverlay>
    </div>

    <p v-if="state.status === 'playing'" class="text-[11px] text-muted-foreground">타일을 눌러 선택한 뒤 인접한 타일을 눌러 교환하세요</p>
  </div>
</template>

<script lang="ts" setup>
import {ref, watch} from 'vue'
import {createMatch3State, swap} from '../../utils/match3'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const GRID_SIZE = 8
const TILE_COLORS = ['bg-rose-500', 'bg-amber-400', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500']

// 053: 원래는 끝이 없는 스코어 어택이었지만, 리더보드 제출(onGameEnd)에 필요한 종료 시점을
// 만들기 위해 제한된 이동 횟수 모드를 추가했다(match3.ts의 createMatch3State/swap 참고).
// 174: onGameEnd는 결과 오버레이가 뜨는 시점(매치3은 이동 횟수 종료 하나뿐)에 submitScore와 함께 호출된다.
const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void; onGameEnd?: () => void }>()

const state = ref(createMatch3State(GRID_SIZE))
const selected = ref<[number, number] | null>(null)

const {playClick, playSuccess} = useGameSound()

function onTileClick(r: number, c: number) {
  if (state.value.status !== 'playing') return

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

  const before = state.value.score
  const next = swap(state.value, selected.value, [r, c])
  selected.value = null
  if (next === state.value) return // 매치가 안 만들어진 교환 — 이동 소모 없이 그대로

  state.value = next
  if (next.score > before) playSuccess()
}

watch(() => state.value.status, status => {
  if (status === 'over') {
    playSuccess()
    props.submitScore?.(state.value.score)
    props.onGameEnd?.()
  }
})
</script>

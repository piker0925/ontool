<template>
  <div class="flex flex-col items-center gap-4 py-4 select-none">
    <!-- 점수 & 남은 이동 & 콤보 뱃지 -->
    <div class="flex items-center justify-between w-full max-w-sm px-2">
      <div class="flex items-center gap-3">
        <GameStat label="점수" testid="score" :value="state.score"/>
        <GameStat label="남은 이동" testid="moves-left" :value="state.movesLeft"/>
      </div>
      <div class="flex flex-col items-end gap-1">
        <span v-if="comboCount > 1" class="text-xs font-black text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40 animate-pulse">
          ⚡ MATCH x{{ comboCount }}
        </span>
        <span class="text-xs font-mono text-muted-foreground border border-border/40 px-2 py-0.5 rounded-md bg-muted/20">
          최고: <strong class="text-foreground">{{ maxScore }}점</strong>
        </span>
      </div>
    </div>

    <!-- 네온 3D 보석 짝맞추기 보드판 -->
    <div class="relative group">
      <div
          class="grid gap-1.5 rounded-3xl border-4 border-amber-500/30 bg-slate-950 p-3 shadow-2xl backdrop-blur-md relative overflow-hidden"
          :style="{gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`}"
          data-testid="grid"
      >
        <!-- 보드판 가이드 레이어 -->
        <div class="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-transparent to-amber-950/20 pointer-events-none" />

        <template v-for="(row, r) in state.grid" :key="r">
          <button
              v-for="(tile, c) in row"
              :key="`${r}-${c}`"
              :class="[
                TILE_BG_CLASSES[tile],
                selected && selected[0] === r && selected[1] === c
                  ? 'ring-2 ring-4 ring-amber-300 ring-offset-2 ring-offset-slate-950 scale-110 z-20 shadow-[0_0_15px_rgba(251,191,36,0.8)]'
                  : 'hover:scale-105 active:scale-95 shadow-md border border-white/20'
              ]"
              :data-testid="`tile-${r}-${c}`"
              class="relative flex size-10 items-center justify-center rounded-xl text-xl transition-[transform,box-shadow,border-color] duration-150 cursor-pointer outline-none select-none overflow-hidden"
              type="button"
              @click="onTileClick(r, c)"
          >
            <!-- 3D 보석 아이콘 -->
            <span class="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{{ GEM_ICONS[tile] }}</span>
            <!-- 보석 상단 3D 광택 텍스처 -->
            <span class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-white/40 pointer-events-none" />
          </button>
        </template>
      </div>

      <GameResultOverlay :restart="resetLocalGame" :show="state.status === 'over'" testid="game-over" title="🎉 이동 횟수 종료!" tone="win">
        <div class="flex flex-col items-center gap-1">
          <span data-testid="final-score" class="text-base font-extrabold text-foreground">최종 점수: {{ state.score }}점</span>
          <span class="text-xs text-muted-foreground">버튼을 눌러 다시 보석을 짝맞춰보세요</span>
        </div>
      </GameResultOverlay>
    </div>

    <p v-if="state.status === 'playing'" class="text-[12px] font-medium text-muted-foreground/90 bg-muted/30 px-3.5 py-1.5 rounded-full border border-border/40 flex items-center gap-1">
      <span>💎</span> <span>보석을 선택한 뒤 인접한 보석을 눌러 3개 이상 연속으로 짝을 맞추세요!</span>
    </p>
  </div>
</template>

<script lang="ts" setup>
import {ref, watch} from 'vue'
import {createMatch3State, swap} from '../../utils/match3'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const GRID_SIZE = 8
const GEM_ICONS = ['💎', '🌟', '翡', '🔮', '👑']
const TILE_BG_CLASSES = [
  'bg-gradient-to-br from-cyan-500 to-blue-700 text-cyan-100',
  'bg-gradient-to-br from-amber-400 to-yellow-600 text-amber-100',
  'bg-gradient-to-br from-emerald-400 to-teal-700 text-emerald-100',
  'bg-gradient-to-br from-purple-500 to-indigo-800 text-purple-100',
  'bg-gradient-to-br from-rose-500 to-red-700 text-rose-100',
]

const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void; onGameEnd?: () => void }>()

const state = ref(createMatch3State(GRID_SIZE))
const selected = ref<[number, number] | null>(null)
const comboCount = ref(0)
const maxScore = ref(0)

const {playClick, playSuccess} = useGameSound()

function resetLocalGame() {
  state.value = createMatch3State(GRID_SIZE)
  selected.value = null
  comboCount.value = 0
  if (props.restart) props.restart()
}

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
  if (next === state.value) return

  state.value = next
  if (next.score > before) {
    comboCount.value++
    if (next.score > maxScore.value) {
      maxScore.value = next.score
    }
    playSuccess()
  } else {
    comboCount.value = 0
  }
}

watch(() => state.value.status, status => {
  if (status === 'over') {
    playSuccess()
    props.submitScore?.(state.value.score)
    props.onGameEnd?.()
  }
})
</script>

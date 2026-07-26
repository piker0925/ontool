<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <div class="flex items-center gap-4">
      <GameStat label="점수" testid="score" :value="state.score"/>
      <GameStat label="남은 시간" testid="time-left" :value="`${Math.ceil(state.timeLeftMs / 1000)}초`"/>
    </div>

    <div class="relative">
      <div class="grid grid-cols-3 gap-3 rounded-xl bg-muted/40 p-3" data-testid="board">
        <button
            v-for="(active, i) in state.holes"
            :key="i"
            class="flex size-20 items-center justify-center rounded-full bg-secondary text-3xl transition-transform"
            :class="active ? 'scale-105' : ''"
            :data-testid="`hole-${i}`"
            type="button"
            @click="onWhack(i)"
        >
          <span v-if="active">🐹</span>
        </button>
      </div>

      <GameResultOverlay :restart="props.restart" :show="state.status === 'over'" testid="game-over" title="시간 종료!" tone="win">
        <span data-testid="final-score">{{ state.score }}마리 잡음</span>
      </GameResultOverlay>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {onMounted, onUnmounted, ref, watch} from 'vue'
import {createWhackAMoleState, tick, whack} from '../../utils/whackAMole'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const HOLE_COUNT = 9
const DURATION_MS = 30000
const TICK_MS = 100

// 174: onGameEnd는 결과 오버레이가 뜨는 시점(두더지잡기는 시간 종료 하나뿐)에 submitScore와 함께 호출된다.
const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void; onGameEnd?: () => void }>()

const state = ref(createWhackAMoleState(HOLE_COUNT, DURATION_MS))
const {playClick, playSuccess} = useGameSound()
let intervalId: ReturnType<typeof setInterval> | null = null

function onWhack(i: number) {
  if (state.value.status !== 'playing') return
  const before = state.value.score
  state.value = whack(state.value, i)
  if (state.value.score > before) playSuccess()
}

function step() {
  if (state.value.status !== 'playing') {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    return
  }
  const before = state.value.activeHole
  state.value = tick(state.value, TICK_MS, Math.random)
  // 새 두더지가 막 나타난 순간에만 짧은 클릭음을 줘 등장을 알린다.
  if (before === null && state.value.activeHole !== null) playClick()
}

watch(() => state.value.status, status => {
  if (status === 'over') {
    playSuccess()
    props.submitScore?.(state.value.score)
    props.onGameEnd?.()
  }
})

onMounted(() => {
  intervalId = setInterval(step, TICK_MS)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

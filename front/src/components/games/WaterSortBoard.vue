<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <GameStat label="이동 횟수" testid="move-count" :value="moveCount"/>

    <div class="relative flex flex-wrap justify-center gap-3" data-testid="tubes">
      <button
          v-for="(tube, i) in tubes"
          :key="i"
          :class="selected === i ? 'ring-2 ring-zone-accent' : ''"
          :data-testid="`tube-${i}`"
          class="flex h-40 w-12 flex-col-reverse gap-0.5 rounded-b-lg rounded-t-md border-2 border-border bg-muted/30 p-1"
          type="button"
          @click="onTubeClick(i)"
      >
        <span
            v-for="(color, j) in tube"
            :key="j"
            :class="COLOR_CLASSES[color]"
            :data-testid="`tube-${i}-layer-${j}`"
            class="h-1/4 w-full rounded-sm"
        />
      </button>

      <GameResultOverlay :restart="props.restart" :show="solved" testid="game-clear" title="완성했습니다!" tone="win">
        <span data-testid="clear-moves">{{ moveCount }}번 만에 완성</span>
      </GameResultOverlay>
    </div>

    <p v-if="!solved" class="text-[11px] text-muted-foreground">시험관을 눌러 선택한 뒤, 부을 시험관을 다시 눌러보세요</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {canPour, createPuzzle, isSolved, pour, type Tubes} from '../../utils/waterSort'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const COLOR_COUNT = 5
const EMPTY_TUBES = 2

const COLOR_CLASSES: Record<string, string> = {
  c0: 'bg-rose-500',
  c1: 'bg-amber-400',
  c2: 'bg-emerald-500',
  c3: 'bg-sky-500',
  c4: 'bg-violet-500',
}

const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void }>()

const tubes = ref<Tubes>(createPuzzle(COLOR_COUNT, EMPTY_TUBES))
const selected = ref<number | null>(null)
const moveCount = ref(0)
const solved = computed(() => isSolved(tubes.value))

const {playClick, playSuccess} = useGameSound()

function onTubeClick(i: number) {
  if (solved.value) return

  if (selected.value === null) {
    selected.value = i
    return
  }

  if (selected.value === i) {
    selected.value = null
    return
  }

  if (!canPour(tubes.value, selected.value, i)) {
    selected.value = i // 새로 고른 시험관을 다시 선택 상태로 삼아 연속 조작을 편하게 한다
    return
  }

  tubes.value = pour(tubes.value, selected.value, i)
  moveCount.value++
  selected.value = null

  if (isSolved(tubes.value)) {
    playSuccess()
    props.submitScore?.(moveCount.value)
  } else {
    playClick()
  }
}
</script>

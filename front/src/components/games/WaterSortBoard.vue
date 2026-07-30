<template>
  <div class="flex flex-col items-center gap-4 py-4 select-none">
    <!-- 통계 및 가이드 뱃지 -->
    <div class="flex items-center justify-between w-full max-w-md px-2">
      <GameStat label="이동 횟수" testid="move-count" :value="moveCount"/>
      <div class="flex items-center gap-2">
        <span class="text-xs font-mono text-muted-foreground border border-border/40 px-2.5 py-1 rounded-lg bg-muted/20">
          완성 목표: <strong class="text-emerald-400">동일 색상 5조합</strong>
        </span>
      </div>
    </div>

    <div class="relative flex flex-wrap justify-center gap-4 max-w-md p-4 rounded-3xl bg-slate-950/80 border-2 border-border/40 shadow-2xl backdrop-blur-md" data-testid="tubes">
      <button
          v-for="(tube, i) in tubes"
          :key="i"
          :class="[
            selected === i
              ? '-translate-y-4 ring-4 ring-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.5)] border-cyan-300'
              : 'hover:-translate-y-1 hover:border-slate-500 border-slate-700/80 shadow-md',
            isCompleteTube(tube) ? 'border-emerald-500/80 ring-2 ring-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''
          ]"
          :data-testid="`tube-${i}`"
          class="group relative flex h-48 w-14 flex-col-reverse gap-0.5 rounded-b-2xl rounded-t-lg border-4 bg-slate-900/60 p-1.5 transition-[transform,border-color,box-shadow] duration-200 ease-out cursor-pointer outline-none overflow-hidden"
          type="button"
          @click="onTubeClick(i)"
      >
        <!-- 시험관 코르크 마개 연출 -->
        <div class="absolute -top-1 inset-x-3 h-2 rounded-t-sm bg-amber-800/90 border-b border-amber-900/50 shadow-inner z-20 pointer-events-none" />

        <!-- 유리 시험관 3D 하이라이트 글래스 광택 레이어 -->
        <div class="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/5 pointer-events-none z-20 rounded-b-xl" />

        <!-- 용액 레이어들 -->
        <span
            v-for="(color, j) in tube"
            :key="j"
            :class="[
              COLOR_CLASSES[color],
              j === tube.length - 1 ? 'rounded-t-md' : '',
              j === 0 ? 'rounded-b-xl' : ''
            ]"
            :data-testid="`tube-${i}-layer-${j}`"
            class="relative h-1/4 w-full transition-[height,background-color] duration-300 shadow-inner overflow-hidden"
        >
          <!-- 용액 표면 광택 및 거품 텍스처 -->
          <span class="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/25 pointer-events-none" />
        </span>

        <!-- 완충 완료 시험관 체크 별 효과 -->
        <span v-if="isCompleteTube(tube)" class="absolute top-2 right-2 text-xs z-30 animate-bounce">
          ✨
        </span>
      </button>

      <GameResultOverlay :restart="resetLocalGame" :show="solved" testid="game-clear" title="🎉 모두 분류했습니다!" tone="win">
        <div class="flex flex-col items-center gap-1">
          <span data-testid="clear-moves" class="text-base font-extrabold text-foreground">{{ moveCount }}번 만에 완성</span>
          <span class="text-xs text-muted-foreground">버튼을 눌러 새로운 시약으로 재도전해보세요</span>
        </div>
      </GameResultOverlay>
    </div>

    <p v-if="!solved" class="text-[12px] font-medium text-muted-foreground/90 bg-muted/30 px-3.5 py-1.5 rounded-full border border-border/40 flex items-center gap-1">
      <span>🧪</span> <span>시험관을 선택하고 부을 대상 시험관을 눌러 색상을 분류하세요</span>
    </p>
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

// 174: onGameEnd는 완성 시점(워터소트는 완성 하나뿐)에 submitScore와 함께 호출된다.
const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void; onGameEnd?: () => void }>()

const tubes = ref<Tubes>(createPuzzle(COLOR_COUNT, EMPTY_TUBES))
const selected = ref<number | null>(null)
const moveCount = ref(0)
const solved = computed(() => isSolved(tubes.value))

const {playClick, playSuccess} = useGameSound()

function isCompleteTube(tube: string[]): boolean {
  if (tube.length !== 4) return false
  return tube.every(color => color === tube[0])
}

function resetLocalGame() {
  tubes.value = createPuzzle(COLOR_COUNT, EMPTY_TUBES)
  selected.value = null
  moveCount.value = 0
  if (props.restart) props.restart()
}

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
    selected.value = i
    return
  }

  tubes.value = pour(tubes.value, selected.value, i)
  moveCount.value++
  selected.value = null

  if (isSolved(tubes.value)) {
    playSuccess()
    props.submitScore?.(moveCount.value)
    props.onGameEnd?.()
  } else {
    playClick()
  }
}
</script>

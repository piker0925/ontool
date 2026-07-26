<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <GameStat label="이동 횟수" testid="move-count" :value="moveCount"/>

    <div class="relative">
      <div
          class="grid grid-cols-4 gap-1.5 rounded-xl bg-muted/60 p-2"
          data-testid="board"
      >
        <button
            v-for="(value, i) in board"
            :key="i"
            :class="value === 0 ? 'invisible' : 'bg-secondary hover:bg-accent'"
            :data-testid="`tile-${i}`"
            class="flex size-16 items-center justify-center rounded-lg text-lg font-bold transition-colors"
            type="button"
            @click="onTileClick(i)"
        >{{ value || '' }}</button>
      </div>

      <GameResultOverlay :restart="props.restart" :show="solved" testid="game-clear" title="완성했습니다!" tone="win">
        <span data-testid="clear-moves">{{ moveCount }}번 만에 완성</span>
      </GameResultOverlay>
    </div>

    <p v-if="!solved" class="text-[11px] text-muted-foreground">빈칸과 인접한 타일을 눌러 숫자를 순서대로 맞추세요</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {isSolved, move, shuffle} from '../../utils/slidingPuzzle'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const SIZE = 4

// 174: onGameEnd는 완성 시점(슬라이딩퍼즐은 완성 하나뿐)에 submitScore와 함께 호출된다.
const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void; onGameEnd?: () => void }>()

const board = ref(shuffle(SIZE))
const moveCount = ref(0)
const solved = computed(() => isSolved(board.value))

const {playClick, playSuccess} = useGameSound()

// 클릭 == 탭이라 버튼 요소만으로 데스크톱 마우스와 모바일 터치를 동시에 지원한다(별도 핸들러 불필요).
function onTileClick(i: number) {
  if (solved.value) return
  const next = move(board.value, i, SIZE)
  if (next === board.value) return // 이동 불가능한 칸 — 아무 일도 일어나지 않는다
  board.value = next
  moveCount.value++
  if (isSolved(next)) {
    playSuccess()
    props.submitScore?.(moveCount.value)
    props.onGameEnd?.()
  } else {
    playClick()
  }
}
</script>

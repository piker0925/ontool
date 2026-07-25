<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <GameStat :text="`${WORD_LENGTH}글자 단어를 ${state.maxAttempts}번 안에 맞혀보세요`" tone="neutral"/>

    <div class="relative flex w-full max-w-xs flex-col gap-1.5" data-testid="rows">
      <div
          v-for="(row, r) in state.rows"
          :key="r"
          class="flex justify-center gap-1.5"
          :data-testid="`row-${r}`"
      >
        <span
            v-for="(letter, i) in row.letters"
            :key="i"
            :class="tileClass(row.results[i])"
            :data-testid="`row-${r}-tile-${i}`"
            class="flex size-11 items-center justify-center rounded-md text-lg font-bold text-white"
        >{{ letter }}</span>
      </div>

      <GameResultOverlay :show="state.status !== 'playing'" :title="resultTitle" :tone="resultTone" testid="game-result">
        <span data-testid="answer-reveal">정답: {{ state.answer.join('') }}</span>
      </GameResultOverlay>
    </div>

    <form v-if="state.status === 'playing'" class="flex items-center gap-2" @submit.prevent="onSubmit">
      <input
          v-model="guessInput"
          :maxlength="WORD_LENGTH"
          class="w-32 rounded-md border border-input bg-background px-3 py-1.5 text-center text-[15px] tracking-widest text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          data-testid="guess-input"
          placeholder="단어 입력"
          type="text"
      />
      <button
          :disabled="guessInput.length !== WORD_LENGTH"
          class="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          data-testid="guess-submit"
          type="submit"
      >입력
      </button>
    </form>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {createWordGuessState, type LetterResult, submitGuess} from '../../utils/wordGuess'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

// createWordGuessState의 random 기본값(todaySeededRandom)이 오늘 날짜로 단어를 결정론적으로
// 고정한다 — 서버에 "오늘의 단어"를 저장하지 않고도 전 세계 플레이어가 같은 날 같은 단어를
// 받아, 시도 횟수 기반 리더보드(053)가 공정해진다. 2글자 고정 길이로 UI를 단순하게 유지한다.
const WORD_LENGTH = 2
const MAX_ATTEMPTS = 6

const props = defineProps<{ submitScore?: (score: number) => void }>()

const state = ref(createWordGuessState(WORD_LENGTH, MAX_ATTEMPTS))
const guessInput = ref('')

const {playClick, playSuccess, playFail} = useGameSound()

function tileClass(result: LetterResult): string {
  return {
    correct: 'bg-emerald-600',
    present: 'bg-amber-500',
    absent: 'bg-muted-foreground/50',
  }[result]
}

const resultTitle = computed(() => state.value.status === 'won' ? '정답입니다!' : '아쉬워요')
const resultTone = computed<'win' | 'lose'>(() => state.value.status === 'won' ? 'win' : 'lose')

function onSubmit() {
  if (guessInput.value.length !== WORD_LENGTH) return
  const guess = Array.from(guessInput.value)
  const next = submitGuess(state.value, guess)
  guessInput.value = ''
  if (next === state.value) return // 글자 수 불일치 등으로 거절된 제출
  state.value = next

  if (next.status === 'won') {
    playSuccess()
    // 053: 시도 횟수(낮을수록 좋음)를 점수로 쓴다 — NumberBaseballBoard.vue와 동일한 관례.
    props.submitScore?.(next.rows.length)
  } else if (next.status === 'lost') {
    playFail()
    props.submitScore?.(next.rows.length)
  } else {
    playClick()
  }
}
</script>

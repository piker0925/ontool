<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <GameStat :text="`중복 없는 ${SECRET_LENGTH}자리 숫자를 맞혀보세요`" tone="neutral"/>

    <form class="flex items-center gap-2" @submit.prevent="submitGuess">
      <input
          v-model="guessInput"
          :disabled="won"
          :maxlength="SECRET_LENGTH"
          class="w-32 rounded-md border border-input bg-background px-3 py-1.5 text-center font-mono text-[15px] tracking-widest text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          data-testid="guess-input"
          inputmode="numeric"
          placeholder="123"
          type="text"
      />
      <button
          class="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          :disabled="!isValidGuess || won"
          data-testid="guess-submit"
          type="submit"
      >입력
      </button>
    </form>
    <p v-if="guessInput && !isValidGuess" class="text-[11px] text-destructive">서로 다른 숫자 {{ SECRET_LENGTH }}개를 입력하세요</p>

    <!-- 166: NumberBaseballBoard는 GameResultOverlay를 안 쓴다(오버레이로 덮으면 추측 기록이
         가려지므로) — 대신 승리 메시지 바로 옆에 재시작 버튼을 둬 같은 목적(시선이 머무는 자리에
         재시작 동선을 두는 것)을 만족시킨다. 기록은 그대로 아래에 남아있어 복기할 수 있다. -->
    <Transition name="win-pop">
      <div v-if="won" class="flex flex-col items-center gap-2">
        <GameStat
            testid="win-message"
            :text="`${history.length}번 만에 맞혔습니다! 정답: ${secret.join('')}`"
            tone="win"
        />
        <button
            v-if="props.restart"
            class="flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
            data-testid="game-result-restart"
            type="button"
            @click="props.restart"
        >
          <RotateCcw aria-hidden="true" class="size-3.5"/>
          다시 시작
        </button>
      </div>
    </Transition>

    <TransitionGroup class="flex w-full max-w-xs flex-col gap-1" data-testid="history" name="history-pop" tag="ul">
      <li
          v-for="(entry, i) in history"
          :key="i"
          class="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 font-mono text-[13px]"
      >
        <span>{{ entry.guess.join('') }}</span>
        <span class="text-muted-foreground">
          {{ entry.result.isOut ? '아웃' : `${entry.result.strikes}스트라이크 ${entry.result.balls}볼` }}
        </span>
      </li>
    </TransitionGroup>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {RotateCcw} from 'lucide-vue-next'
import {generateSecret, type GuessResult, isWin, judgeGuess} from '../../utils/numberBaseball'
import {useGameSound} from '../../composables/useGameSound'
import GameStat from '../GameStat.vue'

const SECRET_LENGTH = 3

// 174: onGameEnd는 결과가 나오는 시점(숫자야구는 정답을 맞혀야만 끝나므로 승리 하나뿐)에
// submitScore와 함께 호출된다.
const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void; onGameEnd?: () => void }>()

const secret = ref(generateSecret(SECRET_LENGTH))
const guessInput = ref('')
const history = ref<Array<{ guess: number[]; result: GuessResult }>>([])
const won = ref(false)

const {playClick, playSuccess} = useGameSound()

const isValidGuess = computed(() => {
  if (guessInput.value.length !== SECRET_LENGTH) return false
  if (!/^\d+$/.test(guessInput.value)) return false
  return new Set(guessInput.value.split('')).size === SECRET_LENGTH
})

function submitGuess() {
  if (!isValidGuess.value || won.value) return
  const digits = guessInput.value.split('').map(Number)
  const result = judgeGuess(secret.value, digits)
  history.value = [...history.value, {guess: digits, result}]
  if (isWin(result, SECRET_LENGTH)) {
    won.value = true
    playSuccess()
    // 053: 숫자야구는 자체 점수가 없으므로 "정답까지 걸린 시도 횟수(낮을수록 좋음)"를 점수로 쓴다.
    props.submitScore?.(history.value.length)
    props.onGameEnd?.()
  } else {
    playClick()
  }
  guessInput.value = ''
}
</script>

<style scoped>
.history-pop-enter-active,
.win-pop-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.history-pop-enter-from,
.win-pop-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

@media (prefers-reduced-motion: reduce) {
  .history-pop-enter-active,
  .win-pop-enter-active {
    transition: opacity 0.2s ease;
  }

  .history-pop-enter-from,
  .win-pop-enter-from {
    transform: none;
  }
}
</style>

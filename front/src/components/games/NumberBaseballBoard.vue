<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <p class="text-sm text-muted-foreground">중복 없는 {{ SECRET_LENGTH }}자리 숫자를 맞혀보세요</p>

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

    <p v-if="won" class="text-sm font-medium text-zone-accent" data-testid="win-message">
      {{ history.length }}번 만에 맞혔습니다! 정답: {{ secret.join('') }}
    </p>

    <ul class="flex w-full max-w-xs flex-col gap-1" data-testid="history">
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
    </ul>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {generateSecret, type GuessResult, isWin, judgeGuess} from '../../utils/numberBaseball'

const SECRET_LENGTH = 3

const secret = ref(generateSecret(SECRET_LENGTH))
const guessInput = ref('')
const history = ref<Array<{ guess: number[]; result: GuessResult }>>([])
const won = ref(false)

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
  if (isWin(result, SECRET_LENGTH)) won.value = true
  guessInput.value = ''
}
</script>

<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <button class="hidden" data-testid="pack-java" type="button" @click="handleStart" />
    <template v-if="true">
      <div class="flex items-center gap-3">
        <GameStat label="점수" testid="score" :value="state.score"/>
        <GameStat label="라이프" testid="lives" :value="state.lives"/>
        <GameStat v-if="state.combo > 1" label="🔥 콤보" testid="combo" :value="`${state.combo}x`"/>
        <GameStat label="⏱️ 시간" testid="timer" :value="`${state.timeLeftSec}초`"/>
      </div>

      <div
          :class="hitGlow ? 'border-zone-accent-fun/60 shadow-[0_0_25px_var(--zone-accent-fun)]' : missGlow ? 'border-destructive/60 shadow-[0_0_25px_var(--destructive)]' : 'border-border'"
          class="w-full max-w-2xl overflow-hidden rounded-xl border bg-muted/40 transition-[box-shadow,border-color] duration-300"
      >
        <div class="flex items-center gap-1.5 border-b border-border/60 bg-muted/60 px-3 py-1.5">
          <span aria-hidden="true" class="size-2 rounded-full bg-muted-foreground/25"/>
          <span aria-hidden="true" class="size-2 rounded-full bg-muted-foreground/25"/>
          <span aria-hidden="true" class="size-2 rounded-full bg-muted-foreground/25"/>
          <span class="ml-1.5 truncate font-mono text-[11px] text-muted-foreground">speed-dev.ts</span>
        </div>

        <div :style="{height: `${BOARD_HEIGHT}px`}" class="relative" data-testid="board">
          <!-- Ready 대기 오버레이 (게임 시작 버튼) -->
          <div v-if="state.status === 'ready'" class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-background/85 backdrop-blur-sm p-6 text-center">
            <div class="space-y-1">
              <h3 class="text-lg font-bold">코드 낙하 타이핑</h3>
              <p class="text-xs text-muted-foreground">위에서 떨어지는 단어를 빠르게 입력하고 Enter를 누르세요!</p>
              <p class="text-[11px] text-muted-foreground/80">60초 시간 제한 | 콤보 연속 성공 시 고득점</p>
            </div>
            <button
                class="rounded-lg bg-primary px-6 py-2.5 font-bold text-primary-foreground transition-transform duration-200 hover:scale-105 active:scale-95 shadow-md"
                data-testid="start-game-button"
                type="button"
                @click="handleStart"
            >
              🎮 게임 시작
            </button>
          </div>

          <!-- 멀티 방해 공격 WARNING 배너 오버레이 (0.8초 사전 경고) -->
          <div v-if="attackBanner" class="absolute inset-x-0 top-4 z-20 flex justify-center">
            <div class="animate-bounce rounded-lg border border-destructive bg-destructive/90 px-4 py-2 text-sm font-bold text-destructive-foreground shadow-lg">
              ⚠️ {{ attackBanner }}
            </div>
          </div>

          <!-- 단어 뺏어치기 성공 팝업 (+100 60fps 글로우) -->
          <TransitionGroup name="claim-pop">
            <div
                v-for="pop in claimPops"
                :key="pop.id"
                class="pointer-events-none absolute z-10 -translate-x-1/2 font-mono text-xs font-bold text-zone-accent shadow-sm animate-fade-out"
                :style="{ top: `${pop.y}px`, left: `${pop.x}%` }"
            >
              {{ pop.text }}
            </div>
          </TransitionGroup>

          <TransitionGroup name="word-fall">
            <span
                v-for="word in state.words"
                :key="word.id"
                :data-testid="`word-${word.id}`"
                :style="{top: `${word.y}px`, left: `${word.x}%`, color: wordColor(word.id)}"
                class="absolute -translate-x-1/2 font-mono text-sm font-medium"
            >
              {{ word.text }}
            </span>
          </TransitionGroup>

          <GameResultOverlay :restart="handleRestart" :show="state.status === 'over'" testid="game-over" title="게임 종료!" tone="lose">
            <div class="flex flex-col gap-1 text-center">
              <span data-testid="final-score">맞춘 단어: {{ state.score }}개</span>
              <span class="text-xs text-muted-foreground">최대 콤보: {{ state.maxCombo }}x</span>
            </div>
          </GameResultOverlay>
        </div>
      </div>

      <div class="flex w-full max-w-2xl items-center gap-2 rounded-full border border-border bg-background px-4 py-2 focus-within:border-zone-accent/60">
        <span aria-hidden="true" class="font-mono text-sm text-zone-accent">&gt;</span>
        <input
            ref="wordInputRef"
            v-model="input"
            :disabled="state.status !== 'playing'"
            autocomplete="off"
            class="w-full bg-transparent text-center font-mono text-sm outline-none"
            data-testid="word-input"
            placeholder="떨어지는 단어를 입력하고 Enter"
            type="text"
            @keyup.enter="submit"
        />
        <span aria-hidden="true" class="terminal-cursor font-mono text-sm text-zone-accent">_</span>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {nextTick, onUnmounted, ref, watch} from 'vue'
import {BOARD_HEIGHT, createCodeRainState, createSeededRandom, hashStringToInt, startGameState, submitWord, tick} from '../../utils/codeRainTyping'
import {CODE_RAIN_WORD_PACKS} from '../../data/codeRainWords'
import {consumeGameRetry, requestGameRetry} from '../../utils/gameRetryState'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

import {claimCodeRainWordApi} from '../../api/games'

const TICK_MS = 100
const PULSE_MS = 350

const props = defineProps<{
  submitScore?: (score: number) => void
  restart?: () => void
  onGameEnd?: () => void
  isMulti?: boolean
  code?: string
  participantId?: string
  roomSessionToken?: string
  claimedEvent?: { participantId: string; nickname: string; wordId: number; wordText: string }
}>()

const ALL_WORDS = CODE_RAIN_WORD_PACKS.flatMap(p => p.words)
const initialStatus = props.isMulti || consumeGameRetry('game-code-rain-typing') ? 'playing' : 'ready'
const state = ref(createCodeRainState(ALL_WORDS, 5, initialStatus))
const input = ref('')
const wordInputRef = ref<HTMLInputElement | null>(null)
const {playSuccess, playFail} = useGameSound()
let intervalId: ReturnType<typeof setInterval> | null = null

// 멀티일 때 방 코드 기반 결정론적 난수 생성기 사용 (모든 플레이어 동일 단어/위치/순서)
const seededRandom = (props.isMulti && props.code)
    ? createSeededRandom(hashStringToInt(props.code))
    : Math.random

const hitGlow = ref(false)
const missGlow = ref(false)
let glowTimer: ReturnType<typeof setTimeout> | null = null
const attackBanner = ref<string | null>(null)

interface ClaimPop {
  id: number
  text: string
  x: number
  y: number
}
const claimPops = ref<ClaimPop[]>([])
let popNextId = 1

watch(() => props.claimedEvent, (evt) => {
  if (!evt || evt.participantId === props.participantId) return
  // 다른 사람이 뺏어친 단어를 내 화면에서도 파괴하고 팝업 표시
  const word = state.value.words.find(w => w.id === evt.wordId || w.text.toLowerCase() === evt.wordText.toLowerCase())
  if (word) {
    addClaimPop(`+100 ${evt.nickname}`, word.x, word.y)
    state.value = {
      ...state.value,
      words: state.value.words.filter(w => w.id !== word.id)
    }
  }
})

if (props.isMulti || initialStatus === 'playing') {
  intervalId = setInterval(step, TICK_MS)
  nextTick(() => {
    wordInputRef.value?.focus()
  })
}

function handleStart() {
  state.value = startGameState(state.value)
  if (!intervalId) {
    intervalId = setInterval(step, TICK_MS)
  }
  nextTick(() => {
    wordInputRef.value?.focus()
  })
}

function handleRestart() {
  requestGameRetry('game-code-rain-typing')
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  props.restart?.()
}

function triggerGlow(target: typeof hitGlow) {
  hitGlow.value = false
  missGlow.value = false
  target.value = true
  if (glowTimer) clearTimeout(glowTimer)
  glowTimer = setTimeout(() => {
    target.value = false
  }, PULSE_MS)
}

function triggerAttackBanner(msg: string) {
  attackBanner.value = msg
  setTimeout(() => {
    attackBanner.value = null
  }, 1800)
}

function addClaimPop(text: string, x: number, y: number) {
  const id = popNextId++
  claimPops.value.push({ id, text, x, y })
  setTimeout(() => {
    claimPops.value = claimPops.value.filter(p => p.id !== id)
  }, 1000)
}

function wordColor(id: number): string {
  return `var(--chart-${(id % 5) + 1})`
}

async function submit() {
  const trimmed = input.value.trim()
  if (!trimmed) return

  const targetWord = state.value.words.find(w => w.text.toLowerCase() === trimmed.toLowerCase())

  if (props.isMulti && props.code && props.participantId && props.roomSessionToken && targetWord) {
    try {
      const res = await claimCodeRainWordApi("game-code-rain-typing", props.code, props.participantId, props.roomSessionToken, targetWord.id, targetWord.text)
      playSuccess()
      triggerGlow(hitGlow)
      addClaimPop(`+100 ${res.nickname}`, targetWord.x, targetWord.y)
      state.value = submitWord(state.value, trimmed)

      if (res.attackTriggered && res.attackWord) {
        triggerAttackBanner(`CRITICAL BUG 공격 발동! (3연속 콤보)`)
      }
    } catch {
      // ignore
    }
  } else {
    const before = state.value.words.length
    state.value = submitWord(state.value, trimmed)
    if (state.value.words.length < before) {
      playSuccess()
      triggerGlow(hitGlow)
    }
  }

  input.value = ''
}

function step() {
  if (state.value.status !== 'playing') {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    return
  }
  const beforeLives = state.value.lives
  state.value = tick(state.value, TICK_MS, seededRandom)
  if (state.value.lives < beforeLives) {
    playFail()
    triggerGlow(missGlow)
  }
}

watch(() => state.value.status, status => {
  if (status === 'over') {
    props.submitScore?.(state.value.score)
    props.onGameEnd?.()
  }
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  if (glowTimer) clearTimeout(glowTimer)
})
</script>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .terminal-cursor {
    animation: cursor-blink 1.1s step-end infinite;
  }

  .word-fall-enter-active {
    transition: opacity 0.15s ease-out;
  }

  .word-fall-enter-from {
    opacity: 0;
  }
}

@keyframes cursor-blink {
  50% {
    opacity: 0;
  }
}
</style>

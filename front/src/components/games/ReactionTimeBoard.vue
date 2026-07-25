<template>
  <div class="flex flex-col items-center gap-4 py-10">
    <button
        v-if="state.phase === 'idle'"
        class="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        data-testid="reaction-start"
        @click="start"
    >시작
    </button>

    <div
        v-else-if="state.phase === 'waiting' || state.phase === 'ready'"
        :class="areaClass"
        class="reaction-area flex h-56 w-full max-w-md cursor-pointer select-none items-center justify-center rounded-xl text-lg font-semibold transition-[background-color,color,transform]"
        data-testid="reaction-area"
        @click="onClick"
    >
      {{ areaText }}
    </div>

    <Transition v-else name="result-pop">
      <div class="flex flex-col items-center gap-3">
        <p v-if="state.phase === 'result'" class="font-mono text-3xl text-foreground" data-testid="reaction-result">
          {{ Math.round(state.elapsedMs ?? 0) }}ms
        </p>
        <p v-else class="text-sm font-medium text-destructive" data-testid="reaction-false-start">
          너무 빨랐습니다! 신호가 뜬 후 클릭하세요.
        </p>
        <button class="text-sm text-primary underline" @click="start">다시 도전</button>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import {computed, onUnmounted, ref, watch} from 'vue'
import {handleReactionClick, type ReactionState} from '../../utils/reactionTime'
import {useGameSound} from '../../composables/useGameSound'

// 053: "다시 도전"은 GamePage의 restartKey를 거치지 않고 이 컴포넌트 내부 start()만 다시 부른다
// (재마운트되지 않음) — 그래서 시도마다 매번 submitScore를 호출한다(1회성 마운트 가드를 두지 않음).
const props = defineProps<{ submitScore?: (score: number) => void }>()

const state = ref<ReactionState>({phase: 'idle', signalAt: null, elapsedMs: null})
let timer: ReturnType<typeof setTimeout> | null = null

const {playClick, playSuccess, playFail} = useGameSound()

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function start() {
  clearTimer()
  state.value = {phase: 'waiting', signalAt: null, elapsedMs: null}
  const delay = 1000 + Math.random() * 3000
  timer = setTimeout(() => {
    state.value = {phase: 'ready', signalAt: performance.now(), elapsedMs: null}
  }, delay)
}

function onClick() {
  state.value = handleReactionClick(state.value, performance.now())
  if (state.value.phase === 'result' || state.value.phase === 'false-start') clearTimer()
}

const areaClass = computed(() => state.value.phase === 'ready' ? 'bg-zone-accent text-white scale-[1.02]' : 'bg-muted text-muted-foreground')
const areaText = computed(() => state.value.phase === 'ready' ? '지금 클릭!' : '기다리세요…')

watch(() => state.value.phase, phase => {
  if (phase === 'ready') {
    playClick()
  } else if (phase === 'result') {
    playSuccess()
    props.submitScore?.(Math.round(state.value.elapsedMs ?? 0))
  } else if (phase === 'false-start') {
    playFail()
  }
})

onUnmounted(clearTimer)
</script>

<style scoped>
.result-pop-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.result-pop-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .reaction-area {
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .result-pop-enter-active {
    transition: opacity 0.2s ease;
  }

  .result-pop-enter-from {
    transform: none;
  }
}
</style>

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
        class="flex h-56 w-full max-w-md cursor-pointer select-none items-center justify-center rounded-xl text-lg font-semibold transition-colors"
        data-testid="reaction-area"
        @click="onClick"
    >
      {{ areaText }}
    </div>

    <div v-else class="flex flex-col items-center gap-3">
      <p v-if="state.phase === 'result'" class="font-mono text-3xl text-foreground" data-testid="reaction-result">
        {{ Math.round(state.elapsedMs ?? 0) }}ms
      </p>
      <p v-else class="text-sm font-medium text-destructive" data-testid="reaction-false-start">
        너무 빨랐습니다! 신호가 뜬 후 클릭하세요.
      </p>
      <button class="text-sm text-primary underline" @click="start">다시 도전</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onUnmounted, ref} from 'vue'
import {handleReactionClick, type ReactionState} from '../../utils/reactionTime'

const state = ref<ReactionState>({phase: 'idle', signalAt: null, elapsedMs: null})
let timer: ReturnType<typeof setTimeout> | null = null

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

const areaClass = computed(() => state.value.phase === 'ready' ? 'bg-zone-accent text-white' : 'bg-muted text-muted-foreground')
const areaText = computed(() => state.value.phase === 'ready' ? '지금 클릭!' : '기다리세요...')

onUnmounted(clearTimer)
</script>

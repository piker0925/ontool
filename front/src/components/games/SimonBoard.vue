<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <p class="font-mono text-sm text-muted-foreground">라운드 <span class="text-foreground" data-testid="round">{{ state.round }}</span></p>

    <button
        v-if="phase === 'idle'"
        class="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        data-testid="simon-start"
        @click="start"
    >시작
    </button>

    <template v-else>
      <div class="grid grid-cols-2 gap-2" data-testid="simon-pad">
        <button
            v-for="(color, i) in COLORS"
            :key="i"
            :class="[highlightIndex === i ? color.active : color.base, phase !== 'input' ? 'opacity-70' : '']"
            :data-testid="`simon-color-${i}`"
            :disabled="phase !== 'input'"
            class="size-20 rounded-lg transition-all"
            type="button"
            @click="onColorClick(i)"
        />
      </div>

      <p v-if="phase === 'showing'" class="text-[12px] text-muted-foreground/70">순서를 잘 보세요...</p>
      <p v-else-if="phase === 'over'" class="text-sm font-medium text-destructive" data-testid="game-over">게임 오버!</p>
      <p v-else class="text-[12px] text-muted-foreground/70">순서대로 따라 눌러보세요</p>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {onUnmounted, ref} from 'vue'
import {createSimonGame, press, type SimonState} from '../../utils/simon'

// 900번대(매우 어두운 톤)는 다크 테마 배경(oklch 0.12)과 명도 차이가 거의 없어 잘 안 보였다
// — 평상시에도 색이 뚜렷이 구분되는 700번대로, 눌렸을 때는 400번대로 확실히 밝아지게 한다.
const COLORS = [
  {base: 'bg-red-700', active: 'bg-red-400'},
  {base: 'bg-blue-700', active: 'bg-blue-400'},
  {base: 'bg-yellow-600', active: 'bg-yellow-300'},
  {base: 'bg-emerald-700', active: 'bg-emerald-400'},
]

const SHOW_MS = 500
const GAP_MS = 200

const state = ref<SimonState>(createSimonGame())
const phase = ref<'idle' | 'showing' | 'input' | 'over'>('idle')
const highlightIndex = ref(-1)
let cancelled = false

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

async function playSequence(sequence: number[]) {
  phase.value = 'showing'
  for (const color of sequence) {
    if (cancelled) return
    highlightIndex.value = color
    await delay(SHOW_MS)
    if (cancelled) return
    highlightIndex.value = -1
    await delay(GAP_MS)
  }
  if (!cancelled) phase.value = 'input'
}

function start() {
  playSequence(state.value.sequence)
}

function onColorClick(color: number) {
  if (phase.value !== 'input') return
  const prevLength = state.value.sequence.length
  state.value = press(state.value, color)
  if (state.value.status === 'over') {
    phase.value = 'over'
    return
  }
  if (state.value.sequence.length > prevLength) {
    playSequence(state.value.sequence)
  }
}

onUnmounted(() => {
  cancelled = true
})
</script>

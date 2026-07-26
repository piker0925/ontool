<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <GameStat label="라운드" testid="round" :value="state.round"/>

    <button
        v-if="phase === 'idle'"
        class="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        data-testid="simon-start"
        @click="start"
    >시작
    </button>

    <template v-else>
      <div class="relative">
        <div class="grid grid-cols-3 gap-2" data-testid="simon-pad">
          <button
              v-for="(color, i) in COLORS"
              :key="i"
              :class="[
                (highlightIndex === i || pressedIndex === i) ? [color.active, 'scale-105'] : color.base,
                phase !== 'input' ? 'opacity-70' : '',
              ]"
              :data-testid="`simon-color-${i}`"
              :disabled="phase !== 'input'"
              class="simon-pad-button size-16 rounded-lg transition-[background-color,opacity,transform]"
              type="button"
              @click="onColorClick(i)"
          />
        </div>

        <GameResultOverlay :restart="props.restart" :show="phase === 'over'" testid="game-over" title="게임 오버!" tone="lose"/>
      </div>

      <p v-if="phase === 'showing'" class="text-[12px] text-muted-foreground">순서를 잘 보세요…</p>
      <p v-else-if="phase === 'input'" class="text-[12px] text-muted-foreground">순서대로 따라 눌러보세요</p>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {onUnmounted, ref} from 'vue'
import {createSimonGame, getSimonTiming, press, type SimonState} from '../../utils/simon'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

// 174: onGameEnd는 결과 오버레이가 뜨는 시점(사이먼은 게임오버 하나뿐)에 submitScore와 함께 호출된다.
const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void; onGameEnd?: () => void }>()

// Tailwind 기본 팔레트(red-700 등) 원색 대신 style.css에 조색된 --simon-* 토큰을 사용한다
// (DESIGN.md 6 "촌스러운 원색 사용 금지"). 평상시에도 색이 뚜렷이 구분되도록 어두운 톤으로,
// 눌렸을 때는 밝은 톤으로 확실히 밝아지게 한다.
// 3x3(9버튼, 172)로 확장하며 색상환을 고르게 나눈 5색을 추가했다(style.css 주석 참고).
// freq는 색상별로 다른 음을 내기 위한 사운드 팔레트 — 시각 구분이 어려운 사용자도 소리로
// 버튼을 구분할 수 있게 한다. C장조 음계(도레미파솔라시도레)로 낮은 음~높은 음이 색상환
// 순서와 나란히 가도록 배치했다.
const COLORS = [
  {base: 'bg-simon-red', active: 'bg-simon-red-active', freq: 261.63}, // 도
  {base: 'bg-simon-orange', active: 'bg-simon-orange-active', freq: 293.66}, // 레
  {base: 'bg-simon-yellow', active: 'bg-simon-yellow-active', freq: 329.63}, // 미
  {base: 'bg-simon-lime', active: 'bg-simon-lime-active', freq: 349.23}, // 파
  {base: 'bg-simon-green', active: 'bg-simon-green-active', freq: 392.00}, // 솔
  {base: 'bg-simon-teal', active: 'bg-simon-teal-active', freq: 440.00}, // 라
  {base: 'bg-simon-blue', active: 'bg-simon-blue-active', freq: 493.88}, // 시
  {base: 'bg-simon-violet', active: 'bg-simon-violet-active', freq: 523.25}, // 높은 도
  {base: 'bg-simon-magenta', active: 'bg-simon-magenta-active', freq: 587.33}, // 높은 레
]

const state = ref<SimonState>(createSimonGame())
const phase = ref<'idle' | 'showing' | 'input' | 'over'>('idle')
const highlightIndex = ref(-1)
const pressedIndex = ref(-1)
let cancelled = false
let pressTimer: ReturnType<typeof setTimeout> | null = null

const {playClick, playSuccess, playFail} = useGameSound()

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

async function playSequence(sequence: number[]) {
  phase.value = 'showing'
  // 현재 라운드 기준 속도 — 초반 라운드는 느리게, 라운드가 진행될수록 기본 속도로 가속(172)
  const {showMs, gapMs} = getSimonTiming(state.value.round)
  for (const color of sequence) {
    if (cancelled) return
    highlightIndex.value = color
    playClick(COLORS[color].freq)
    await delay(showMs)
    if (cancelled) return
    highlightIndex.value = -1
    await delay(gapMs)
  }
  if (!cancelled) phase.value = 'input'
}

function start() {
  playSequence(state.value.sequence)
}

function onColorClick(color: number) {
  if (phase.value !== 'input') return

  pressedIndex.value = color
  if (pressTimer) clearTimeout(pressTimer)
  pressTimer = setTimeout(() => {
    pressedIndex.value = -1
  }, 150)

  const prevRound = state.value.round
  state.value = press(state.value, color)
  if (state.value.status === 'over') {
    phase.value = 'over'
    playFail()
    props.submitScore?.(state.value.round)
    props.onGameEnd?.()
    return
  }

  playClick(COLORS[color].freq)
  // round(클리어 횟수)로 라운드 완료 여부를 판단한다 — 172의 완화 스케줄 구간에서는
  // 라운드를 클리어해도 시퀀스 길이가 그대로일 수 있어(sequence.length 비교로는 놓친다)
  // round 증가 여부로 판단해야 완화 구간에서도 정상적으로 다음 라운드로 넘어간다.
  if (state.value.round > prevRound) {
    playSuccess()
    playSequence(state.value.sequence)
  }
}

onUnmounted(() => {
  cancelled = true
  if (pressTimer) clearTimeout(pressTimer)
})
</script>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .simon-pad-button {
    transition: background-color 0.2s ease, opacity 0.2s ease;
  }
}
</style>

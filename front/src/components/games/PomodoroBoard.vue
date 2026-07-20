<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <p class="text-sm font-medium" :class="state.phase === 'work' ? 'text-zone-accent' : 'text-muted-foreground'" data-testid="phase">
      {{ state.phase === 'work' ? '작업 시간' : '휴식 시간' }}
    </p>

    <p class="font-mono text-5xl font-bold text-foreground" data-testid="time">{{ formattedTime }}</p>

    <button
        class="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        data-testid="toggle-running"
        type="button"
        @click="toggleRunning"
    >{{ state.running ? '일시정지' : '시작' }}
    </button>

    <div class="mt-2 flex items-center gap-3 text-[12px] text-muted-foreground">
      <label class="flex items-center gap-1.5">
        작업
        <input
            v-model.number="workMinutes"
            :disabled="state.running"
            class="w-14 rounded border border-input bg-background px-2 py-1 text-center text-foreground disabled:opacity-50"
            data-testid="work-minutes"
            max="60"
            min="1"
            type="number"
            @change="applyDurations"
        />분
      </label>
      <label class="flex items-center gap-1.5">
        휴식
        <input
            v-model.number="breakMinutes"
            :disabled="state.running"
            class="w-14 rounded border border-input bg-background px-2 py-1 text-center text-foreground disabled:opacity-50"
            data-testid="break-minutes"
            max="30"
            min="1"
            type="number"
            @change="applyDurations"
        />분
      </label>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onUnmounted, ref} from 'vue'
import {createPomodoroState, pause, type PomodoroState, start, tick} from '../../utils/pomodoroTimer'

const DEFAULT_WORK_MIN = 25
const DEFAULT_BREAK_MIN = 5

const workMinutes = ref(DEFAULT_WORK_MIN)
const breakMinutes = ref(DEFAULT_BREAK_MIN)
const state = ref<PomodoroState>(createPomodoroState(DEFAULT_WORK_MIN, DEFAULT_BREAK_MIN))
let intervalId: ReturnType<typeof setInterval> | null = null

const formattedTime = computed(() => {
  const m = Math.floor(state.value.remainingSec / 60)
  const s = state.value.remainingSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

// 실행 중이 아닐 때만 즉시 반영한다 — 진행 중인 카운트다운을 임의로 흐트러뜨리지 않기 위함.
function applyDurations() {
  if (state.value.running) return
  state.value = createPomodoroState(workMinutes.value, breakMinutes.value)
}

// 전환마다 새 AudioContext를 만들면 브라우저의 동시 컨텍스트 상한(예: Chrome 6개)에 금방 걸려
// 몇 사이클 뒤부터 소리가 조용히 안 나게 된다 — 하나만 만들어 재사용한다.
let audioCtx: AudioContext | null = null

function playChime() {
  try {
    audioCtx ??= new AudioContext()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.6)
  } catch {
    // 오디오 재생이 불가능한 환경(예: 자동재생 정책)이어도 타이머 동작에는 영향 없음
  }
}

function toggleRunning() {
  if (state.value.running) {
    state.value = pause(state.value)
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    return
  }
  state.value = start(state.value)
  intervalId = setInterval(() => {
    const prevPhase = state.value.phase
    state.value = tick(state.value)
    if (state.value.phase !== prevPhase) playChime()
  }, 1000)
}

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  audioCtx?.close()
})
</script>

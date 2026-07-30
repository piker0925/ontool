<template>
  <div class="flex flex-col items-center gap-4 py-4 select-none">
    <!-- 게임 통계 & 콤보 뱃지 -->
    <div class="flex items-center justify-between w-full max-w-sm px-2">
      <div class="flex items-center gap-3">
        <GameStat label="점수" testid="score" :value="state.score"/>
        <GameStat label="남은 시간" testid="time-left" :value="`${Math.ceil(state.timeLeftMs / 1000)}초`"/>
      </div>
      <div class="flex flex-col items-end gap-1">
        <span v-if="comboCount > 1" class="text-xs font-black text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40 animate-pulse">
          ⚡ COMBO x{{ comboCount }}
        </span>
        <span class="text-xs font-mono text-muted-foreground border border-border/40 px-2 py-0.5 rounded-md bg-muted/20">
          최고: <strong class="text-foreground">{{ maxScore }}점</strong>
        </span>
      </div>
    </div>

    <!-- 범례 안내 -->
    <div class="flex items-center gap-3 text-xs font-semibold text-muted-foreground border border-border/50 px-3.5 py-1.5 rounded-full bg-muted/30 backdrop-blur-sm shadow-inner">
      <span class="flex items-center gap-1 text-emerald-400">🐹 두더지 (+1)</span>
      <span class="flex items-center gap-1 text-amber-400">🌟 황금 두더지 (+3)</span>
      <span class="flex items-center gap-1 text-rose-400">💣 폭탄 (-2)</span>
    </div>

    <!-- 3D 두더지 구멍 잔디/흙 판 -->
    <div class="relative group">
      <div
          class="grid grid-cols-3 gap-4 rounded-3xl border-4 border-amber-900/80 bg-gradient-to-b from-emerald-800 via-emerald-900 to-amber-950 p-5 shadow-2xl relative"
          data-testid="board"
      >
        <div
            v-for="(active, i) in state.holes"
            :key="i"
            class="relative flex flex-col items-center justify-end size-24 rounded-2xl bg-amber-950/90 border-2 border-amber-900/90 shadow-inner overflow-hidden"
        >
          <!-- 3D 흙 구멍 깊이감 (Mound Hole) -->
          <div class="absolute inset-0 bg-gradient-to-b from-black/80 via-amber-950/50 to-transparent pointer-events-none z-0" />

          <!-- Floating Score Popup Effect (+1, +3, -2) -->
          <Transition name="float-pop">
            <span
                v-if="popups[i]"
                :key="popups[i]?.id"
                :class="popups[i]?.type === 'gold' ? 'text-amber-300 shadow-amber-500/50' : popups[i]?.type === 'bomb' ? 'text-rose-400 shadow-rose-500/50' : 'text-emerald-300 shadow-emerald-500/50'"
                class="absolute top-2 font-black text-xl z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none"
            >
              {{ popups[i]?.text }}
            </span>
          </Transition>

          <!-- 두더지 캐릭터 튀어나옴 애니메이션 -->
          <button
              :class="[
                active ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-75 pointer-events-none',
                moleTypes[i] === 'gold' ? 'drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]' : moleTypes[i] === 'bomb' ? 'drop-shadow-[0_0_12px_rgba(244,63,94,0.9)]' : 'drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]'
              ]"
              class="relative z-10 flex size-20 items-center justify-center rounded-2xl text-4xl transition-[transform,opacity] duration-90 active:scale-90 cursor-pointer outline-none"
              :data-testid="`hole-${i}`"
              type="button"
              @click="onWhack(i)"
          >
            <span v-if="active" class="select-none transition-transform duration-100 hover:scale-110">
              {{ moleTypes[i] === 'gold' ? '🌟' : moleTypes[i] === 'bomb' ? '💣' : '🐹' }}
            </span>
          </button>

          <!-- 흙 마운드 전면 입체 가림막 (Dirt Front Lip) -->
          <div class="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-amber-900 to-amber-800/80 border-t border-amber-700/50 z-20 pointer-events-none" />
        </div>
      </div>

      <GameResultOverlay :restart="resetLocalGame" :show="state.status === 'over'" testid="game-over" title="🎉 게임이 종료되었습니다!" tone="win">
        <div class="flex flex-col gap-1 items-center">
          <span data-testid="final-score" class="text-base font-extrabold text-foreground">최종 점수: {{ state.score }}점</span>
          <span class="text-xs text-muted-foreground">버튼을 눌러 다시 두더지를 잡아보세요!</span>
        </div>
      </GameResultOverlay>
    </div>

    <p v-if="state.status !== 'over'" class="text-[12px] font-medium text-muted-foreground/90 bg-muted/30 px-3.5 py-1.5 rounded-full border border-border/40">
      🔨 튀어나오는 두더지를 빠르게 클릭하되, 폭탄은 피하세요!
    </p>
  </div>
</template>

<script lang="ts" setup>
import {onMounted, onUnmounted, ref, watch} from 'vue'
import {createWhackAMoleState, tick, whack} from '../../utils/whackAMole'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const HOLE_COUNT = 9
const DURATION_MS = 30000
const TICK_MS = 100

const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void; onGameEnd?: () => void }>()

const state = ref(createWhackAMoleState(HOLE_COUNT, DURATION_MS))
const moleTypes = ref<Array<'normal' | 'gold' | 'bomb'>>(Array(HOLE_COUNT).fill('normal'))
const popups = ref<Array<{ id: number; text: string; type: 'normal' | 'gold' | 'bomb' } | null>>(Array(HOLE_COUNT).fill(null))
const comboCount = ref(0)
const maxScore = ref(0)
const {playSuccess, playFail} = useGameSound()
let intervalId: ReturnType<typeof setInterval> | null = null
let popupIdCounter = 0

function triggerPopup(index: number, text: string, type: 'normal' | 'gold' | 'bomb') {
  popupIdCounter++
  popups.value[index] = { id: popupIdCounter, text, type }
  setTimeout(() => {
    if (popups.value[index]?.id === popupIdCounter) {
      popups.value[index] = null
    }
  }, 600)
}

function resetLocalGame() {
  state.value = createWhackAMoleState(HOLE_COUNT, DURATION_MS)
  moleTypes.value = Array(HOLE_COUNT).fill('normal')
  popups.value = Array(HOLE_COUNT).fill(null)
  comboCount.value = 0
  if (intervalId) clearInterval(intervalId)
  intervalId = setInterval(step, TICK_MS)
  if (props.restart) props.restart()
}

function onWhack(i: number) {
  if (state.value.status !== 'playing' || !state.value.holes[i]) return
  const type = moleTypes.value[i]

  if (type === 'gold') {
    state.value.score += 3
    state.value.holes[i] = false
    comboCount.value++
    triggerPopup(i, '+3', 'gold')
    playSuccess()
  } else if (type === 'bomb') {
    state.value.score = Math.max(0, state.value.score - 2)
    state.value.holes[i] = false
    comboCount.value = 0
    triggerPopup(i, '-2', 'bomb')
    playFail()
  } else {
    const before = state.value.score
    state.value = whack(state.value, i)
    if (state.value.score > before) {
      comboCount.value++
      triggerPopup(i, '+1', 'normal')
      playSuccess()
    }
  }

  if (state.value.score > maxScore.value) {
    maxScore.value = state.value.score
  }
}

function step() {
  if (state.value.status !== 'playing') {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    return
  }
  const beforeHoles = [...state.value.holes]
  state.value = tick(state.value, TICK_MS)

  for (let i = 0; i < HOLE_COUNT; i++) {
    if (!beforeHoles[i] && state.value.holes[i]) {
      const rand = Math.random()
      if (rand < 0.15) moleTypes.value[i] = 'gold'
      else if (rand < 0.25) moleTypes.value[i] = 'bomb'
      else moleTypes.value[i] = 'normal'
    }
  }
}

onMounted(() => {
  intervalId = setInterval(step, TICK_MS)
})

watch(() => state.value.status, status => {
  if (status === 'over') {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    props.submitScore?.(state.value.score)
    props.onGameEnd?.()
  }
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
})
</script>

<style scoped>
.float-pop-enter-active {
  animation: float-up-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes float-up-fade {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.6);
  }
  50% {
    opacity: 1;
    transform: translateY(-12px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translateY(-24px) scale(0.9);
  }
}
</style>

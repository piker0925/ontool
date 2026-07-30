<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <div class="flex items-center gap-2">
      <GameStat v-if="state.status !== 'won'" testid="status" text="카드 두 장을 뒤집어 같은 짝을 찾아보세요" tone="neutral"/>
      <GameStat label="시도" testid="moves" :value="moves"/>
    </div>

    <div class="relative">
      <div class="grid grid-cols-4 gap-2" data-testid="board">
        <button
            v-for="card in state.cards"
            :key="card.id"
            :disabled="resolving"
            class="card-flip-perspective size-16 rounded-xl"
            type="button"
            @click="onFlip(card.id)"
        >
          <div
              :class="isFaceUp(card) ? '[transform:rotateY(180deg)]' : ''"
              class="card-flip-inner relative size-full"
          >
            <!-- 카드 뒷면 -->
            <div class="card-face absolute inset-0 flex items-center justify-center rounded-xl border border-border/50 bg-muted/40 backdrop-blur-sm transition-[background-color] hover:bg-muted/60"/>
            <!-- 카드 앞면 -->
            <div
                :class="card.matched ? 'ring-2 ring-zone-accent/60 bg-zone-accent/15 shadow-[0_0_12px_color-mix(in_oklch,var(--zone-accent)_25%,transparent)]' : 'bg-card border-border'"
                class="card-face card-face-front absolute inset-0 flex items-center justify-center rounded-xl border text-2xl font-bold shadow-sm"
            >
              <span v-if="isFaceUp(card)">{{ randomIcons[card.value % randomIcons.length] }}</span>
            </div>
          </div>
        </button>
      </div>

      <GameResultOverlay :restart="handleRestart" :show="state.status === 'won'" testid="game-result-overlay" title="모든 쌍을 맞췄습니다!" tone="win">
        <span data-testid="final-moves">{{ moves }}번 만에 맞췄습니다</span>
      </GameResultOverlay>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {onUnmounted, ref} from 'vue'
import {createMemoryGame, flipCard, type MemoryCard, resolveFlip} from '../../utils/memoryCards'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const PAIR_COUNT = 8
const RESOLVE_DELAY_MS = 700

const ALL_ICONS = [
  '⚡', '🎮', '🚀', '💎', '🧠', '🏆', '🔥', '💻',
  '🐶', '🐱', '🦊', '🐸', '🐧', '🦁', '🐼', '🦋',
  '🍕', '🍣', '🍩', '🍦', '🌮', '🍜', '🧁', '🍎',
  '⚽', '🏀', '🎾', '🏈', '⚾', '🏐', '🎱', '🏓',
  '🎨', '🎸', '✈️', '🎁', '🎈', '🔑', '🌈', '🌙',
]

function pickRandom8Icons(): string[] {
  const shuffled = [...ALL_ICONS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, PAIR_COUNT)
}

const randomIcons = ref<string[]>(pickRandom8Icons())

function handleRestart() {
  randomIcons.value = pickRandom8Icons()
  state.value = createMemoryGame(PAIR_COUNT)
  moves.value = 0
  resolving.value = false
  if (resolveTimer) clearTimeout(resolveTimer)
  if (props.restart) props.restart()
}

// 174: onGameEnd는 결과 오버레이가 뜨는 시점(카드짝맞추기는 승리 하나뿐, 시간제한 없음)에
// submitScore와 함께 호출된다.
const props = defineProps<{ submitScore?: (score: number) => void; restart?: () => void; onGameEnd?: () => void }>()

const state = ref(createMemoryGame(PAIR_COUNT))
const resolving = ref(false)
// 053: 카드짝맞추기는 자체 점수가 없으므로 "짝을 맞춘 시도 횟수(낮을수록 좋음)"를 점수로 쓴다.
const moves = ref(0)
let resolveTimer: ReturnType<typeof setTimeout> | null = null

const {playClick, playSuccess, playFail} = useGameSound()

function isFaceUp(card: MemoryCard): boolean {
  return card.matched || state.value.flippedIds.includes(card.id)
}

function onFlip(id: number) {
  if (resolving.value) return
  state.value = flipCard(state.value, id)
  playClick()
  if (state.value.flippedIds.length === 2) {
    resolving.value = true
    moves.value++
    const [aId, bId] = state.value.flippedIds
    const isMatch = state.value.cards.find(c => c.id === aId)?.value === state.value.cards.find(c => c.id === bId)?.value
    resolveTimer = setTimeout(() => {
      state.value = resolveFlip(state.value)
      resolving.value = false
      if (isMatch) playSuccess()
      else playFail()
      if (state.value.status === 'won') {
        props.submitScore?.(moves.value)
        props.onGameEnd?.()
      }
    }, RESOLVE_DELAY_MS)
  }
}

onUnmounted(() => {
  if (resolveTimer) clearTimeout(resolveTimer)
})
</script>

<style scoped>
.card-flip-perspective {
  perspective: 800px;
}

.card-flip-inner {
  transition: transform 0.3s ease;
  transform-style: preserve-3d;
}

.card-face {
  backface-visibility: hidden;
}

.card-face-front {
  transform: rotateY(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .card-flip-inner {
    transition: none;
  }
}
</style>

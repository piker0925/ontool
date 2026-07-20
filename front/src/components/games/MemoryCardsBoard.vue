<template>
  <div class="flex flex-col items-center gap-4 py-6">
    <p class="text-sm font-medium" :class="state.status === 'won' ? 'text-zone-accent' : 'text-muted-foreground'" data-testid="status">
      {{ state.status === 'won' ? '모든 쌍을 맞췄습니다!' : '카드 두 장을 뒤집어 같은 짝을 찾아보세요' }}
    </p>

    <div class="grid grid-cols-4 gap-2" data-testid="board">
      <button
          v-for="card in state.cards"
          :key="card.id"
          :class="isFaceUp(card) ? 'bg-card border-border' : 'bg-secondary hover:bg-accent border-transparent'"
          class="flex size-16 items-center justify-center rounded-lg border text-xl font-bold transition-colors"
          :disabled="resolving"
          type="button"
          @click="onFlip(card.id)"
      >
        <span v-if="isFaceUp(card)">{{ card.value + 1 }}</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {onUnmounted, ref} from 'vue'
import {createMemoryGame, flipCard, type MemoryCard, resolveFlip} from '../../utils/memoryCards'

const PAIR_COUNT = 8
const RESOLVE_DELAY_MS = 700

const state = ref(createMemoryGame(PAIR_COUNT))
const resolving = ref(false)
let resolveTimer: ReturnType<typeof setTimeout> | null = null

function isFaceUp(card: MemoryCard): boolean {
  return card.matched || state.value.flippedIds.includes(card.id)
}

function onFlip(id: number) {
  if (resolving.value) return
  state.value = flipCard(state.value, id)
  if (state.value.flippedIds.length === 2) {
    resolving.value = true
    resolveTimer = setTimeout(() => {
      state.value = resolveFlip(state.value)
      resolving.value = false
    }, RESOLVE_DELAY_MS)
  }
}

onUnmounted(() => {
  if (resolveTimer) clearTimeout(resolveTimer)
})
</script>

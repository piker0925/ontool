<template>
  <Transition name="game-result">
    <div
        v-if="show"
        :data-testid="testid ?? 'game-result-overlay'"
        aria-live="polite"
        class="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-background/90 text-center backdrop-blur-md overflow-hidden p-4 shadow-2xl border border-border/60"
        role="status"
    >
      <!-- 승리 축하 60fps 파티클 이펙트 -->
      <div v-if="tone === 'win'" class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span v-for="i in 12" :key="i" :style="{ '--i': i }" class="confetti-spark" />
      </div>

      <p :class="toneClass" class="text-xl font-extrabold z-10 flex items-center gap-2 tracking-tight">
        <span v-if="tone === 'win'" class="inline-block animate-bounce text-2xl">🏆</span>
        {{ title }}
      </p>

      <div v-if="$slots.default" class="text-sm font-medium text-muted-foreground z-10 font-mono bg-muted/40 px-3.5 py-1.5 rounded-full border border-border/40">
        <slot/>
      </div>

      <button
          v-if="restart"
          class="mt-2 z-10 flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-95 shadow-lg"
          data-testid="game-result-restart"
          type="button"
          @click="restart"
      >
        <RotateCcw aria-hidden="true" class="size-4"/>
        <span>다시 도전하기</span>
        <kbd class="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-primary-foreground/20 rounded border border-primary-foreground/30">Enter ↵</kbd>
      </button>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted} from 'vue'
import {RotateCcw} from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  show: boolean
  title: string
  tone?: 'win' | 'lose' | 'neutral'
  testid?: string
  restart?: () => void
}>(), {
  tone: 'neutral',
})

const toneClass = computed(() => ({
  win: 'text-emerald-500 dark:text-emerald-400',
  lose: 'text-destructive',
  neutral: 'text-foreground',
}[props.tone]))

function handleEnterKey(e: KeyboardEvent) {
  if (props.show && props.restart && (e.key === 'Enter' || e.key === 'NumpadEnter')) {
    e.preventDefault()
    e.stopPropagation()
    props.restart()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEnterKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEnterKey)
})
</script>

<style scoped>
.game-result-enter-active,
.game-result-leave-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.game-result-enter-from,
.game-result-leave-to {
  opacity: 0;
  transform: scale(0.94);
}

@media (prefers-reduced-motion: reduce) {
  .game-result-enter-active,
  .game-result-leave-active {
    transition: opacity 0.2s ease;
  }

  .game-result-enter-from,
  .game-result-leave-to {
    transform: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .confetti-spark {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: oklch(0.7 0.25 140);
    animation: confetti-burst 0.75s ease-out forwards;
    animation-delay: calc(var(--i) * 0.035s);
  }

  @keyframes confetti-burst {
    0% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(calc(-50% + (var(--i) * 22px - 130px)), calc(-50% + (var(--i) * 18px - 100px))) scale(0.2);
    }
  }
}
</style>

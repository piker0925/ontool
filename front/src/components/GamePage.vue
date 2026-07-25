<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div class="flex min-w-0 flex-col gap-0.5">
        <h1 class="text-lg font-semibold tracking-tight text-foreground">{{ title }}</h1>
        <p v-if="description" class="text-[13px] text-muted-foreground">{{ description }}</p>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <button
            :aria-label="muted ? '효과음 켜기' : '효과음 끄기'"
            :aria-pressed="muted"
            class="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-zone-accent/40 hover:text-zone-accent"
            data-testid="game-mute-toggle"
            type="button"
            @click="toggleMuted"
        >
          <component :is="muted ? VolumeX : Volume2" aria-hidden="true" class="size-4"/>
        </button>
        <button
            class="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-mono text-[12px] text-muted-foreground transition-colors hover:border-zone-accent/40 hover:text-zone-accent"
            data-testid="game-restart"
            @click="restart"
        >
          <RotateCcw aria-hidden="true" class="size-3.5"/>
          다시 시작
        </button>
      </div>
    </div>

    <div :key="restartKey" class="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <slot :submit-score="submitScore"/>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {RotateCcw, Volume2, VolumeX} from 'lucide-vue-next'
import {useGameSound} from '../composables/useGameSound'

defineProps<{ title: string; description?: string }>()

const {muted, toggleMuted} = useGameSound()

// key를 바꿔 slot 콘텐츠를 통째로 재마운트한다 — 게임마다 개별 reset()을 구현하지 않아도
// "재시작 시 상태 완전 초기화"가 항상 보장된다.
const restartKey = ref(0)
function restart() {
  restartKey.value++
}

// 053(게임 랭킹, v3 보류)에서 실제 제출 로직이 붙을 자리 — 지금은 훅만 존재.
function submitScore(_score: number) {}
</script>

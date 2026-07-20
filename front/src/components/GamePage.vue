<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h1 class="text-lg font-semibold tracking-tight text-foreground">{{ title }}</h1>
      <p v-if="description" class="text-[13px] text-muted-foreground">{{ description }}</p>
      <button
          class="ml-auto flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-mono text-[12px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          data-testid="game-restart"
          @click="restart"
      >
        <RotateCcw class="size-3.5"/>
        다시 시작
      </button>
    </div>
    <div :key="restartKey">
      <slot :submit-score="submitScore"/>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {RotateCcw} from 'lucide-vue-next'

defineProps<{ title: string; description?: string }>()

// key를 바꿔 slot 콘텐츠를 통째로 재마운트한다 — 게임마다 개별 reset()을 구현하지 않아도
// "재시작 시 상태 완전 초기화"가 항상 보장된다.
const restartKey = ref(0)
function restart() {
  restartKey.value++
}

// 053(게임 랭킹, v3 보류)에서 실제 제출 로직이 붙을 자리 — 지금은 훅만 존재.
function submitScore(_score: number) {}
</script>

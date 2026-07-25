<template>
  <Transition name="game-result">
    <div
        v-if="show"
        :data-testid="testid ?? 'game-result-overlay'"
        aria-live="polite"
        class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-background/85 text-center backdrop-blur-sm"
        role="status"
    >
      <p :class="toneClass" class="text-lg font-semibold">{{ title }}</p>
      <div v-if="$slots.default" class="text-[13px] text-muted-foreground">
        <slot/>
      </div>

      <!-- 166: 게임이 끝난 시선이 머무는 자리(보드 가운데)에도 재시작 버튼을 둔다 — 헤더 구석의
           기존 버튼은 "게임 도중 언제든 재시작" 용도로 그대로 둔다(제거 아님, 의도된 중복). -->
      <button
          v-if="restart"
          class="mt-1 flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
          data-testid="game-result-restart"
          type="button"
          @click="restart"
      >
        <RotateCcw aria-hidden="true" class="size-3.5"/>
        다시 시작
      </button>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import {RotateCcw} from 'lucide-vue-next'

// 보드(그리드/캔버스)를 덮는 게임오버·승리·무승부 연출을 통일하는 오버레이.
// 각 보드는 자신을 감싼 컨테이너에 relative를 주고 이 컴포넌트를 형제로 배치한다.
// NumberBaseballBoard(리스트형 UI — 오버레이로 덮으면 그동안의 추측 기록이 가려짐)와
// ReactionTimeBoard(결과가 보드를 덮는 게 아니라 화면 자체를 대체)는 구조상 이 오버레이 대신
// 자체 인라인 결과 화면을 쓴다 — "게임별로 적합한 형태" 원칙에 따른 의도된 예외. 둘 다 이미
// 자체 재시작 동선이 있어(NumberBaseballBoard는 166에서 승리 메시지 옆에 추가, ReactionTimeBoard는
// 원래부터 "다시 도전" 버튼 보유) 이 오버레이의 restart와는 별도로 처리한다.
const props = withDefaults(defineProps<{
  show: boolean
  title: string
  tone?: 'win' | 'lose' | 'neutral'
  testid?: string
  // GamePage.vue의 restart()를 그대로 받는다 — 없으면(호출부가 안 넘기면) 버튼을 아예 숨긴다.
  restart?: () => void
}>(), {
  tone: 'neutral',
})

const toneClass = computed(() => ({
  win: 'text-zone-accent',
  lose: 'text-destructive',
  neutral: 'text-foreground',
}[props.tone]))
</script>

<style scoped>
.game-result-enter-active,
.game-result-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.game-result-enter-from,
.game-result-leave-to {
  opacity: 0;
  transform: scale(0.96);
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
</style>

<template>
  <div
      v-if="isVisible"
      aria-hidden="true"
      class="fixed inset-x-0 top-0 z-[100] h-[2px] overflow-hidden pointer-events-none"
      data-testid="route-loading-bar"
  >
    <div
        :style="{width: `${progress}%`}"
        class="route-loading-bar-fill h-full bg-zone-accent shadow-[0_0_8px_var(--zone-accent)]"
    />
  </div>
</template>

<script lang="ts" setup>
// 183: router/index.ts의 beforeEach/afterEach가 useRouteLoadingBar()의 start()/finish()를 호출한다.
// 이 컴포넌트는 순수하게 그 상태를 그리기만 한다 — 표시/숨김 타이밍 로직은 useRouteLoadingBar.test.ts에서 검증.
import {useRouteLoadingBar} from '../composables/useRouteLoadingBar'

const {isVisible, progress} = useRouteLoadingBar()
</script>

<style scoped>
.route-loading-bar-fill {
  transition: width 0.2s ease-out;
}

/* DESIGN.md 7절 — prefers-reduced-motion 존중: 폭이 부드럽게 늘어나는 애니메이션 대신 즉시 반영한다. */
@media (prefers-reduced-motion: reduce) {
  .route-loading-bar-fill {
    transition: none;
  }
}
</style>

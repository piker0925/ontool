<template>
  <div class="flex flex-col items-center gap-5 py-6">
    <GameStat label="코인" testid="coins" :value="Math.floor(state.coins)"/>

    <button
        class="flex size-32 items-center justify-center rounded-full bg-zone-accent text-4xl font-bold text-white shadow-lg transition-transform active:scale-95"
        data-testid="click-button"
        type="button"
        @click="onClick"
    >
      🪙
    </button>

    <p class="text-[11px] text-muted-foreground">
      클릭당 {{ state.coinsPerClick }}코인 · 초당 {{ state.coinsPerSecond }}코인
    </p>

    <div class="grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
      <button
          :disabled="state.coins < clickCost"
          class="rounded-lg border border-border bg-card px-3 py-2 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:border-zone-accent/40"
          data-testid="buy-click-upgrade"
          type="button"
          @click="onBuyClickUpgrade"
      >
        <span class="block font-medium text-foreground">클릭 강화 (Lv.{{ state.clickLevel }})</span>
        <span class="text-muted-foreground">{{ clickCost }}코인 · 클릭당 +1</span>
      </button>

      <button
          :disabled="state.coins < autoCost"
          class="rounded-lg border border-border bg-card px-3 py-2 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:border-zone-accent/40"
          data-testid="buy-auto-upgrade"
          type="button"
          @click="onBuyAutoUpgrade"
      >
        <span class="block font-medium text-foreground">자동 채굴 (Lv.{{ state.autoLevel }})</span>
        <span class="text-muted-foreground">{{ autoCost }}코인 · 초당 +1</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onUnmounted, ref} from 'vue'
import {
  autoUpgradeCost,
  buyAutoUpgrade,
  buyClickUpgrade,
  click as clickAction,
  clickUpgradeCost,
  createIdleClickerState,
  tick,
} from '../../utils/idleClicker'
import {useGameSound} from '../../composables/useGameSound'
import GameStat from '../GameStat.vue'

// 방치형 장르 특성상 "게임 종료" 개념이 없어 submitScore(리더보드)를 연결하지 않는다 —
// 진행 상황은 이번 이슈 범위상 세션 동안만 유지되는 로컬 상태다(PomodoroGame.vue와 동일 패턴).
const state = ref(createIdleClickerState())
const {playClick} = useGameSound()

const clickCost = computed(() => clickUpgradeCost(state.value.clickLevel))
const autoCost = computed(() => autoUpgradeCost(state.value.autoLevel))

function onClick() {
  state.value = clickAction(state.value)
  playClick()
}

function onBuyClickUpgrade() {
  state.value = buyClickUpgrade(state.value)
}

function onBuyAutoUpgrade() {
  state.value = buyAutoUpgrade(state.value)
}

const TICK_MS = 1000
let lastTickAt = Date.now()
const intervalId = setInterval(() => {
  const now = Date.now()
  const deltaSeconds = (now - lastTickAt) / 1000
  lastTickAt = now
  state.value = tick(state.value, deltaSeconds)
}, TICK_MS)

onUnmounted(() => clearInterval(intervalId))
</script>

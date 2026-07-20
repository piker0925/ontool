<template>
  <div class="flex flex-col gap-4 max-w-3xl mx-auto w-full">
    <p class="text-[12px] text-muted-foreground">
      목표 번호를 정하고 무작위 구매를 반복 시뮬레이션합니다. 몇 게임 만에 당첨되는지 확률을 체감해보세요.
    </p>

    <!-- 목표 설정 -->
    <div class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <label class="text-[11px] font-medium text-muted-foreground">목표 번호 (슬롯별로 직접 지정하거나 랜덤으로 둘 수 있습니다)</label>
      <div class="flex flex-wrap items-center gap-2">
        <select v-for="(_, i) in slots" :key="i" v-model.number="slots[i]" :disabled="running"
                class="rounded-lg border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-ring">
          <option :value="null">랜덤</option>
          <option v-for="n in 45" :key="n" :value="n">{{ n }}</option>
        </select>
        <span class="text-[12px] text-muted-foreground">보너스</span>
        <select v-model.number="bonusSlot" :disabled="running"
                class="rounded-lg border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-ring">
          <option :value="null">랜덤</option>
          <option v-for="n in 45" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
      <div v-if="resolvedTarget" class="flex items-center gap-2 pt-1">
        <span class="text-[11px] text-muted-foreground">확정된 목표:</span>
        <span class="font-mono text-[13px] text-foreground">
          {{ resolvedTarget.numbers.join(', ') }} + 보너스 {{ resolvedTarget.bonus }}
        </span>
      </div>
    </div>

    <!-- 배속 -->
    <div class="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4">
      <label class="text-[11px] font-medium text-muted-foreground">배속</label>
      <div class="flex flex-wrap rounded-lg border border-border overflow-hidden">
        <button v-for="s in SPEEDS" :key="s"
                :class="speed === s ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'"
                class="px-2.5 py-1 text-[12px] font-medium transition-colors"
                @click="speed = s">{{ s.toLocaleString() }}배
        </button>
      </div>
    </div>

    <!-- 자동 정지 -->
    <div class="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4">
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input v-model="autoStopEnabled" :disabled="running" class="rounded accent-primary" type="checkbox"/>
        <span class="text-[12px] text-foreground">자동 정지:</span>
      </label>
      <select v-model.number="autoStopRank" :disabled="!autoStopEnabled || running"
              class="rounded-lg border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-ring">
        <option v-for="r in [1, 2, 3, 4, 5]" :key="r" :value="r">{{ r }}등</option>
      </select>
      <span class="text-[12px] text-muted-foreground">이</span>
      <input v-model.number="autoStopCount" :disabled="!autoStopEnabled || running"
             class="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-ring"
             min="1" type="number"/>
      <span class="text-[12px] text-muted-foreground">번 나오면 정지</span>
    </div>

    <!-- 컨트롤 -->
    <div class="flex gap-2">
      <button v-if="!running"
              class="flex-1 rounded-xl bg-primary py-2.5 text-[14px] font-semibold text-primary-foreground transition-colors hover:opacity-90"
              @click="start">시작
      </button>
      <button v-else
              class="flex-1 rounded-xl bg-destructive py-2.5 text-[14px] font-semibold text-white transition-colors hover:opacity-90"
              @click="stop">정지
      </button>
      <button
          class="rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] text-foreground/80 transition-colors hover:bg-accent"
          @click="resetAll">초기화
      </button>
    </div>

    <!-- 통계 -->
    <div class="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[12px] text-muted-foreground">총 게임 수</span>
        <span class="font-mono text-lg font-semibold text-foreground">{{ stats.totalGames.toLocaleString() }}</span>
      </div>
      <div class="flex flex-col gap-1.5">
        <div v-for="r in ([1, 2, 3, 4, 5] as const)" :key="r"
             class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5">
          <span class="text-[12px] text-foreground">{{ r }}등</span>
          <span class="font-mono text-[13px] text-foreground">
            {{ stats.rankCounts[r].toLocaleString() }}회
            <span class="text-muted-foreground">({{ percentOf(stats.rankCounts[r]) }}%)</span>
          </span>
        </div>
      </div>
      <div v-if="stats.lastTicket" class="flex items-center gap-2 border-t border-border pt-2">
        <span class="text-[11px] text-muted-foreground">방금 구매:</span>
        <span class="font-mono text-[12px] text-foreground">{{ stats.lastTicket.join(', ') }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {onUnmounted, ref} from 'vue'
import {
  createEmptyStats,
  resolvePartialTarget,
  runLottoBatch,
  shouldAutoStop,
  type LottoRank,
  type LottoSimulationStats,
  type LottoTarget,
} from '../../utils/lottoSimulator'

const SPEEDS = [1, 5, 10, 50, 100, 500, 1000, 10000] as const

const slots = ref<(number | null)[]>([null, null, null, null, null, null])
const bonusSlot = ref<number | null>(null)
const speed = ref<number>(SPEEDS[0])
const autoStopEnabled = ref(false)
const autoStopRank = ref<LottoRank>(1)
const autoStopCount = ref(1)

const running = ref(false)
const stats = ref<LottoSimulationStats>(createEmptyStats())
const resolvedTarget = ref<LottoTarget | null>(null)
let timer: ReturnType<typeof setInterval> | undefined

function percentOf(count: number): string {
  if (stats.value.totalGames === 0) return '0.00'
  return (count / stats.value.totalGames * 100).toFixed(2)
}

function tick() {
  if (!resolvedTarget.value) return
  stats.value = runLottoBatch(resolvedTarget.value, speed.value, stats.value)
  if (autoStopEnabled.value && shouldAutoStop(stats.value, autoStopRank.value, autoStopCount.value)) {
    stop()
  }
}

function start() {
  if (!resolvedTarget.value) resolvedTarget.value = resolvePartialTarget(slots.value, bonusSlot.value)
  running.value = true
  timer = setInterval(tick, 100)
}

function stop() {
  running.value = false
  clearInterval(timer)
  timer = undefined
}

function resetAll() {
  stop()
  stats.value = createEmptyStats()
  resolvedTarget.value = null
}

onUnmounted(() => clearInterval(timer))
</script>

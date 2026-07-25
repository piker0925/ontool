<!--
  큐 적체 게이지 — 값 하나(PENDING 대비 임계값 비율)를 보여주는 단일 헤드라인 지표라
  풀 차트가 아니라 라벨 있는 미터바로 표현한다(dataviz: 폼이 곧 "차트가 아닐 수도 있다").
  상태색은 색만으로 전달하지 않는다 — 항상 텍스트 라벨(여유/주의/포화)을 함께 보여준다.
  재사용을 위해 AdminPage에 종속되지 않는다(118).
-->
<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between text-xs">
      <span class="font-medium text-foreground">{{ label }}</span>
      <span class="text-muted-foreground">
        대기 {{ pending }} · 실행 {{ running }} / 임계 {{ threshold }}
      </span>
    </div>
    <div class="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div
          class="h-full rounded-full transition-[width] duration-300"
          :style="{width: `${Math.min(ratio, 1) * 100}%`, backgroundColor: statusColor}"
      />
    </div>
    <span class="text-[11px] font-medium" :style="{color: statusColor}">{{ statusLabel }}</span>
  </div>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import {STATUS_COLORS} from './chartColors'

const props = defineProps<{
  label: string
  pending: number
  running: number
  threshold: number
}>()

const ratio = computed(() => props.threshold > 0 ? props.pending / props.threshold : 0)

const statusColor = computed(() => {
  if (ratio.value >= 0.9) return STATUS_COLORS.critical
  if (ratio.value >= 0.6) return STATUS_COLORS.warning
  return STATUS_COLORS.good
})

const statusLabel = computed(() => {
  if (ratio.value >= 0.9) return '포화'
  if (ratio.value >= 0.6) return '주의'
  return '여유'
})
</script>

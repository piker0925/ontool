<!--
  일별 성공/실패 스택 영역(+상단 라인) 차트. 두 계열 모두 "상태"라서 카테고리 팔레트가 아니라
  고정 상태색(성공=good, 실패=critical)을 쓴다 — 상태색은 색만으로 전달하지 않으므로 범례에
  항상 텍스트 라벨을 동반한다. 재사용을 위해 AdminPage에 종속되지 않는다(118).
-->
<template>
  <div class="w-full">
    <VisXYContainer :data="data" :height="height" :padding="{top: 8, bottom: 8}">
      <VisArea :x="x" :y="y" :color="color" :line="true" :line-width="2" :opacity="0.35"/>
      <VisAxis type="x" :tick-format="tickFormat" :num-ticks="Math.min(data.length, 7)"/>
      <VisAxis type="y" :num-ticks="4"/>
      <VisCrosshair :x="x" :y-stacked="y" :template="crosshairTemplate"/>
      <VisTooltip/>
    </VisXYContainer>
    <ul class="mt-2 flex items-center justify-center gap-4 text-xs">
      <li class="flex items-center gap-1.5">
        <span class="inline-block size-2.5 shrink-0 rounded-full" style="background-color: var(--chart-status-good)"/>
        <span class="text-muted-foreground">성공</span>
      </li>
      <li class="flex items-center gap-1.5">
        <span class="inline-block size-2.5 shrink-0 rounded-full" style="background-color: var(--chart-status-critical)"/>
        <span class="text-muted-foreground">실패</span>
      </li>
    </ul>
    <p v-if="data.length === 0" class="py-6 text-center text-xs text-muted-foreground">데이터 없음</p>
  </div>
</template>

<script lang="ts" setup>
import {VisXYContainer, VisArea, VisAxis, VisCrosshair, VisTooltip} from '@unovis/vue'
import {shortDate} from './chartFormat'

export interface DailyJobCountDatum {
  date: string // yyyy-MM-dd
  doneCount: number
  failCount: number
}

const props = withDefaults(defineProps<{
  data: DailyJobCountDatum[]
  height?: number
}>(), {
  height: 200,
})

const x = (_d: DailyJobCountDatum, i: number) => i
const y = [
  (d: DailyJobCountDatum) => d.doneCount,
  (d: DailyJobCountDatum) => d.failCount,
]
const color = (_d: DailyJobCountDatum[], i: number) =>
  i === 0 ? 'var(--chart-status-good)' : 'var(--chart-status-critical)'

const tickFormat = (tick: number) => shortDate(props.data[tick]?.date ?? '')

const crosshairTemplate = (d: DailyJobCountDatum) => {
  if (!d) return ''
  return `<div class="text-xs"><strong>${d.date}</strong><br/>성공 ${d.doneCount} · 실패 ${d.failCount}</div>`
}
</script>

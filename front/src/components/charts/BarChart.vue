<!--
  범용 단일 계열 막대 차트 — "크기(magnitude)" 용도. 모든 막대가 같은 계열이라 카테고리 색이 아닌
  --chart-1 한 가지 색만 쓴다(dataviz: sequential/단일 계열은 한 색). 재사용을 위해 AdminPage에
  종속되지 않는 위치(components/charts)에 둔다 — 118.
-->
<template>
  <div class="w-full">
    <VisXYContainer :data="data" :height="height" :padding="{top: 8, bottom: 8}">
      <VisGroupedBar :x="x" :y="y" :color="color" :rounded-corners="4"/>
      <VisAxis type="x" :tick-format="tickFormat" :num-ticks="data.length"/>
      <VisAxis type="y" :num-ticks="4"/>
      <VisTooltip :triggers="triggers"/>
    </VisXYContainer>
    <p v-if="data.length === 0" class="py-6 text-center text-xs text-muted-foreground">데이터 없음</p>
  </div>
</template>

<script lang="ts" setup>
import {VisXYContainer, VisGroupedBar, VisAxis, VisTooltip} from '@unovis/vue'
import {GroupedBar} from '@unovis/ts'

export interface BarChartDatum {
  label: string
  value: number
}

const props = withDefaults(defineProps<{
  data: BarChartDatum[]
  height?: number
  valueFormatter?: (value: number) => string
}>(), {
  height: 220,
})

const x = (_d: BarChartDatum, i: number) => i
const y = (d: BarChartDatum) => d.value
const color = () => 'var(--chart-1)'
const tickFormat = (tick: number) => props.data[tick]?.label ?? ''

const triggers = {
  [GroupedBar.selectors.bar]: (d: BarChartDatum) =>
    `<div class="text-xs"><strong>${d.label}</strong>: ${(props.valueFormatter ?? String)(d.value)}</div>`,
}
</script>

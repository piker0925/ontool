<!--
  범용 단일 계열 라인 차트 — "크기 변화(magnitude over time)" 용도. 한 계열이라 범례 없이 제목만으로
  충분하다(dataviz: 단일 계열은 범례 불필요). 재사용을 위해 AdminPage에 종속되지 않는다(118).
-->
<template>
  <div class="w-full">
    <VisXYContainer :data="data" :height="height" :padding="{top: 8, bottom: 8}">
      <VisLine :x="x" :y="y" color="var(--chart-1)" :line-width="2"/>
      <VisAxis type="x" :tick-format="tickFormat" :num-ticks="Math.min(data.length, 7)"/>
      <VisAxis type="y" :num-ticks="4"/>
      <VisCrosshair :x="x" :y="y" :template="crosshairTemplate"/>
      <VisTooltip/>
    </VisXYContainer>
    <p v-if="data.length === 0" class="py-6 text-center text-xs text-muted-foreground">데이터 없음</p>
  </div>
</template>

<script lang="ts" setup>
import {VisXYContainer, VisLine, VisAxis, VisCrosshair, VisTooltip} from '@unovis/vue'
import {shortDate} from './chartFormat'

export interface LineChartDatum {
  date: string // yyyy-MM-dd
  value: number
}

const props = withDefaults(defineProps<{
  data: LineChartDatum[]
  height?: number
  valueLabel?: string
}>(), {
  height: 200,
  valueLabel: '',
})

const x = (_d: LineChartDatum, i: number) => i
const y = (d: LineChartDatum) => d.value

const tickFormat = (tick: number) => shortDate(props.data[tick]?.date ?? '')

const crosshairTemplate = (d: LineChartDatum) => {
  if (!d) return ''
  return `<div class="text-xs"><strong>${d.date}</strong>${props.valueLabel ? ` · ${props.valueLabel}` : ''}: ${d.value}</div>`
}
</script>

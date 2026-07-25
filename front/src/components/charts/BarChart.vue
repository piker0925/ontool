<!--
  범용 단일 계열 막대 차트 — "크기(magnitude)" 용도. 모든 막대가 같은 계열이라 카테고리 색이 아닌
  --chart-1 한 가지 색만 쓴다(dataviz: sequential/단일 계열은 한 색). 재사용을 위해 AdminPage에
  종속되지 않는 위치(components/charts)에 둔다 — 118.

  x축 틱 라벨은 tickTextWidth를 넘으면 말줄임(…) 처리한다(unovis VisAxis의 tickTextFitMode="trim") —
  라벨이 짧은 영문 id일 때만 맞춰져 있던 걸, 한글 도구명처럼 긴 라벨을 쓰는 모든 소비처에서
  겹침 없이 재사용하기 위해 이 컴포넌트 레벨에서 고정한다. 잘린 전체 라벨은 막대 위 툴팁에서
  그대로 확인할 수 있다(아래 triggers는 원본 d.label을 그대로 쓴다, 잘리지 않음).
-->
<template>
  <div class="w-full">
    <VisXYContainer :data="data" :height="height" :padding="{top: 8, bottom: 8}">
      <VisGroupedBar :x="x" :y="y" :color="color" :rounded-corners="4"/>
      <VisAxis
          type="x" :tick-format="tickFormat" :num-ticks="data.length"
          tick-text-fit-mode="trim" tick-text-trim-type="end" :tick-text-width="tickTextWidth"
      />
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
  /** x축 틱 라벨 최대 너비(px) — 넘으면 끝부분을 …로 잘라 표시. 전체 라벨은 툴팁에서 확인. */
  tickTextWidth?: number
}>(), {
  height: 220,
  tickTextWidth: 64,
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

<!--
  범용 카테고리 도넛/파이 차트 — "정체성(identity)" 용도. 세그먼트 색은 항상 data 배열 순서를 그대로
  따른다(정렬하지 않음) — 어떤 항목이 어떤 색인지 값 크기와 무관하게 고정되도록. 호출부가 항상 같은
  고정 순서로 data를 구성해야 이 보장이 성립한다(레인은 항상 [HEAVY, VIDEO] 순서 등).
  ≥2 계열은 항상 범례를 동반한다(dataviz 접근성 규칙) — 범례 없이는 절대 쓰지 않는다.
  arcWidth=0을 주면 파이(홀 없음), 기본값은 도넛(홀 있음). 재사용을 위해 AdminPage에 종속되지 않는다(118).

  차트↔범례 간격: sm 이상에서 justify-center를 쓰면 (차트+범례) 묶음을 넓은 그리드 칸 안에서
  가운데로 밀어주긴 하지만, 칸이 묶음 자체보다 훨씬 넓을 때 둘 사이 간격이 실제보다 훨씬 벌어져
  보인다(둘 다 가운데로 몰리면서 시각적으로는 그대로인데 상대적 여백만 커 보임). justify-start로
  묶음을 항상 왼쪽에 붙여 간격을 gap-2로 고정하고, 칸이 넓어도 간격이 늘어나지 않게 한다.
-->
<template>
  <div class="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-start">
    <VisSingleContainer :data="data" :height="height" :width="height">
      <VisDonut :value="value" :color="color" :arc-width="donut ? 24 : 0" :pad-angle="donut ? 0.02 : 0.01"
                :corner-radius="2"/>
      <VisTooltip :triggers="triggers"/>
    </VisSingleContainer>
    <ul v-if="data.length > 0" class="flex flex-col gap-1.5 text-xs">
      <li v-for="(d, i) in data" :key="d.label" class="flex items-center gap-2">
        <span class="inline-block size-2.5 shrink-0 rounded-full" :style="{backgroundColor: categoricalColor(i)}"/>
        <span class="text-foreground">{{ d.label }}</span>
        <span class="text-muted-foreground">{{ (valueFormatter ?? String)(d.value) }}</span>
      </li>
    </ul>
    <p v-else class="py-6 text-center text-xs text-muted-foreground">데이터 없음</p>
  </div>
</template>

<script lang="ts" setup>
import {VisSingleContainer, VisDonut, VisTooltip} from '@unovis/vue'
import {Donut} from '@unovis/ts'
import {categoricalColor} from './chartColors'

export interface DonutChartDatum {
  label: string
  value: number
}

const props = withDefaults(defineProps<{
  data: DonutChartDatum[]
  height?: number
  donut?: boolean
  valueFormatter?: (value: number) => string
}>(), {
  height: 160,
  donut: true,
})

const value = (d: DonutChartDatum) => d.value
const color = (_d: DonutChartDatum, i: number) => categoricalColor(i)

const triggers = {
  [Donut.selectors.segment]: (d: {data: DonutChartDatum}) =>
    `<div class="text-xs"><strong>${d.data.label}</strong>: ${(props.valueFormatter ?? String)(d.data.value)}</div>`,
}
</script>

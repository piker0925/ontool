<!--
  범용 단일 계열 막대 차트 — "크기(magnitude)" 용도. 모든 막대가 같은 계열이라 카테고리 색이 아닌
  --chart-1 한 가지 색만 쓴다(dataviz: sequential/단일 계열은 한 색). 재사용을 위해 AdminPage에
  종속되지 않는 위치(components/charts)에 둔다 — 118.

  x축 틱 라벨 겹침 방지: 수평 트림만으로는 부족했다 — 이 차트가 실제로 쓰이는 그리드 칸(lg:grid-cols-2
  레이아웃에서는 컨테이너 폭이 데스크톱 기준으로도 카테고리 10개 대비 매우 좁아질 수 있다, 예:
  약 440px/10개 ≈ 44px 칸)에서는 아무리 tickTextWidth를 줄여도 한글 라벨이 옆 라벨과 겹친다.
  그래서 라벨을 60도 회전(tickTextAngle)해 가로 폭 대신 세로 공간을 쓰게 하는 걸 기본값으로 삼고,
  트림(tickTextFitMode="trim")은 회전 상태에서도 극단적으로 긴 라벨을 위한 안전장치로 유지한다.
  거기에 unovis 자체 충돌 감지(tickTextHideOverlapping)도 추가했다 — 단, unovis 문서 자체가
  "tickTextAngle을 지정하면 이 충돌 감지가 정확하지 않을 수 있다"고 명시하므로 절대 보장은 아니고,
  회전이 주 방어선이고 이건 그 위의 보너스 안전장치다. 실제로 회전(-60도) 상태에서 겹치지 않는
  라벨만 남기고 겹치는 라벨은 opacity:0으로 숨기는 것까지 실브라우저에서 bounding-box 계산으로
  직접 확인했다(161 3라운드 검증). 잘린/숨겨진 라벨의 전체 텍스트는 막대 위 툴팁에서 확인
  가능하다(아래 triggers는 원본 d.label을 그대로 쓴다, 잘리지 않음).
-->
<template>
  <div class="w-full">
    <VisXYContainer :data="data" :height="height" :padding="{top: 8, bottom: bottomPadding}">
      <VisGroupedBar :x="x" :y="y" :color="color" :rounded-corners="4"/>
      <VisAxis
          type="x" :tick-format="tickFormat" :num-ticks="data.length"
          :tick-text-angle="tickTextAngle" :tick-text-align="tickTextAlign"
          tick-text-fit-mode="trim" tick-text-trim-type="end" :tick-text-width="tickTextWidth"
          :tick-text-hide-overlapping="true"
      />
      <VisAxis type="y" :num-ticks="4"/>
      <VisTooltip :triggers="triggers"/>
    </VisXYContainer>
    <p v-if="data.length === 0" class="py-6 text-center text-xs text-muted-foreground">데이터 없음</p>
  </div>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
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
  /** x축 틱 라벨 최대 너비(px, 회전된 방향 기준) — 넘으면 끝부분을 …로 잘라 표시(회전 상태의 안전장치). */
  tickTextWidth?: number
  /** x축 틱 라벨 회전 각도(도) — 좁은 컨테이너에서도 카테고리 라벨이 겹치지 않도록 기본 -60도 회전. */
  tickTextAngle?: number
}>(), {
  height: 220,
  tickTextWidth: 70,
  tickTextAngle: -60,
})

// 라벨을 회전하면 축 아래로 튀어나오는 만큼 여백이 더 필요하다 — 여백 = 기본 여백(BASE_BOTTOM_PADDING) +
// 회전 각도(90도에 가까울수록 세로로 눕기 때문에 더 많은 세로 공간이 필요하다)에 비례한 추가분.
// 계수(ANGLE_TO_PADDING_RATIO)는 실브라우저에서 y축 숫자가 눌리지 않는 걸 확인하며 정한 경험값이다.
const BASE_BOTTOM_PADDING = 8
const ANGLE_TO_PADDING_RATIO = 0.9
const bottomPadding = computed(() => Math.round(BASE_BOTTOM_PADDING + Math.abs(props.tickTextAngle) * ANGLE_TO_PADDING_RATIO))

// tickTextAngle의 부호에 따라 정렬을 맞춘다 — 음수(시계 반대 방향, 기본값)면 라벨이 왼쪽 위에서
// 오른쪽 아래로 눕는 모양이라 "right" 정렬이 자연스럽고, 양수면 그 반대(unovis 공식 예제도 양수
// 각도엔 "left"를 쓴다)라 "left"가 맞다. 하드코딩하면 이 컴포넌트를 양수 각도로 쓰는 다음
// 소비처가 생겼을 때 라벨이 어색하게 정렬된다 — 재사용 컴포넌트라 부호를 보고 자동으로 맞춘다.
const tickTextAlign = computed(() => (props.tickTextAngle < 0 ? 'right' : props.tickTextAngle > 0 ? 'left' : 'center'))

const x = (_d: BarChartDatum, i: number) => i
const y = (d: BarChartDatum) => d.value
const color = () => 'var(--chart-1)'
const tickFormat = (tick: number) => props.data[tick]?.label ?? ''

const triggers = {
  [GroupedBar.selectors.bar]: (d: BarChartDatum) =>
    `<div class="text-xs"><strong>${d.label}</strong>: ${(props.valueFormatter ?? String)(d.value)}</div>`,
}
</script>

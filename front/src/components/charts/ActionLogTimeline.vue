<!--
  관리자 액션 로그를 표 대신 세로 타임라인으로 보여준다(118). 별도 차트 라이브러리를 쓰지 않는다 —
  이산적인 이벤트 나열은 "차트가 아닌 편이 나은" 경우다(dataviz: 폼을 먼저 고르고, 정답이
  차트가 아닐 수도 있다). 카테고리 색은 항목이 실제로 나타나는지와 무관하게 항상 같은 고정
  인덱스를 쓴다 — 호출부(legend prop)가 전체 카테고리 순서를 고정해서 넘긴다.
  재사용을 위해 AdminPage에 종속되지 않는다.
-->
<template>
  <div>
    <ol class="flex flex-col">
      <li v-if="items.length === 0" class="py-6 text-center text-sm text-muted-foreground">기록 없음</li>
      <li v-for="item in items" :key="item.id" class="relative flex gap-3 pb-4 pl-1 last:pb-0">
        <span class="absolute left-[7px] top-3 bottom-0 w-px bg-border last:hidden"/>
        <span
            class="relative z-10 mt-1.5 size-3 shrink-0 rounded-full ring-4 ring-card"
            :style="{backgroundColor: categoricalColor(item.colorIndex)}"
        />
        <div class="flex flex-1 flex-col gap-0.5">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-foreground">{{ item.label }}</span>
            <span v-if="item.detail" class="font-mono text-xs text-muted-foreground">{{ item.detail }}</span>
          </div>
          <span class="text-xs text-muted-foreground">{{ formatDate(item.date) }}</span>
        </div>
      </li>
    </ol>
    <ul v-if="legend.length > 0" class="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs">
      <li v-for="entry in legend" :key="entry.label" class="flex items-center gap-1.5">
        <span class="inline-block size-2.5 shrink-0 rounded-full" :style="{backgroundColor: categoricalColor(entry.colorIndex)}"/>
        <span class="text-muted-foreground">{{ entry.label }}</span>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import {categoricalColor} from './chartColors'

export interface TimelineItem {
  id: string | number
  label: string
  detail?: string
  date: string
  colorIndex: number
}

export interface TimelineLegendEntry {
  label: string
  colorIndex: number
}

withDefaults(defineProps<{
  items: TimelineItem[]
  legend?: TimelineLegendEntry[]
}>(), {
  legend: () => [],
})

function formatDate(dt: string): string {
  if (!dt) return ''
  const date = new Date(dt)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
</script>

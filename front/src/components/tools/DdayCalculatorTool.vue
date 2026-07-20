<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      기준일
      <input v-model="baseDate" type="date" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      목표일
      <input v-model="targetDate" type="date" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ label }}</div>
      <div class="mt-1 text-[11px] text-muted-foreground">총 {{ Math.abs(diff) }}일 차이</div>
    </div>
    <p class="text-[11px] text-muted-foreground/70">참고용 계산입니다 · 실제와 다를 수 있습니다</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {daysBetween, formatDday} from '../../utils/dateCalc'
import {todayDateString} from '../../utils/todayDateString'

const baseDate = ref(todayDateString())
const targetDate = ref(todayDateString())

const diff = computed(() => daysBetween(baseDate.value, targetDate.value))
const label = computed(() => formatDday(diff.value))
</script>

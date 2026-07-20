<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      최종 월경일(LMP)
      <input v-model="lmpDate" type="date" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">출산예정일</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ dueDate }}</div>
      <div class="mt-1 text-[11px] text-muted-foreground">현재 임신 {{ gestationalAge.weeks }}주 {{ gestationalAge.days }}일</div>
    </div>
    <p class="text-[11px] text-muted-foreground/70">네겔레 법칙(최종 월경일 + 280일) 기준 추정치입니다</p>
    <p class="text-[11px] text-muted-foreground/70">의료적 판단은 전문의와 상담하세요</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcDueDate, calcGestationalWeeks} from '../../utils/dateCalc'
import {todayDateString} from '../../utils/todayDateString'

const today = todayDateString()
const lmpDate = ref(today)

const dueDate = computed(() => calcDueDate(lmpDate.value))
const gestationalAge = computed(() => calcGestationalWeeks(lmpDate.value, today))
</script>

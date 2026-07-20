<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <p class="text-[11px] text-muted-foreground/70">시급제·주급제 근로자가 주 40시간을 초과해 일했을 때 가산수당을 계산합니다. 월급제라면 "시급↔월급↔연봉 변환기"에서 환산시급을 먼저 구해 아래에 입력하세요.</p>
    <label class="flex flex-col gap-1.5 text-[13px]">
      시급(원)
      <input v-model="workHourlyWageInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      주간 근무시간
      <input v-model.number="weeklyHours" type="number" inputmode="numeric" min="0" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">초과근무수당(1.5배 가산)</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ overtimePayAmount.toLocaleString() }}원</div>
    </div>
    <div class="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[13px]">
      <span class="text-muted-foreground">초과근무시간(주 40시간 기준)</span>
      <span class="font-mono text-foreground">{{ overtimeHours }}시간</span>
    </div>
    <p class="text-[11px] text-muted-foreground/70">근로기준법 §56 연장근로 가산(통상임금의 50% 이상)</p>
    <p class="text-[11px] text-muted-foreground/70">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {overtimePay, weeklyOvertimeHours} from '../../utils/salaryCalc'
import {useCommaNumberInput} from '../../utils/commaNumberInput'

const workHourlyWage = ref(10000)
const workHourlyWageInput = useCommaNumberInput(workHourlyWage)
const weeklyHours = ref(40)
const overtimeHours = computed(() => weeklyOvertimeHours(weeklyHours.value))
const overtimePayAmount = computed(() => overtimePay(workHourlyWage.value, weeklyHours.value))
</script>

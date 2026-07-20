<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      기준
      <select v-model="salaryUnit" class="rounded-md border border-input bg-background px-3 py-2">
        <option value="hourly">시급 입력</option>
        <option value="monthly">월급 입력</option>
        <option value="annual">연봉 입력</option>
      </select>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      {{ SALARY_UNIT_LABEL[salaryUnit] }}({{ salaryUnit === 'hourly' ? '원' : '만원' }})
      <input v-model="salaryInputFormatted" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      월 소정근로시간
      <input v-model.number="monthlyHours" type="number" inputmode="numeric" min="1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <p class="text-[11px] text-muted-foreground/70">기본값 209시간은 주 40시간 근무제의 법정 통상임금 산정 기준시간(유급주휴 포함)입니다 — 평균이 아니라 표준값이며, 계약 근로시간이 다르면 바꿔주세요.</p>
    <div v-if="belowMinimumWage" class="text-[13px] text-destructive">2026년 최저임금({{ MINIMUM_WAGE_2026_HOURLY.toLocaleString() }}원) 미만입니다.</div>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
      <div
          v-for="s in [
            {label: '시급', value: hourlyValue},
            {label: `월급(${monthlyHours}시간 기준)`, value: monthlyValue},
            {label: '연봉', value: annualValue},
          ]"
          :key="s.label"
          class="flex flex-col items-center gap-1 rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 py-3"
      >
        <span class="font-mono text-base font-semibold text-zone-accent-life">{{ s.value.toLocaleString() }}원</span>
        <span class="text-[11px] text-muted-foreground">{{ s.label }}</span>
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground/70">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {annualToMonthly, hourlyToMonthly, isBelowMinimumWage2026, monthlyToAnnual, monthlyToHourly} from '../../utils/salaryCalc'
import {MINIMUM_WAGE_2026_HOURLY} from '../../utils/salaryRates2026'
import {useCommaNumberInput} from '../../utils/commaNumberInput'
import {MANWON} from '../../utils/money'

type SalaryUnit = 'hourly' | 'monthly' | 'annual'
const SALARY_UNIT_LABEL: Record<SalaryUnit, string> = {hourly: '시급', monthly: '월급', annual: '연봉'}
const SALARY_UNIT_DEFAULT: Record<SalaryUnit, number> = {hourly: MINIMUM_WAGE_2026_HOURLY, monthly: 216, annual: 3_000}
const salaryUnit = ref<SalaryUnit>('hourly')
const salaryInput = ref(SALARY_UNIT_DEFAULT.hourly)
const salaryInputFormatted = useCommaNumberInput(salaryInput)
const monthlyHours = ref(209)

watch(salaryUnit, unit => {
  salaryInput.value = SALARY_UNIT_DEFAULT[unit]
})

const salaryInputWon = computed(() => salaryUnit.value === 'hourly' ? salaryInput.value : salaryInput.value * MANWON)

const hourlyValue = computed(() => {
  if (salaryUnit.value === 'hourly') return salaryInputWon.value
  if (salaryUnit.value === 'monthly') return monthlyToHourly(salaryInputWon.value, monthlyHours.value)
  return monthlyToHourly(annualToMonthly(salaryInputWon.value), monthlyHours.value)
})
const monthlyValue = computed(() => {
  if (salaryUnit.value === 'monthly') return salaryInputWon.value
  if (salaryUnit.value === 'hourly') return hourlyToMonthly(salaryInputWon.value, monthlyHours.value)
  return annualToMonthly(salaryInputWon.value)
})
const annualValue = computed(() => {
  if (salaryUnit.value === 'annual') return salaryInputWon.value
  if (salaryUnit.value === 'monthly') return monthlyToAnnual(salaryInputWon.value)
  return monthlyToAnnual(hourlyToMonthly(salaryInputWon.value, monthlyHours.value))
})
const belowMinimumWage = computed(() => salaryUnit.value === 'hourly' && isBelowMinimumWage2026(salaryInputWon.value))
</script>

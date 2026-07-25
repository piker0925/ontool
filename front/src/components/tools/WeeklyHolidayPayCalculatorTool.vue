<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      1주 소정근로시간
      <input v-model.number="weeklyScheduledHours" type="number" inputmode="decimal" min="0" step="0.5" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      시급(원)
      <input v-model="hourlyWageInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div v-if="weeklyScheduledHours < 15" class="text-[13px] text-destructive">1주 소정근로시간이 15시간 미만이면 주휴수당 지급 대상이 아닙니다.</div>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">주휴수당</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ holidayPay.toLocaleString() }}원</div>
    </div>
    <p class="text-[11px] text-muted-foreground">지급시간 = min(소정근로시간, 40시간) ÷ 40 × 8시간, 개근을 전제로 합니다</p>
    <p class="text-[11px] text-muted-foreground">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcWeeklyHolidayPay} from '../../utils/salaryCalc'
import {MINIMUM_WAGE_2026_HOURLY} from '../../utils/salaryRates2026'
import {useCommaNumberInput} from '../../utils/commaNumberInput'

const weeklyScheduledHours = ref(40)
const hourlyWage = ref(MINIMUM_WAGE_2026_HOURLY)
const hourlyWageInput = useCommaNumberInput(hourlyWage)

const holidayPay = computed(() => calcWeeklyHolidayPay(weeklyScheduledHours.value, hourlyWage.value))
</script>

<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      이직 전 1일 평균임금(원)
      <input v-model="averageDailyWageInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      이직 시 연령
      <input v-model.number="ageAtSeparation" type="number" inputmode="numeric" min="15" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      고용보험 가입기간(개월)
      <input v-model.number="insuredPeriodMonths" type="number" inputmode="numeric" min="0" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex items-center gap-2 text-[13px]">
      <input v-model="hasDisability" type="checkbox" class="size-4 rounded border-input"/>
      장애인
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">예상 구직급여 총액</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ result.totalBenefit.toLocaleString() }}원</div>
    </div>
    <div class="divide-y divide-border rounded-lg border border-border">
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">1일 지급액</span>
        <span class="font-mono text-foreground">{{ result.dailyBenefit.toLocaleString() }}원</span>
      </div>
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">소정급여일수</span>
        <span class="font-mono text-foreground">{{ result.benefitDays }}일</span>
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground">1일 지급액 = 평균임금의 60%(상한 68,100원·하한 66,048원), 소정급여일수는 연령·가입기간별 표 기준(고용보험법 별표1)</p>
    <p class="text-[11px] text-muted-foreground">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcTotalUnemploymentBenefit} from '../../utils/unemploymentBenefitCalc'
import {useCommaNumberInput} from '../../utils/commaNumberInput'

const averageDailyWage = ref(112_000)
const averageDailyWageInput = useCommaNumberInput(averageDailyWage)
const ageAtSeparation = ref(30)
const insuredPeriodMonths = ref(25)
const hasDisability = ref(false)

const result = computed(() => calcTotalUnemploymentBenefit(averageDailyWage.value, ageAtSeparation.value, insuredPeriodMonths.value, hasDisability.value))
</script>

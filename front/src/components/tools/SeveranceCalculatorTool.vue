<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      입사일
      <input v-model="hireDate" type="date" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      퇴사일(예정일도 가능)
      <input v-model="leaveDate" type="date" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div v-if="dateRangeInvalid" class="text-[13px] text-destructive">퇴사일이 입사일보다 빠릅니다.</div>
    <label class="flex flex-col gap-1.5 text-[13px]">
      퇴직 전 3개월 임금총액(만원)
      <input v-model="threeMonthWageManwonInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <p class="text-[11px] text-muted-foreground/70">최근 3개월 급여명세서의 세전 총액(기본급+제수당)을 더한 값이에요. 재직일수와 3개월 산정기간 일수는 입사일·퇴사일로 자동 계산됩니다.</p>

    <details class="rounded-lg border border-border px-3 py-2 text-[13px]">
      <summary class="cursor-pointer select-none text-muted-foreground">상여금·연차수당이 있나요? (선택 입력, 더 정확해집니다)</summary>
      <div class="mt-3 flex flex-col gap-3">
        <label class="flex flex-col gap-1.5">
          최근 1년간 지급된 상여금 총액(만원)
          <input v-model="annualBonusManwonInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
        </label>
        <label class="flex flex-col gap-1.5">
          최근 1년간 지급된 연차수당(만원)
          <input v-model="annualLeaveAllowanceManwonInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
        </label>
      </div>
    </details>

    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">예상 퇴직금</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ severancePay.toLocaleString() }}원</div>
    </div>
    <div class="divide-y divide-border rounded-lg border border-border">
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">재직일수</span>
        <span class="font-mono text-foreground">{{ tenureDays }}일</span>
      </div>
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">1일 평균임금(상여금·연차수당 3/12 안분 반영)</span>
        <span class="font-mono text-foreground">{{ averageDailyWage.toLocaleString() }}원</span>
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground/70">근로기준법 §2 평균임금 · 근로자퇴직급여 보장법 §8 기준(30일분 × 근속연수). 통상임금과의 최저한도 비교는 포함하지 않은 단순 모델이라 실제 수령액과 다를 수 있습니다 — 정확한 금액은 회사 인사팀 또는 고용노동부에 확인하세요.</p>
    <p class="text-[11px] text-muted-foreground/70">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcAverageDailyWage, calcSeverancePay, daysBetweenInclusive, threeMonthPeriodDays} from '../../utils/salaryCalc'
import {useCommaNumberInput} from '../../utils/commaNumberInput'
import {MANWON} from '../../utils/money'
import {todayDateString} from '../../utils/todayDateString'

const todayForDefault = new Date()
const leaveDate = ref(todayDateString(todayForDefault))
const hireDateDefault = new Date(todayForDefault)
hireDateDefault.setFullYear(hireDateDefault.getFullYear() - 1)
const hireDate = ref(todayDateString(hireDateDefault))

const dateRangeInvalid = computed(() => !!hireDate.value && !!leaveDate.value && new Date(leaveDate.value) < new Date(hireDate.value))
const tenureDays = computed(() => {
  if (!hireDate.value || !leaveDate.value || dateRangeInvalid.value) return 0
  return daysBetweenInclusive(hireDate.value, leaveDate.value)
})
const threeMonthDays = computed(() => {
  if (!leaveDate.value) return 1
  const days = threeMonthPeriodDays(leaveDate.value)
  return days > 0 ? days : 1
})

const threeMonthWageManwon = ref(900)
const threeMonthWageManwonInput = useCommaNumberInput(threeMonthWageManwon)
const annualBonusManwon = ref(0)
const annualBonusManwonInput = useCommaNumberInput(annualBonusManwon)
const annualLeaveAllowanceManwon = ref(0)
const annualLeaveAllowanceManwonInput = useCommaNumberInput(annualLeaveAllowanceManwon)
const averageDailyWage = computed(() => calcAverageDailyWage(
    threeMonthWageManwon.value * MANWON,
    threeMonthDays.value,
    annualBonusManwon.value * MANWON,
    annualLeaveAllowanceManwon.value * MANWON,
))
const severancePay = computed(() => calcSeverancePay(averageDailyWage.value, tenureDays.value))
</script>

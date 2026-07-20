<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      연봉(세전, 만원)
      <input v-model="annualSalaryManwonInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      공제대상가족수(본인 포함)
      <input v-model.number="dependents" type="number" inputmode="numeric" min="1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      8~20세 자녀 수 (공제대상가족수와 별개로 추가 세액공제)
      <input v-model.number="childrenAged8to20" type="number" inputmode="numeric" min="0" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      월 비과세 소득(식대·자가운전보조금 등, 만원, 없으면 0)
      <input v-model="nonTaxableManwonInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">월 실수령액(추정)</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ netPay.netPay.toLocaleString() }}원</div>
      <div v-if="nonTaxableManwon > 0" class="mt-1 text-[11px] text-muted-foreground">비과세 소득 {{ (nonTaxableManwon * MANWON).toLocaleString() }}원은 과세 계산에서 제외하고 그대로 더한 값입니다</div>
    </div>
    <div class="divide-y divide-border rounded-lg border border-border">
      <div v-for="row in netPayBreakdown" :key="row.label" class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">{{ row.label }}</span>
        <span class="font-mono text-foreground">{{ row.value.toLocaleString() }}원</span>
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground/70">국세청 근로소득 간이세액표(2026.03.01 시행분, 소득세법 시행령 별표2) 기준</p>
    <p class="text-[11px] text-muted-foreground/70">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {annualToMonthly, calcMonthlyNetPayWithNonTaxable} from '../../utils/salaryCalc'
import {useCommaNumberInput} from '../../utils/commaNumberInput'
import {MANWON} from '../../utils/money'

const annualSalaryManwon = ref(3_000)
const annualSalaryManwonInput = useCommaNumberInput(annualSalaryManwon)
const dependents = ref(1)
const childrenAged8to20 = ref(0)
const nonTaxableManwon = ref(0)
const nonTaxableManwonInput = useCommaNumberInput(nonTaxableManwon)
const netPay = computed(() => calcMonthlyNetPayWithNonTaxable(
    annualToMonthly(annualSalaryManwon.value * MANWON),
    nonTaxableManwon.value * MANWON,
    dependents.value,
    childrenAged8to20.value,
))
const netPayBreakdown = computed(() => [
  {label: '국민연금', value: netPay.value.nationalPension},
  {label: '건강보험', value: netPay.value.healthInsurance},
  {label: '장기요양보험', value: netPay.value.longTermCare},
  {label: '고용보험', value: netPay.value.employmentInsurance},
  {label: '소득세', value: netPay.value.incomeTax},
  {label: '지방소득세', value: netPay.value.localIncomeTax},
])
</script>

<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      과세표준(원)
      <input v-model="taxableIncomeInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <p class="text-[11px] text-muted-foreground">각종 소득공제를 이미 반영한 "과세표준" 금액을 입력하세요(총소득이 아닙니다)</p>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">산출세액(소득세 + 지방소득세)</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ totalTax.toLocaleString() }}원</div>
    </div>
    <div class="divide-y divide-border rounded-lg border border-border">
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">종합소득세</span>
        <span class="font-mono text-foreground">{{ incomeTax.toLocaleString() }}원</span>
      </div>
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">지방소득세(10%)</span>
        <span class="font-mono text-foreground">{{ localTax.toLocaleString() }}원</span>
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground">소득세법 §55 누진세율표 기준(6%~45%)</p>
    <p class="text-[11px] text-muted-foreground">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcIncomeTax, calcLocalIncomeTaxForIncomeTax} from '../../utils/incomeTaxCalc'
import {useCommaNumberInput} from '../../utils/commaNumberInput'

const taxableIncome = ref(30_000_000)
const taxableIncomeInput = useCommaNumberInput(taxableIncome)

const incomeTax = computed(() => calcIncomeTax(taxableIncome.value))
const localTax = computed(() => calcLocalIncomeTaxForIncomeTax(incomeTax.value))
const totalTax = computed(() => incomeTax.value + localTax.value)
</script>

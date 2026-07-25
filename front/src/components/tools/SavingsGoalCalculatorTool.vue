<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      목표 금액(만원)
      <input v-model="targetManwonInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      연이율(%)
      <input v-model.number="annualRatePercent" type="number" inputmode="decimal" min="0" step="0.1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      기간(개월)
      <input v-model.number="months" type="number" inputmode="numeric" min="1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">매월 필요한 저축액</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ requiredMonthly.toLocaleString() }}원</div>
    </div>
    <p class="text-[11px] text-muted-foreground">적금(단리, 매월 초 납입 기준) 공식을 목표 금액에 맞춰 역산한 값입니다</p>
    <p class="text-[11px] text-muted-foreground">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcRequiredMonthlySavings} from '../../utils/financeCalc'
import {useCommaNumberInput} from '../../utils/commaNumberInput'
import {MANWON} from '../../utils/money'

const targetManwon = ref(1_278)
const targetManwonInput = useCommaNumberInput(targetManwon)
const annualRatePercent = ref(12)
const months = ref(12)

const requiredMonthly = computed(() => calcRequiredMonthlySavings(targetManwon.value * MANWON, annualRatePercent.value, months.value))
</script>

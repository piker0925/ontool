<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      이용원금(만원)
      <input v-model="principalManwonInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      할부 수수료율(연 %)
      <input v-model.number="annualFeeRatePercent" type="number" inputmode="decimal" min="0" step="0.1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      할부 개월수
      <input v-model.number="months" type="number" inputmode="numeric" min="1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">월 할부금</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ result.monthlyPayment.toLocaleString() }}원</div>
    </div>
    <div class="divide-y divide-border rounded-lg border border-border">
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">총 수수료</span>
        <span class="font-mono text-foreground">{{ result.totalFee.toLocaleString() }}원</span>
      </div>
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">총 납부액</span>
        <span class="font-mono text-foreground">{{ result.totalPayment.toLocaleString() }}원</span>
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground">카드사·개월수별 실제 수수료율은 다를 수 있습니다</p>
    <p class="text-[11px] text-muted-foreground">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcInstallment} from '../../utils/financeCalc'
import {useCommaNumberInput} from '../../utils/commaNumberInput'
import {MANWON} from '../../utils/money'

const principalManwon = ref(120)
const principalManwonInput = useCommaNumberInput(principalManwon)
const annualFeeRatePercent = ref(12)
const months = ref(6)

const result = computed(() => calcInstallment(principalManwon.value * MANWON, annualFeeRatePercent.value, months.value))
</script>

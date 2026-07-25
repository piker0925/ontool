<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      원금(만원)
      <input v-model="principalManwonInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
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
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">만기수령액</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ result.maturityAmount.toLocaleString() }}원</div>
    </div>
    <div class="divide-y divide-border rounded-lg border border-border">
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">원금</span>
        <span class="font-mono text-foreground">{{ result.principalTotal.toLocaleString() }}원</span>
      </div>
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">이자(월복리)</span>
        <span class="font-mono text-foreground">{{ result.interest.toLocaleString() }}원</span>
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground">월복리 기준이며 실제 상품 조건에 따라 다를 수 있습니다</p>
    <p class="text-[11px] text-muted-foreground">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {compoundInterest} from '../../utils/financeCalc'
import {useCommaNumberInput} from '../../utils/commaNumberInput'
import {MANWON} from '../../utils/money'

const principalManwon = ref(1_000)
const principalManwonInput = useCommaNumberInput(principalManwon)
const annualRatePercent = ref(6)
const months = ref(12)

const result = computed(() => compoundInterest(principalManwon.value * MANWON, annualRatePercent.value, months.value))
</script>

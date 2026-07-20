<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      상품 종류
      <select v-model="depositKind" class="rounded-md border border-input bg-background px-3 py-2">
        <option value="lump-sum">예금(거치식)</option>
        <option value="installment">적금(적립식)</option>
      </select>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      {{ depositKind === 'lump-sum' ? '예치금(만원)' : '월 납입액(만원)' }}
      <input v-model="depositAmountManwonInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      연이자율(%)
      <input v-model="depositRateInput" type="text" inputmode="decimal" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      {{ depositKind === 'lump-sum' ? '예치기간(개월)' : '납입기간(개월)' }}
      <input v-model.number="depositMonths" type="number" inputmode="numeric" min="1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">세전 이자</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ depositResult.interest.toLocaleString() }}원</div>
    </div>
    <div class="divide-y divide-border rounded-lg border border-border">
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">원금 합계</span>
        <span class="font-mono text-foreground">{{ depositResult.principalTotal.toLocaleString() }}원</span>
      </div>
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">만기수령액(세전)</span>
        <span class="font-mono text-foreground">{{ depositResult.maturityAmount.toLocaleString() }}원</span>
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground/70">단리·세전 기준 참고용 계산입니다. 실제 상품은 복리·우대금리·이자소득세(15.4%) 적용 여부에 따라 다를 수 있습니다.</p>
    <p class="text-[11px] text-muted-foreground/70">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {depositMaturity, savingsMaturity} from '../../utils/financeCalc'
import {useCommaNumberInput} from '../../utils/commaNumberInput'
import {MANWON} from '../../utils/money'

type DepositKind = 'lump-sum' | 'installment'
const depositKind = ref<DepositKind>('lump-sum')
const depositAmountManwon = ref(1_000)
const depositAmountManwonInput = useCommaNumberInput(depositAmountManwon)
const depositRate = ref(3.5)
const depositRateInput = useCommaNumberInput(depositRate)
const depositMonths = ref(12)

const depositResult = computed(() => {
  const amount = depositAmountManwon.value * MANWON
  return depositKind.value === 'lump-sum'
      ? depositMaturity(amount, depositRate.value, depositMonths.value)
      : savingsMaturity(amount, depositRate.value, depositMonths.value)
})
</script>

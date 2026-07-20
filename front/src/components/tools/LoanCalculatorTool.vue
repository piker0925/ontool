<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      상환 방식
      <select v-model="loanMethod" class="rounded-md border border-input bg-background px-3 py-2">
        <option value="equal-payment">원리금균등상환</option>
        <option value="equal-principal">원금균등상환</option>
      </select>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      대출원금(만원)
      <input v-model="loanPrincipalManwonInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      연이자율(%)
      <input v-model="loanRateInput" type="text" inputmode="decimal" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      대출기간(개월)
      <input v-model.number="loanMonths" type="number" inputmode="numeric" min="1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">총 이자</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ loanTotalInterest.toLocaleString() }}원</div>
    </div>
    <div class="divide-y divide-border rounded-lg border border-border">
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">원금</span>
        <span class="font-mono text-foreground">{{ (loanPrincipalManwon * MANWON).toLocaleString() }}원</span>
      </div>
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">총 상환액(원금+이자)</span>
        <span class="font-mono text-foreground">{{ loanTotalPayment.toLocaleString() }}원</span>
      </div>
    </div>
    <div class="max-h-[360px] overflow-auto rounded-lg border border-border">
      <table class="w-full min-w-[420px] text-[12px]">
        <thead class="sticky top-0 bg-card">
          <tr class="border-b border-border text-muted-foreground">
            <th class="px-2 py-2 text-left font-medium">회차</th>
            <th class="px-2 py-2 text-right font-medium">상환액</th>
            <th class="px-2 py-2 text-right font-medium">원금</th>
            <th class="px-2 py-2 text-right font-medium">이자</th>
            <th class="px-2 py-2 text-right font-medium">잔액</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60 font-mono">
          <tr v-for="row in loanSchedule" :key="row.term">
            <td class="px-2 py-1.5 text-muted-foreground">{{ row.term }}</td>
            <td class="px-2 py-1.5 text-right text-foreground">{{ row.payment.toLocaleString() }}</td>
            <td class="px-2 py-1.5 text-right text-foreground">{{ row.principalPortion.toLocaleString() }}</td>
            <td class="px-2 py-1.5 text-right text-foreground">{{ row.interestPortion.toLocaleString() }}</td>
            <td class="px-2 py-1.5 text-right text-foreground">{{ row.balance.toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-[11px] text-muted-foreground/70">원리금균등은 매회 상환액이 동일, 원금균등은 원금이 동일하고 이자가 점차 줄어듭니다. 중도상환수수료·우대금리는 반영하지 않은 단순 모델입니다.</p>
    <p class="text-[11px] text-muted-foreground/70">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {equalPaymentSchedule, equalPrincipalSchedule} from '../../utils/financeCalc'
import {useCommaNumberInput} from '../../utils/commaNumberInput'
import {MANWON} from '../../utils/money'

type LoanMethod = 'equal-payment' | 'equal-principal'
const loanMethod = ref<LoanMethod>('equal-payment')
const loanPrincipalManwon = ref(1_000)
const loanPrincipalManwonInput = useCommaNumberInput(loanPrincipalManwon)
const loanRate = ref(4.5)
const loanRateInput = useCommaNumberInput(loanRate)
const loanMonths = ref(12)

const loanSchedule = computed(() => {
  const principal = loanPrincipalManwon.value * MANWON
  return loanMethod.value === 'equal-payment'
      ? equalPaymentSchedule(principal, loanRate.value, loanMonths.value)
      : equalPrincipalSchedule(principal, loanRate.value, loanMonths.value)
})
const loanTotalInterest = computed(() => loanSchedule.value.reduce((sum, row) => sum + row.interestPortion, 0))
const loanTotalPayment = computed(() => loanSchedule.value.reduce((sum, row) => sum + row.payment, 0))
</script>

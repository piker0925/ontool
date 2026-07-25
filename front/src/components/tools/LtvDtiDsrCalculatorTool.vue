<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      대출금액(만원)
      <input v-model="loanAmountInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      담보가치(주택가격, 만원)
      <input v-model="collateralValueInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      연소득(만원)
      <input v-model="annualIncomeInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      주담대 연원리금상환액(만원)
      <input v-model="housingLoanRepaymentInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      기타부채 연이자상환액(만원)
      <input v-model="otherDebtInterestInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      총부채 연원리금상환액(만원, DSR용)
      <input v-model="totalDebtRepaymentInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
      <div class="flex flex-col items-center gap-1 rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 py-3">
        <span class="font-mono text-base font-semibold text-zone-accent-life">{{ ltv.toFixed(1) }}%</span>
        <span class="text-[11px] text-muted-foreground">LTV</span>
      </div>
      <div class="flex flex-col items-center gap-1 rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 py-3">
        <span class="font-mono text-base font-semibold text-zone-accent-life">{{ dti.toFixed(1) }}%</span>
        <span class="text-[11px] text-muted-foreground">DTI</span>
      </div>
      <div class="flex flex-col items-center gap-1 rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 py-3">
        <span class="font-mono text-base font-semibold text-zone-accent-life">{{ dsr.toFixed(1) }}%</span>
        <span class="text-[11px] text-muted-foreground">DSR</span>
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground">간단 추정용 비율 계산입니다 — 규제지역별·정책별 실제 한도는 계속 바뀌므로 대출 시점 금융기관·정부 공고를 반드시 확인하세요</p>
    <p class="text-[11px] text-muted-foreground">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcDsr, calcDti, calcLtv} from '../../utils/ltvDtiDsrCalc'
import {useCommaNumberInput} from '../../utils/commaNumberInput'
import {MANWON} from '../../utils/money'

const loanAmount = ref(35_000)
const loanAmountInput = useCommaNumberInput(loanAmount)
const collateralValue = ref(50_000)
const collateralValueInput = useCommaNumberInput(collateralValue)
const annualIncome = ref(5_500)
const annualIncomeInput = useCommaNumberInput(annualIncome)
const housingLoanRepayment = ref(2_000)
const housingLoanRepaymentInput = useCommaNumberInput(housingLoanRepayment)
const otherDebtInterest = ref(200)
const otherDebtInterestInput = useCommaNumberInput(otherDebtInterest)
const totalDebtRepayment = ref(2_500)
const totalDebtRepaymentInput = useCommaNumberInput(totalDebtRepayment)

const ltv = computed(() => calcLtv(loanAmount.value * MANWON, collateralValue.value * MANWON))
const dti = computed(() => calcDti(housingLoanRepayment.value * MANWON, otherDebtInterest.value * MANWON, annualIncome.value * MANWON))
const dsr = computed(() => calcDsr(totalDebtRepayment.value * MANWON, annualIncome.value * MANWON))
</script>

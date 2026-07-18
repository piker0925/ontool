<template>
  <div class="flex flex-col gap-4">
    <div class="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
      <button
          v-for="t in TABS"
          :key="t.id"
          :class="tab === t.id
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
          class="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors sm:flex-1"
          @click="tab = t.id"
      >{{ t.label }}
      </button>
    </div>

    <div class="rounded-xl border border-border bg-card p-4">
      <div v-if="tab === 'loan'" data-testid="tab-panel-loan" class="flex flex-col gap-3">
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
      </div>

      <div v-else-if="tab === 'deposit'" data-testid="tab-panel-deposit" class="flex flex-col gap-3">
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
      </div>

      <div v-else-if="tab === 'jeonse'" data-testid="tab-panel-jeonse" class="flex flex-col gap-3">
        <label class="flex flex-col gap-1.5 text-[13px]">
          방향
          <select v-model="jeonseDirection" class="rounded-md border border-input bg-background px-3 py-2">
            <option value="deposit-to-rent">보증금 차액 → 월세</option>
            <option value="rent-to-deposit">월세 → 보증금 차액</option>
            <option value="rate-from-both">보증금 차액 + 월세 → 전환율 계산</option>
          </select>
        </label>

        <template v-if="jeonseDirection === 'rate-from-both'">
          <label class="flex flex-col gap-1.5 text-[13px]">
            보증금 차액(만원)
            <input v-model="jeonseDepositDiffManwonInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
          </label>
          <label class="flex flex-col gap-1.5 text-[13px]">
            월세(만원)
            <input v-model="jeonseMonthlyRentManwonInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
          </label>
        </template>
        <template v-else>
          <label class="flex flex-col gap-1.5 text-[13px]">
            {{ jeonseDirection === 'deposit-to-rent' ? '보증금 차액(만원)' : '월세(만원)' }}
            <input v-model="jeonseInputManwonInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
          </label>
          <label class="flex flex-col gap-1.5 text-[13px]">
            적용 전환율(%)
            <input v-model="jeonseRateInput" type="text" inputmode="decimal" class="rounded-md border border-input bg-background px-3 py-2"/>
          </label>
        </template>

        <label class="flex flex-col gap-1.5 text-[13px]">
          현재 한국은행 기준금리(%) — 법정 상한 비교용
          <input v-model="jeonseBaseRateInput" type="text" inputmode="decimal" class="rounded-md border border-input bg-background px-3 py-2"/>
        </label>

        <div v-if="jeonseExceedsCap" class="text-[13px] text-destructive">
          적용 전환율 {{ jeonseEffectiveRate.toFixed(2) }}%가 법정 상한 {{ jeonseLegalCap.toFixed(2) }}%(기준금리 + 2.0%p)를 초과합니다.
        </div>

        <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
          <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {{ jeonseDirection === 'deposit-to-rent' ? '환산 월세' : jeonseDirection === 'rent-to-deposit' ? '환산 보증금 차액' : '적용 전환율' }}
          </div>
          <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">
            <template v-if="jeonseDirection === 'rate-from-both'">{{ jeonseDerivedRate.toFixed(2) }}%</template>
            <template v-else>{{ jeonseResultWon.toLocaleString() }}원</template>
          </div>
        </div>
        <p class="text-[11px] text-muted-foreground/70">법정 전환율 상한은 한국은행 기준금리 + 2.0%p입니다(주택임대차보호법 시행령 §9, 산정률은 한국부동산원·LH 임대차분쟁조정위원회 공식 계산기 기준). 기준금리는 계속 바뀌는 값이라 최신 값을 직접 확인해 입력하세요.</p>
      </div>

      <div v-else-if="tab === 'vat'" data-testid="tab-panel-vat" class="flex flex-col gap-3">
        <label class="flex flex-col gap-1.5 text-[13px]">
          방향
          <select v-model="vatDirection" class="rounded-md border border-input bg-background px-3 py-2">
            <option value="supply-to-vat">공급가액 → 부가세</option>
            <option value="total-to-supply">부가세 포함가 → 공급가액</option>
          </select>
        </label>
        <label class="flex flex-col gap-1.5 text-[13px]">
          {{ vatDirection === 'supply-to-vat' ? '공급가액(만원)' : '부가세 포함가(만원)' }}
          <input v-model="vatInputManwonInput" type="text" inputmode="numeric" class="rounded-md border border-input bg-background px-3 py-2"/>
        </label>
        <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
          <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">부가세(10%)</div>
          <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ vatBreakdown.vat.toLocaleString() }}원</div>
        </div>
        <div class="divide-y divide-border rounded-lg border border-border">
          <div class="flex items-center justify-between px-3 py-2 text-[13px]">
            <span class="text-muted-foreground">공급가액</span>
            <span class="font-mono text-foreground">{{ vatBreakdown.supply.toLocaleString() }}원</span>
          </div>
          <div class="flex items-center justify-between px-3 py-2 text-[13px]">
            <span class="text-muted-foreground">합계(부가세 포함)</span>
            <span class="font-mono text-foreground">{{ vatBreakdown.total.toLocaleString() }}원</span>
          </div>
        </div>
        <p class="text-[11px] text-muted-foreground/70">부가가치세법 §30 — 세율 10% 기준</p>
      </div>
    </div>

    <p class="text-[11px] text-muted-foreground/70">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {
  conversionRateFromDepositAndRent,
  depositMaturity,
  depositToMonthlyRent,
  equalPaymentSchedule,
  equalPrincipalSchedule,
  legalConversionRateCap,
  monthlyRentToDeposit,
  savingsMaturity,
  supplyToVat,
  totalToSupply,
} from '../utils/financeCalc'
import {JEONSE_CONVERSION_ADDON_RATE_2026} from '../utils/financeRates2026'
import {useCommaNumberInput} from '../utils/commaNumberInput'

type TabId = 'loan' | 'deposit' | 'jeonse' | 'vat'

const TABS: {id: TabId; label: string}[] = [
  {id: 'loan', label: '대출 원리금'},
  {id: 'deposit', label: '예금/적금'},
  {id: 'jeonse', label: '전월세 전환'},
  {id: 'vat', label: '부가세'},
]

const MANWON = 10_000

const route = useRoute()
const router = useRouter()

const initialTab = typeof route.query.tab === 'string' && TABS.some(t => t.id === route.query.tab)
    ? route.query.tab as TabId
    : TABS[0].id

const tab = ref<TabId>(initialTab)

watch(tab, id => {
  if (route.query.tab === id) return
  router.replace({query: {...route.query, tab: id}})
})
watch(() => route.query.tab, q => {
  if (typeof q === 'string' && q !== tab.value && TABS.some(t => t.id === q)) tab.value = q as TabId
})

// 대출 원리금
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

// 예금/적금
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

// 전월세 전환
type JeonseDirection = 'deposit-to-rent' | 'rent-to-deposit' | 'rate-from-both'
const jeonseDirection = ref<JeonseDirection>('deposit-to-rent')
const jeonseInputManwon = ref(12_000)
const jeonseInputManwonInput = useCommaNumberInput(jeonseInputManwon)
const jeonseRate = ref(4)
const jeonseRateInput = useCommaNumberInput(jeonseRate)

const jeonseDepositDiffManwon = ref(12_000)
const jeonseDepositDiffManwonInput = useCommaNumberInput(jeonseDepositDiffManwon)
const jeonseMonthlyRentManwon = ref(40)
const jeonseMonthlyRentManwonInput = useCommaNumberInput(jeonseMonthlyRentManwon)

const jeonseBaseRate = ref(2.75)
const jeonseBaseRateInput = useCommaNumberInput(jeonseBaseRate)

watch(jeonseDirection, direction => {
  if (direction === 'deposit-to-rent') jeonseInputManwon.value = 12_000
  else if (direction === 'rent-to-deposit') jeonseInputManwon.value = 50
})

const jeonseResultWon = computed(() => jeonseDirection.value === 'deposit-to-rent'
    ? depositToMonthlyRent(jeonseInputManwon.value * MANWON, jeonseRate.value)
    : monthlyRentToDeposit(jeonseInputManwon.value * MANWON, jeonseRate.value))

const jeonseDerivedRate = computed(() => conversionRateFromDepositAndRent(
    jeonseDepositDiffManwon.value * MANWON,
    jeonseMonthlyRentManwon.value * MANWON,
))

const jeonseEffectiveRate = computed(() => jeonseDirection.value === 'rate-from-both' ? jeonseDerivedRate.value : jeonseRate.value)
const jeonseLegalCap = computed(() => legalConversionRateCap(jeonseBaseRate.value, JEONSE_CONVERSION_ADDON_RATE_2026))
const jeonseExceedsCap = computed(() => jeonseEffectiveRate.value > jeonseLegalCap.value)

// 부가세
type VatDirection = 'supply-to-vat' | 'total-to-supply'
const vatDirection = ref<VatDirection>('supply-to-vat')
const vatInputManwon = ref(100)
const vatInputManwonInput = useCommaNumberInput(vatInputManwon)

const vatBreakdown = computed(() => {
  const inputWon = vatInputManwon.value * MANWON
  if (vatDirection.value === 'supply-to-vat') {
    const vat = supplyToVat(inputWon)
    return {supply: inputWon, vat, total: inputWon + vat}
  }
  const supply = totalToSupply(inputWon)
  return {supply, vat: inputWon - supply, total: inputWon}
})
</script>

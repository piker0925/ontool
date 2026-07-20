<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
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
    <p class="text-[11px] text-muted-foreground/70">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {conversionRateFromDepositAndRent, depositToMonthlyRent, legalConversionRateCap, monthlyRentToDeposit} from '../../utils/financeCalc'
import {JEONSE_CONVERSION_ADDON_RATE_2026} from '../../utils/financeRates2026'
import {useCommaNumberInput} from '../../utils/commaNumberInput'
import {MANWON} from '../../utils/money'

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
</script>

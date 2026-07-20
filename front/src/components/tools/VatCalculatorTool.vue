<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
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
    <p class="text-[11px] text-muted-foreground/70">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {supplyToVat, totalToSupply} from '../../utils/financeCalc'
import {useCommaNumberInput} from '../../utils/commaNumberInput'
import {MANWON} from '../../utils/money'

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

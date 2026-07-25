<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      근속 개월수
      <input v-model.number="monthsOfService" type="number" inputmode="numeric" min="0" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">연차유급휴가</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ leaveDays }}일</div>
    </div>
    <p class="text-[11px] text-muted-foreground">근로기준법 §60 기준 — 1년 미만은 개근 개월마다 1일(최대 11일), 1년 이상은 15일부터 매 2년마다 1일 가산(최대 25일)</p>
    <p class="text-[11px] text-muted-foreground">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcAnnualLeaveDays} from '../../utils/salaryCalc'

const monthsOfService = ref(24)

const leaveDays = computed(() => calcAnnualLeaveDays(monthsOfService.value))
</script>

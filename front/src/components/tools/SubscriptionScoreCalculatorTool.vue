<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      무주택기간(년)
      <input v-model.number="noHomeownershipYears" type="number" inputmode="decimal" min="0" step="0.5" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      부양가족수(명)
      <input v-model.number="dependents" type="number" inputmode="numeric" min="0" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      청약통장 가입기간(개월)
      <input v-model.number="accountPeriodMonths" type="number" inputmode="numeric" min="0" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">청약 가점(만점 84점)</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ result.totalScore }}점</div>
    </div>
    <div class="divide-y divide-border rounded-lg border border-border">
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">무주택기간(최대 32점)</span>
        <span class="font-mono text-foreground">{{ result.noHomeownershipScore }}점</span>
      </div>
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">부양가족수(최대 35점)</span>
        <span class="font-mono text-foreground">{{ result.dependentsScore }}점</span>
      </div>
      <div class="flex items-center justify-between px-3 py-2 text-[13px]">
        <span class="text-muted-foreground">가입기간(최대 17점)</span>
        <span class="font-mono text-foreground">{{ result.accountPeriodScore }}점</span>
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground">주택공급에 관한 규칙 별표1 기준(청약 가점제)</p>
    <p class="text-[11px] text-muted-foreground">참고용 계산이며 법적 효력이 없습니다 · 2026년 기준</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcSubscriptionScore} from '../../utils/subscriptionScoreCalc'

const noHomeownershipYears = ref(5)
const dependents = ref(3)
const accountPeriodMonths = ref(60)

const result = computed(() => calcSubscriptionScore(noHomeownershipYears.value, dependents.value, accountPeriodMonths.value))
</script>

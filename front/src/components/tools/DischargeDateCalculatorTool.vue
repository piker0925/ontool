<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      입대일
      <input v-model="enlistmentDate" type="date" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      복무기간(개월)
      <input v-model.number="serviceMonths" type="number" inputmode="numeric" min="1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <template v-if="enlistmentDate">
        <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">전역일</div>
        <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ dischargeDate }}</div>
      </template>
      <div v-else class="text-[13px] text-muted-foreground">입대일을 입력하면 전역일을 계산합니다</div>
    </div>
    <p class="text-[11px] text-muted-foreground">입대일을 복무 1일차로 포함해 계산합니다(입대일 + 복무기간 − 1일)</p>
    <p class="text-[11px] text-muted-foreground">참고용 계산입니다 · 실제와 다를 수 있습니다</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcDischargeDate} from '../../utils/dateCalc'
import {todayDateString} from '../../utils/todayDateString'

const enlistmentDate = ref(todayDateString())
const serviceMonths = ref(18)

const dischargeDate = computed(() => enlistmentDate.value ? calcDischargeDate(enlistmentDate.value, serviceMonths.value) : '')
</script>

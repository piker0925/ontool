<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      출생일
      <input v-model="birthDate" type="date" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      기준일
      <input v-model="baseDate" type="date" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">육아 개월수</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ babyAge.months }}개월 {{ babyAge.days }}일</div>
    </div>
    <p class="text-[11px] text-muted-foreground/70">참고용 계산입니다 · 실제와 다를 수 있습니다</p>
    <p class="text-[11px] text-muted-foreground/70">의료적 판단은 전문의와 상담하세요</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcBabyAge} from '../../utils/dateCalc'
import {todayDateString} from '../../utils/todayDateString'

const birthDate = ref(todayDateString())
const baseDate = ref(todayDateString())

const babyAge = computed(() => calcBabyAge(birthDate.value, baseDate.value))
</script>

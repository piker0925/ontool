<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      생년월일
      <input v-model="birthDate" type="date" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      기준일
      <input v-model="baseDate" type="date" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">만 나이</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ internationalAge }}세</div>
    </div>
    <p class="text-[11px] text-muted-foreground/70">참고용 계산입니다 · 실제와 다를 수 있습니다</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcInternationalAge} from '../../utils/dateCalc'
import {todayDateString} from '../../utils/todayDateString'

const birthDate = ref(todayDateString())
const baseDate = ref(todayDateString())

const internationalAge = computed(() => calcInternationalAge(birthDate.value, baseDate.value))
</script>

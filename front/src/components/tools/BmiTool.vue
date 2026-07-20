<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      체중(kg)
      <input v-model.number="weight" type="number" inputmode="decimal" min="1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      신장(cm)
      <input v-model.number="height" type="number" inputmode="decimal" min="1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">BMI</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ bmi.toFixed(1) }}</div>
      <div class="mt-1 text-[11px] text-muted-foreground">{{ category }}</div>
    </div>
    <p class="text-[11px] text-muted-foreground/70">아시아-태평양 기준(WHO Asia-Pacific) 체중 상태 분류입니다</p>
    <p class="text-[11px] text-muted-foreground/70">참고용 계산입니다 · 실제와 다를 수 있습니다</p>
    <p class="text-[11px] text-muted-foreground/70">의료적 판단은 전문의와 상담하세요</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {bmiCategory, calcBmi} from '../../utils/bmiCalc'

const weight = ref(70)
const height = ref(170)

const bmi = computed(() => calcBmi(weight.value, height.value))
const category = computed(() => bmiCategory(bmi.value))
</script>

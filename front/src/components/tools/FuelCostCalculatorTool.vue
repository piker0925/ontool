<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      거리(km)
      <input v-model.number="distanceKm" type="number" inputmode="decimal" min="0" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      연비(km/L)
      <input v-model.number="fuelEfficiency" type="number" inputmode="decimal" min="0.1" step="0.1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      유가(원/L)
      <input v-model.number="fuelPrice" type="number" inputmode="numeric" min="0" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">예상 유류비</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ fuelCost.toLocaleString() }}원</div>
      <div class="mt-1 text-[11px] text-muted-foreground">사용 예상 {{ litersUsed.toFixed(1) }}L</div>
    </div>
    <p class="text-[11px] text-muted-foreground">참고용 계산입니다 · 실제 유가·연비에 따라 달라질 수 있습니다</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcFuelCost, calcFuelLitersUsed} from '../../utils/fuelCostCalc'

const distanceKm = ref(300)
const fuelEfficiency = ref(12)
const fuelPrice = ref(1700)

const fuelCost = computed(() => calcFuelCost(distanceKm.value, fuelEfficiency.value, fuelPrice.value))
const litersUsed = computed(() => calcFuelLitersUsed(distanceKm.value, fuelEfficiency.value))
</script>

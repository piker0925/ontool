<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      성별
      <select v-model="sex" class="rounded-md border border-input bg-background px-3 py-2">
        <option value="male">남성</option>
        <option value="female">여성</option>
      </select>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      체중(kg)
      <input v-model.number="weightKg" type="number" inputmode="decimal" min="1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      음주량(mL)
      <input v-model.number="volumeMl" type="number" inputmode="numeric" min="0" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      술 도수(%)
      <input v-model.number="abvPercent" type="number" inputmode="decimal" min="0" step="0.1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      음주 후 경과 시간(h)
      <input v-model.number="elapsedHours" type="number" inputmode="decimal" min="0" step="0.5" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">추정 혈중알코올농도(BAC)</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ bac.toFixed(3) }}%</div>
    </div>
    <p class="text-[11px] text-muted-foreground">위드마크(Widmark) 공식 기반 추정치이며 실제 측정값과 다를 수 있습니다</p>
    <p class="text-[11px] text-muted-foreground">음주운전 여부 판단 근거로 사용할 수 없습니다 · 절대 음주운전을 하지 마세요</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcBac, type BiologicalSex} from '../../utils/bacCalc'

const sex = ref<BiologicalSex>('male')
const weightKg = ref(70)
const volumeMl = ref(350)
const abvPercent = ref(17)
const elapsedHours = ref(1)

const bac = computed(() => calcBac(weightKg.value, volumeMl.value, abvPercent.value, sex.value, elapsedHours.value))
</script>

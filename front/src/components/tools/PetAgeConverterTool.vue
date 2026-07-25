<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <div class="flex rounded-lg border border-border overflow-hidden">
      <button v-for="s in (['dog', 'cat'] as const)" :key="s"
              :class="species === s ? 'bg-zone-accent-life text-white' : 'bg-card text-muted-foreground hover:text-foreground'"
              class="flex-1 px-3 py-1.5 text-[12px] font-medium transition-colors"
              @click="species = s">{{ s === 'dog' ? '강아지' : '고양이' }}
      </button>
    </div>

    <label class="flex flex-col gap-1.5 text-[13px]">
      나이(개월)
      <input v-model.number="petAgeMonths" type="number" inputmode="numeric" min="0" step="1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>

    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">사람 나이로 환산</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ humanAge.toFixed(1) }}세</div>
    </div>

    <p class="text-[11px] text-muted-foreground/70">품종·크기를 반영하지 않는 일반적인 간이 환산식입니다(1세=15세, 2세=24세, 이후 매년 강아지 +5세·고양이 +4세) — 실제 노화 속도는 품종에 따라 다를 수 있습니다.</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {petAgeMonthsToHumanYears, type PetSpecies} from '../../utils/petAgeConvert'

const species = ref<PetSpecies>('dog')
const petAgeMonths = ref(36)

const humanAge = computed(() => petAgeMonthsToHumanYears(species.value, petAgeMonths.value))
</script>

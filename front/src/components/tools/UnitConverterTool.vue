<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <div class="flex rounded-lg border border-border overflow-hidden">
      <button v-for="c in CATEGORIES" :key="c.id"
              :class="category === c.id ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'"
              class="flex-1 px-3 py-1.5 text-[12px] font-medium transition-colors"
              @click="category = c.id">{{ c.label }}
      </button>
    </div>

    <div class="flex items-center gap-2">
      <input v-model.number="inputValue" type="number" inputmode="decimal"
             class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-[14px]"/>
      <select v-model="fromUnit" class="rounded-md border border-input bg-background px-2 py-2 text-[13px]">
        <option v-for="u in UNIT_OPTIONS[category]" :key="u" :value="u">{{ u }}</option>
      </select>
    </div>

    <div class="flex justify-center text-muted-foreground">→</div>

    <div class="flex items-center gap-2">
      <div class="flex-1 rounded-md border border-zone-accent-life/20 bg-zone-accent-life/10 px-3 py-2 font-mono text-[14px] text-zone-accent-life">
        {{ result }}
      </div>
      <select v-model="toUnit" class="rounded-md border border-input bg-background px-2 py-2 text-[13px]">
        <option v-for="u in UNIT_OPTIONS[category]" :key="u" :value="u">{{ u }}</option>
      </select>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {convertUnit, UNIT_OPTIONS, type UnitCategory} from '../../utils/unitConvert'

const CATEGORIES: {id: UnitCategory; label: string}[] = [
  {id: 'length', label: '길이'},
  {id: 'weight', label: '무게'},
  {id: 'volume', label: '부피'},
]

const category = ref<UnitCategory>('length')
const inputValue = ref(1)
const fromUnit = ref(UNIT_OPTIONS.length[0])
const toUnit = ref(UNIT_OPTIONS.length[1])

watch(category, c => {
  fromUnit.value = UNIT_OPTIONS[c][0]
  toUnit.value = UNIT_OPTIONS[c][1]
})

const result = computed(() => convertUnit(category.value, inputValue.value, fromUnit.value, toUnit.value).toLocaleString(undefined, {maximumFractionDigits: 6}))
</script>

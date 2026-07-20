<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <div class="grid grid-cols-3 gap-2">
      <label class="flex flex-col gap-1.5 text-[13px]">
        가로(cm)
        <input v-model.number="width" type="number" inputmode="decimal" min="0" class="rounded-md border border-input bg-background px-3 py-2"/>
      </label>
      <label class="flex flex-col gap-1.5 text-[13px]">
        세로(cm)
        <input v-model.number="depth" type="number" inputmode="decimal" min="0" class="rounded-md border border-input bg-background px-3 py-2"/>
      </label>
      <label class="flex flex-col gap-1.5 text-[13px]">
        높이(cm)
        <input v-model.number="height" type="number" inputmode="decimal" min="0" class="rounded-md border border-input bg-background px-3 py-2"/>
      </label>
    </div>
    <label class="flex flex-col gap-1.5 text-[13px]">
      실측 중량(kg, 선택 입력 — 입력하면 청구 기준을 비교해줍니다)
      <input v-model.number="actualWeight" type="number" inputmode="decimal" min="0" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>

    <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">부피무게</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-life">{{ volumetricWeight.toLocaleString(undefined, {maximumFractionDigits: 2}) }}kg</div>
    </div>

    <div v-if="actualWeight > 0" class="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[13px]">
      <span class="text-muted-foreground">청구 기준({{ actualWeight >= volumetricWeight ? '실중량' : '부피무게' }})</span>
      <span class="font-mono text-foreground">{{ billing.toLocaleString(undefined, {maximumFractionDigits: 2}) }}kg</span>
    </div>

    <p class="text-[11px] text-muted-foreground/70">가로×세로×높이(cm)÷6000의 업계 공통 기준이며, 택배사별 계산식이 다를 수 있습니다 — 실제 청구액은 이용하는 택배사에 확인하세요.</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {billingWeight, calcVolumetricWeight} from '../../utils/parcelVolumeWeight'

const width = ref(40)
const depth = ref(30)
const height = ref(20)
const actualWeight = ref(0)

const volumetricWeight = computed(() => calcVolumetricWeight(width.value, depth.value, height.value))
const billing = computed(() => billingWeight(actualWeight.value, volumetricWeight.value))
</script>

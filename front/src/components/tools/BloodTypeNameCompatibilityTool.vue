<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1.5 text-[13px]">
        내 이름
        <input v-model="myName" type="text" class="rounded-md border border-input bg-background px-3 py-2"/>
      </label>
      <label class="flex flex-col gap-1.5 text-[13px]">
        상대 이름
        <input v-model="partnerName" type="text" class="rounded-md border border-input bg-background px-3 py-2"/>
      </label>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1.5 text-[13px]">
        내 혈액형
        <select v-model="myBloodType" class="w-auto min-w-[96px] self-start rounded-md border border-input bg-background px-3 py-2">
          <option v-for="t in BLOOD_TYPES" :key="t" :value="t">{{ t }}형</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5 text-[13px]">
        상대 혈액형
        <select v-model="partnerBloodType" class="w-auto min-w-[96px] self-start rounded-md border border-input bg-background px-3 py-2">
          <option v-for="t in BLOOD_TYPES" :key="t" :value="t">{{ t }}형</option>
        </select>
      </label>
    </div>
    <div class="rounded-lg border border-zone-accent-fun/20 bg-zone-accent-fun/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">혈액형 궁합</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-fun">{{ bloodCompat.score }}점</div>
      <div class="mt-1 text-[12px] text-muted-foreground">{{ bloodCompat.message }}</div>
    </div>
    <div v-if="myName && partnerName" class="rounded-lg border border-zone-accent-fun/20 bg-zone-accent-fun/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">이름 궁합</div>
      <div class="mt-1 font-mono text-2xl font-semibold text-zone-accent-fun">{{ nameScore }}점</div>
    </div>
    <p class="text-[11px] text-muted-foreground">과학적 근거 없는 재미용 콘텐츠입니다</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcNameCompatScore, getBloodTypeCompat, type BloodType} from '../../utils/bloodTypeCompatCalc'

const BLOOD_TYPES: BloodType[] = ['A', 'B', 'O', 'AB']

const myName = ref('')
const partnerName = ref('')
const myBloodType = ref<BloodType>('O')
const partnerBloodType = ref<BloodType>('A')

const bloodCompat = computed(() => getBloodTypeCompat(myBloodType.value, partnerBloodType.value))
const nameScore = computed(() => calcNameCompatScore(myName.value, partnerName.value))
</script>

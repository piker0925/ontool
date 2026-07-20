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
      나이
      <input v-model.number="age" type="number" inputmode="numeric" min="1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      체중(kg)
      <input v-model.number="weight" type="number" inputmode="decimal" min="1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      신장(cm)
      <input v-model.number="height" type="number" inputmode="decimal" min="1" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      활동량
      <select v-model="activityLevel" class="rounded-md border border-input bg-background px-3 py-2">
        <option value="sedentary">거의 안 함(사무직)</option>
        <option value="light">가벼운 운동(주 1~3회)</option>
        <option value="moderate">보통 운동(주 3~5회)</option>
        <option value="active">활발한 운동(주 6~7회)</option>
        <option value="veryActive">매우 활발함(육체노동/매일 운동)</option>
      </select>
    </label>
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
        <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">기초대사량(BMR)</div>
        <div class="mt-1 font-mono text-xl font-semibold text-zone-accent-life">{{ Math.round(bmr).toLocaleString() }}kcal</div>
      </div>
      <div class="rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4 text-center">
        <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">활동대사량(TDEE)</div>
        <div class="mt-1 font-mono text-xl font-semibold text-zone-accent-life">{{ Math.round(tdee).toLocaleString() }}kcal</div>
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground/70">Mifflin-St Jeor 공식 기준 추정치입니다</p>
    <p class="text-[11px] text-muted-foreground/70">참고용 계산입니다 · 실제와 다를 수 있습니다</p>
    <p class="text-[11px] text-muted-foreground/70">의료적 판단은 전문의와 상담하세요</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcBmr, calcTdee, type ActivityLevel, type Sex} from '../../utils/bmiCalc'

const sex = ref<Sex>('male')
const age = ref(30)
const weight = ref(70)
const height = ref(170)
const activityLevel = ref<ActivityLevel>('sedentary')

const bmr = computed(() => calcBmr(weight.value, height.value, age.value, sex.value))
const tdee = computed(() => calcTdee(bmr.value, activityLevel.value))
</script>

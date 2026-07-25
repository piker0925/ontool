<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      생년월일
      <input v-model="birthDate" type="date" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <div v-if="birthDate" class="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
      <div class="flex flex-col items-center gap-1 rounded-lg border border-zone-accent-fun/20 bg-zone-accent-fun/10 py-3">
        <span class="font-mono text-base font-semibold text-zone-accent-fun">{{ scores.physical.toFixed(0) }}</span>
        <span class="text-[11px] text-muted-foreground">신체(23일)</span>
      </div>
      <div class="flex flex-col items-center gap-1 rounded-lg border border-zone-accent-fun/20 bg-zone-accent-fun/10 py-3">
        <span class="font-mono text-base font-semibold text-zone-accent-fun">{{ scores.emotional.toFixed(0) }}</span>
        <span class="text-[11px] text-muted-foreground">감성(28일)</span>
      </div>
      <div class="flex flex-col items-center gap-1 rounded-lg border border-zone-accent-fun/20 bg-zone-accent-fun/10 py-3">
        <span class="font-mono text-base font-semibold text-zone-accent-fun">{{ scores.intellectual.toFixed(0) }}</span>
        <span class="text-[11px] text-muted-foreground">지성(33일)</span>
      </div>
    </div>
    <p v-else class="text-[13px] text-muted-foreground">생년월일을 입력하면 오늘의 바이오리듬을 계산합니다</p>
    <p class="text-[11px] text-muted-foreground">과학적 근거 없는 재미용 콘텐츠입니다</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {calcBiorhythm} from '../../utils/biorhythmCalc'
import {daysBetween} from '../../utils/dateCalc'
import {todayDateString} from '../../utils/todayDateString'

const birthDate = ref('')

const scores = computed(() => birthDate.value ? calcBiorhythm(daysBetween(birthDate.value, todayDateString())) : {physical: 0, emotional: 0, intellectual: 0})
</script>

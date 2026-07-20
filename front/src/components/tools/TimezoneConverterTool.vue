<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      기준 날짜·시각
      <input v-model="dateTime" type="datetime-local" class="rounded-md border border-input bg-background px-3 py-2"/>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      기준 시간대
      <select v-model="fromTz" class="rounded-md border border-input bg-background px-3 py-2">
        <option v-for="tz in TIMEZONES" :key="tz.id" :value="tz.id">{{ tz.label }}</option>
      </select>
    </label>
    <label class="flex flex-col gap-1.5 text-[13px]">
      변환 시간대
      <select v-model="toTz" class="rounded-md border border-input bg-background px-3 py-2">
        <option v-for="tz in TIMEZONES" :key="tz.id" :value="tz.id">{{ tz.label }}</option>
      </select>
    </label>

    <div class="rounded-lg border border-zone-accent-dev/20 bg-zone-accent-dev/10 px-4 py-4 text-center">
      <div class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">변환 결과</div>
      <div class="mt-1 font-mono text-xl font-semibold text-zone-accent-dev">{{ converted }}</div>
    </div>

    <p class="text-[11px] text-muted-foreground/70">서머타임(DST)이 있는 지역은 시기에 따라 시차가 달라질 수 있습니다</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {convertTimezone} from '../../utils/timezoneConvert'

const TIMEZONES = [
  {id: 'Asia/Seoul', label: '서울(KST, UTC+9)'},
  {id: 'UTC', label: 'UTC'},
  {id: 'America/New_York', label: '뉴욕(America/New_York)'},
  {id: 'America/Los_Angeles', label: '로스앤젤레스(America/Los_Angeles)'},
  {id: 'Europe/London', label: '런던(Europe/London)'},
  {id: 'Europe/Berlin', label: '베를린(Europe/Berlin)'},
  {id: 'Asia/Tokyo', label: '도쿄(Asia/Tokyo)'},
  {id: 'Asia/Shanghai', label: '상하이(Asia/Shanghai)'},
  {id: 'Asia/Singapore', label: '싱가포르(Asia/Singapore)'},
  {id: 'Australia/Sydney', label: '시드니(Australia/Sydney)'},
  {id: 'Asia/Kolkata', label: '뭄바이/델리(Asia/Kolkata)'},
]

function formatNow(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const dateTime = ref(formatNow())
const fromTz = ref('Asia/Seoul')
const toTz = ref('America/New_York')

const converted = computed(() => convertTimezone(dateTime.value, fromTz.value, toTz.value).replace('T', ' '))
</script>

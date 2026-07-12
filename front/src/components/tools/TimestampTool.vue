<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex rounded-lg border border-border overflow-hidden">
        <button v-for="u in unitOptions" :key="u.value"
                :class="tsUnit === u.value ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'"
                class="px-3 py-1 text-[12px] font-medium transition-colors"
                @click="setUnit(u.value)">{{ u.label }}
        </button>
      </div>
      <button
          class="rounded-lg border border-border bg-card px-3 py-1 text-[12px] text-foreground/80 transition-colors hover:bg-accent"
          @click="fillNow">Now
      </button>
      <select v-model="timezone"
              class="ml-auto rounded-lg border border-border bg-card px-2 py-1 text-[12px] text-foreground outline-none focus:border-ring">
        <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
      </select>
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-[11px] font-medium text-muted-foreground">
        Unix Timestamp ({{ tsUnit === 's' ? '초' : '밀리초' }})
      </label>
      <input v-model="tsUnix"
             class="rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-ring"
             :placeholder="tsUnit === 's' ? '예: 1700000000' : '예: 1700000000000'"
             type="text"
             inputmode="numeric"
             @input="onUnixInput"/>
      <p v-if="unitNotice" class="text-[11px] text-primary">{{ unitNotice }}</p>
    </div>

    <div class="flex items-center justify-center">
      <ArrowUpDown class="size-4 text-muted-foreground/50"/>
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-[11px] font-medium text-muted-foreground">날짜/시간 (ISO 8601 등)</label>
      <input v-model="tsDate"
             class="rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-ring"
             placeholder="예: 2023-11-14T22:13:20.000Z"
             type="text"
             @input="onDateInput"/>
    </div>

    <div class="flex items-center gap-2 flex-wrap">
      <label class="text-[11px] font-medium text-muted-foreground">출력 형식</label>
      <select v-model="formatPreset"
              class="rounded-lg border border-border bg-card px-2 py-1 text-[12px] text-foreground outline-none focus:border-ring">
        <option value="iso">ISO 8601</option>
        <option value="rfc2822">RFC 2822</option>
        <option value="datetime">YYYY-MM-DD HH:mm:ss</option>
        <option value="usdate">MM/DD/YYYY</option>
        <option value="custom">커스텀 패턴</option>
      </select>
      <input v-if="formatPreset === 'custom'" v-model="customPattern"
             class="flex-1 min-w-40 rounded-lg border border-border bg-card px-2 py-1 font-mono text-[12px] text-foreground outline-none focus:border-ring"
             placeholder="YYYY-MM-DD HH:mm:ss.SSS Z"
             type="text"/>
    </div>

    <div v-if="outputRows.length > 0" class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div v-for="row in outputRows" :key="row.label" class="flex items-center justify-between gap-3">
        <span class="text-[11px] text-muted-foreground shrink-0">{{ row.label }}</span>
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-mono text-[13px] text-foreground truncate">{{ row.value }}</span>
          <button class="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground shrink-0"
                  @click="copyText(row.value)">
            <Copy class="size-3"/>
          </button>
        </div>
      </div>
    </div>

    <p v-if="tsError" class="text-[11px] text-destructive/70">{{ tsError }}</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {ArrowUpDown, Copy} from 'lucide-vue-next'
import {
  detectTimestampUnit,
  formatInTimezone,
  formatRelativeTime,
  formatUnixPattern,
  type TimestampUnit,
} from '../../utils/frontendTools'

const unitOptions = [
  {value: 's' as TimestampUnit, label: '초'},
  {value: 'ms' as TimestampUnit, label: '밀리초'},
]

const timezones = [
  'UTC',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
]

const PRESET_PATTERNS: Record<string, string> = {
  iso: 'YYYY-MM-DDTHH:mm:ssZ',
  rfc2822: 'ddd, DD MMM YYYY HH:mm:ss ZZ',
  datetime: 'YYYY-MM-DD HH:mm:ss',
  usdate: 'MM/DD/YYYY',
}

const tsUnix = ref('')
const tsDate = ref('')
const tsError = ref('')
const unitNotice = ref('')
const tsUnit = ref<TimestampUnit>('s')
const timezone = ref('UTC')
const formatPreset = ref('iso')
const customPattern = ref('YYYY-MM-DD HH:mm:ss.SSS Z')
const epochMs = ref<number | null>(null)

const activePattern = computed(() =>
    formatPreset.value === 'custom' ? customPattern.value : PRESET_PATTERNS[formatPreset.value]
)

const outputRows = computed(() => {
  const ms = epochMs.value
  if (ms === null || isNaN(ms)) return []
  const rows: { label: string; value: string }[] = []
  try {
    rows.push({label: timezone.value, value: formatUnixPattern(ms, activePattern.value, timezone.value)})
    if (timezone.value !== 'UTC') {
      rows.push({label: 'UTC', value: formatInTimezone(ms, 'UTC')})
    }
  } catch {
    return []
  }
  rows.push({label: '상대 시간', value: formatRelativeTime(ms)})
  rows.push({label: 'Unix (초)', value: String(Math.floor(ms / 1000))})
  rows.push({label: 'Unix (밀리초)', value: String(ms)})
  return rows
})

function setUnit(unit: TimestampUnit) {
  if (tsUnit.value === unit) return
  tsUnit.value = unit
  unitNotice.value = ''
  // 현재 값을 새 단위로 환산해 유지
  if (epochMs.value !== null) {
    tsUnix.value = unit === 's' ? String(Math.floor(epochMs.value / 1000)) : String(epochMs.value)
  }
}

function fillNow() {
  const now = Date.now()
  tsUnix.value = tsUnit.value === 's' ? String(Math.floor(now / 1000)) : String(now)
  onUnixInput()
}

function onUnixInput() {
  tsError.value = ''
  unitNotice.value = ''
  const raw = tsUnix.value.trim()
  if (!raw) {
    tsDate.value = ''
    epochMs.value = null
    return
  }
  const n = Number(raw)
  if (isNaN(n)) {
    tsError.value = '올바른 Unix timestamp가 아닙니다.'
    return
  }
  const detected = detectTimestampUnit(raw)
  if (detected !== tsUnit.value) {
    tsUnit.value = detected
    unitNotice.value = detected === 'ms'
        ? `${raw.replace(/^-/, '').length}자리 입력을 밀리초로 감지했습니다.`
        : '자릿수가 짧아 초 단위로 감지했습니다.'
  }
  const ms = tsUnit.value === 's' ? n * 1000 : n
  const date = new Date(ms)
  if (isNaN(date.getTime())) {
    tsError.value = '올바른 Unix timestamp가 아닙니다.'
    return
  }
  epochMs.value = Math.floor(ms)
  tsDate.value = date.toISOString()
}

function onDateInput() {
  tsError.value = ''
  unitNotice.value = ''
  if (!tsDate.value) {
    tsUnix.value = ''
    epochMs.value = null
    return
  }
  const ms = new Date(tsDate.value).getTime()
  if (isNaN(ms)) {
    tsError.value = '올바른 날짜 형식이 아닙니다.'
    return
  }
  epochMs.value = ms
  tsUnix.value = tsUnit.value === 's' ? String(Math.floor(ms / 1000)) : String(ms)
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
}

tsUnix.value = '1700000000'
onUnixInput()
</script>

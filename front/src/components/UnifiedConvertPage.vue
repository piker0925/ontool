<template>
  <div
      class="grid min-h-[420px] grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-2 lg:divide-x lg:divide-y-0"
  >
    <!-- Input -->
    <div class="flex flex-col">
      <div class="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">입력</span>
        <button
            class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground/70 transition-colors hover:text-primary"
            @click="applySample"
        >
          <Wand2 class="size-3"/>
          예시
        </button>
      </div>

      <!-- 형식 선택 -->
      <div class="flex items-end gap-2 border-b border-border p-4">
        <div class="flex flex-1 flex-col gap-1.5">
          <label class="text-[11px] font-medium text-muted-foreground">From</label>
          <select
              v-model="from"
              class="rounded-md border border-input bg-background px-3 py-2 font-mono text-[13px] uppercase text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            <option v-for="f in FORMATS" :key="f" :value="f">{{ f.toUpperCase() }}</option>
          </select>
        </div>
        <button
            class="mb-1 flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            title="방향 바꾸기"
            @click="swap"
        >
          <ArrowLeftRight class="size-3.5"/>
        </button>
        <div class="flex flex-1 flex-col gap-1.5">
          <label class="text-[11px] font-medium text-muted-foreground">To</label>
          <select
              v-model="to"
              class="rounded-md border border-input bg-background px-3 py-2 font-mono text-[13px] uppercase text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            <option v-for="f in targetOptions" :key="f" :value="f">{{ f.toUpperCase() }}</option>
          </select>
        </div>
      </div>

      <textarea
          v-model="input"
          :placeholder="placeholder"
          class="min-h-[32vh] flex-1 resize-y bg-muted/40 p-4 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
      />

      <!-- 입력 형식 자동 감지 제안 -->
      <div
          v-if="detected && detected !== from"
          class="flex h-9 shrink-0 items-center justify-between border-t border-border bg-primary/5 px-4"
      >
        <p class="text-[11px] text-muted-foreground">
          입력이 <span class="font-mono font-medium uppercase text-primary">{{ detected }}</span> 형식으로 보입니다
        </p>
        <button
            class="rounded px-1.5 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
            @click="applyDetected"
        >
          From을 {{ detected.toUpperCase() }}로 변경
        </button>
      </div>
      <div v-else class="flex h-9 shrink-0 items-center border-t border-border px-4">
        <p class="text-[11px] text-muted-foreground">입력하면 자동으로 변환됩니다</p>
      </div>
    </div>

    <!-- Output -->
    <div class="flex flex-col">
      <div class="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <span
            class="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          결과
          <Loader2 v-if="running" class="size-3 animate-spin"/>
        </span>
        <button
            v-if="output"
            :aria-label="copied ? '복사 완료' : '결과 복사'"
            :class="copied ? 'text-emerald-500' : 'text-muted-foreground/60 hover:text-foreground'"
            class="rounded p-0.5 transition-colors"
            @click="copyOutput"
        >
          <Check v-if="copied" class="size-3.5"/>
          <Copy v-else class="size-3.5"/>
        </button>
      </div>

      <div class="flex-1 overflow-auto">
        <div v-if="error" class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <AlertCircle class="size-5 text-destructive/70"/>
          <p v-if="errorStage" class="text-[11px] font-medium text-destructive">{{ errorStage }}</p>
          <p class="text-[13px] text-foreground">{{ error }}</p>
          <p class="text-[11px] text-muted-foreground">입력 형식을 확인해 주세요</p>
        </div>
        <pre
            v-else-if="output"
            class="h-full whitespace-pre-wrap break-all p-4 font-mono text-[13px] text-foreground"
        >{{ output }}</pre>
        <div v-else class="flex h-full flex-col items-center justify-center gap-2.5 px-6 text-center">
          <div class="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-border">
            <ArrowRight class="size-5 text-muted-foreground/50"/>
          </div>
          <p class="text-[12px] text-muted-foreground">입력과 동시에 변환 결과가 나타납니다</p>
          <Button class="text-[12px]" size="sm" variant="outline" @click="applySample">
            <Wand2 class="size-3.5"/>
            예시로 실행해 보기
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onUnmounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {AlertCircle, ArrowLeftRight, ArrowRight, Check, Copy, Loader2, Wand2} from 'lucide-vue-next'
import {apiClient} from '../api/client'
import {Button} from '@/components/ui/button'
import {DATA_FORMATS, detectFormat, type DataFormat} from './unifiedPageUtils'

type Format = DataFormat

const FORMATS: Format[] = DATA_FORMATS

// 백엔드 변환 모듈은 모두 JSON을 축으로 한다: json ↔ {yaml, toml, xml, csv}
// 비-JSON 조합(yaml→toml 등)은 from→json→to 2단 체이닝으로 처리한다.
const MODULE_BY_PAIR: Record<string, string> = {
  'json|yaml': 'json-yaml',
  'json|toml': 'json-toml',
  'json|xml': 'json-xml',
  'json|csv': 'csv-json',
}

const SAMPLES: Partial<Record<Format, string>> = {
  json: '{"name": "OnTool", "tags": ["dev", "tools"], "active": true}',
  yaml: 'name: OnTool\ntags:\n  - dev\n  - tools\nactive: true',
  toml: 'name = "OnTool"\ntags = ["dev", "tools"]\nactive = true',
  xml: '<root><name>OnTool</name><active>true</active></root>',
  csv: 'name,age\nAlice,30\nBob,25',
}

const route = useRoute()
const router = useRouter()

function initialFormat(key: string, fallback: Format): Format {
  const q = route.query[key]
  return typeof q === 'string' && FORMATS.includes(q as Format) ? q as Format : fallback
}

const from = ref<Format>(initialFormat('from', 'json'))
const to = ref<Format>(initialFormat('to', 'yaml'))
const input = ref('')
const output = ref('')
const error = ref('')
const errorStage = ref('')
const running = ref(false)
const copied = ref(false)

// 체이닝 지원으로 모든 조합 허용 (자기 자신 제외)
const targetOptions = computed<Format[]>(() => FORMATS.filter(f => f !== from.value))

const placeholder = computed(() => SAMPLES[from.value] ?? '')
const detected = computed<Format | null>(() => detectFormat(input.value))

watch(from, () => {
  if (to.value === from.value) to.value = targetOptions.value[0]
})

// URL query 양방향 동기화 (replace라 뒤로가기 이력을 오염시키지 않음)
watch([from, to], ([f, t]) => {
  if (route.query.from === f && route.query.to === t) return
  router.replace({query: {...route.query, from: f, to: t}})
})

watch(() => [route.query.from, route.query.to], ([qf, qt]) => {
  if (typeof qf === 'string' && FORMATS.includes(qf as Format) && qf !== from.value) from.value = qf as Format
  if (typeof qt === 'string' && FORMATS.includes(qt as Format) && qt !== to.value) to.value = qt as Format
})

function swap() {
  const prev = from.value
  from.value = to.value
  to.value = prev
}

function applyDetected() {
  if (detected.value) from.value = detected.value
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let runToken = 0

watch([input, from, to], () => {
  if (!input.value.trim()) {
    output.value = ''
    error.value = ''
    errorStage.value = ''
    return
  }
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(run, 500)
})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

/** json↔other 단일 변환 한 번을 백엔드에 요청한다. */
async function convertStep(fromF: Format, toF: Format, text: string): Promise<string> {
  const other = fromF === 'json' ? toF : fromF
  const moduleId = MODULE_BY_PAIR[`json|${other}`]
  const direction = moduleId === 'csv-json'
      ? (fromF === 'csv' ? 'csv-to-json' : 'json-to-csv')
      : `${fromF}-to-${toF}`
  const {data} = await apiClient.post(`/api/v1/tools/${moduleId}/run`, {input: text, direction})
  return data.result ?? ''
}

function messageOf(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string } } }
  return err.response?.data?.message ?? fallback
}

async function run() {
  if (!input.value.trim() || from.value === to.value) return
  const token = ++runToken
  running.value = true
  const chained = from.value !== 'json' && to.value !== 'json'
  const fromLabel = from.value.toUpperCase()
  const toLabel = to.value.toUpperCase()
  try {
    let intermediate = input.value
    if (from.value !== 'json') {
      try {
        intermediate = await convertStep(from.value, 'json', input.value)
      } catch (e) {
        if (token !== runToken) return
        errorStage.value = chained ? `1단계 (${fromLabel} → JSON) 실패` : ''
        error.value = messageOf(e, '변환에 실패했습니다')
        output.value = ''
        return
      }
    }
    if (token !== runToken) return
    let result = intermediate
    if (to.value !== 'json') {
      try {
        result = await convertStep('json', to.value, intermediate)
      } catch (e) {
        if (token !== runToken) return
        errorStage.value = chained ? `2단계 (JSON → ${toLabel}) 실패` : ''
        error.value = messageOf(e, '변환에 실패했습니다')
        output.value = ''
        return
      }
    }
    if (token !== runToken) return
    output.value = result
    error.value = ''
    errorStage.value = ''
  } finally {
    if (token === runToken) running.value = false
  }
}

function applySample() {
  input.value = SAMPLES[from.value] ?? ''
}

async function copyOutput() {
  if (!output.value) return
  await navigator.clipboard.writeText(output.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

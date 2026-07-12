<template>
  <div class="flex flex-col gap-3 max-w-4xl mx-auto w-full">
    <!-- 옵션 바 -->
    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex gap-0.5 rounded-lg bg-muted p-0.5">
        <button v-for="opt in [{ value: 'format', label: '포맷' }, { value: 'minify', label: '미니파이' }]" :key="opt.value"
                :class="jsonMode === opt.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                class="rounded-md px-3 py-1 text-[12px] font-medium transition-colors"
                @click="jsonMode = opt.value; compute()">{{ opt.label }}
        </button>
      </div>
      <template v-if="jsonMode === 'format'">
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] text-muted-foreground">들여쓰기</span>
          <div class="flex gap-0.5 rounded-lg bg-muted p-0.5">
            <button v-for="opt in jsonIndentOptions" :key="String(opt.value)"
                    :class="jsonIndent === opt.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                    class="rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors"
                    @click="jsonIndent = opt.value; compute()">{{ opt.label }}
            </button>
          </div>
        </div>
      </template>
      <label class="flex items-center gap-1.5 cursor-pointer ml-auto">
        <input v-model="jsonSortKeys" class="accent-primary" type="checkbox" @change="compute()"/>
        <span class="text-[11px] text-muted-foreground">키 정렬 (A→Z)</span>
      </label>
    </div>

    <!-- 2-패널 -->
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center justify-between border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">JSON 입력</span>
          <button v-if="input" class="rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                  @click="input = ''; compute()">
            <X class="size-3.5"/>
          </button>
        </div>
        <textarea v-model="input"
                  class="h-64 resize-none bg-muted/40 p-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
                  placeholder='{"key": "value"}'
                  @input="compute()"/>
      </div>
      <div class="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center justify-between border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">결과</span>
          <button v-if="output"
                  :class="copied ? 'text-emerald-500' : 'text-muted-foreground/50 hover:text-foreground'"
                  class="rounded p-0.5 transition-colors"
                  @click="copyText(output)">
            <Check v-if="copied" class="size-3.5"/>
            <Copy v-else class="size-3.5"/>
          </button>
        </div>
        <div class="h-64 overflow-auto">
          <!-- 파싱 오류: 줄/열 + 해당 줄 스니펫 -->
          <div v-if="error" class="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle class="size-4 text-destructive/70"/>
            </div>
            <p class="text-[12px] text-destructive">{{ error }}</p>
            <pre v-if="errorSnippet"
                 class="max-w-full overflow-x-auto rounded-lg bg-muted/60 p-2.5 text-left font-mono text-[11px] leading-4 text-foreground">{{ errorSnippet }}</pre>
          </div>

          <!-- 대용량: 하이라이트 없이 그대로 -->
          <pre v-else-if="output && !highlighted"
               class="p-3 font-mono text-[13px] text-foreground whitespace-pre-wrap break-all">{{ output }}</pre>

          <!-- 줄번호 + 구문 강조 + 라인 hover 복사 -->
          <div v-else-if="output" class="py-2">
            <div v-for="(ln, i) in displayLines" :key="i"
                 class="group flex items-start px-2 hover:bg-muted/50">
              <span
                  class="w-9 shrink-0 select-none pr-2.5 text-right font-mono text-[11px] leading-[1.4rem] text-muted-foreground/40">{{
                  i + 1
                }}</span>
              <span class="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-[13px] leading-[1.4rem]">
                <span v-for="(tok, j) in ln.tokens" :key="j" :class="TOKEN_CLASS[tok.type]">{{ tok.text }}</span>
              </span>
              <button
                  class="mt-1 shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  title="이 줄의 값 복사"
                  @click="copyLine(i, ln.text)">
                <Check v-if="copiedLine === i" class="size-3 text-emerald-500"/>
                <Copy v-else class="size-3 text-muted-foreground/60 hover:text-foreground"/>
              </button>
            </div>
          </div>

          <div v-else class="flex h-full flex-col items-center justify-center gap-2 text-center">
            <ArrowRight class="size-4 text-muted-foreground/40"/>
            <p class="text-[11px] text-muted-foreground/50">입력하면 바로 변환됩니다</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 통계 + 크기 정보 -->
    <div v-if="input && output && !error" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <template v-if="stats">
        <span>키 <span class="font-mono text-foreground/80">{{ stats.keys }}</span></span>
        <span>최대 깊이 <span class="font-mono text-foreground/80">{{ stats.maxDepth }}</span></span>
        <span>객체 <span class="font-mono text-foreground/80">{{ stats.objects }}</span></span>
        <span>배열 <span class="font-mono text-foreground/80">{{ stats.arrays }}</span></span>
        <span class="text-border">·</span>
      </template>
      <span>원본 <span class="font-mono text-foreground/80">{{ formatBytes(jsonInputBytes) }}</span></span>
      <span>→</span>
      <span>결과 <span class="font-mono text-foreground/80">{{ formatBytes(jsonOutputBytes) }}</span></span>
      <span :class="jsonOutputBytes < jsonInputBytes ? 'text-emerald-500' : 'text-muted-foreground'">
        ({{
          jsonOutputBytes < jsonInputBytes ? '' : '+'
        }}{{ jsonInputBytes > 0 ? Math.round((jsonOutputBytes - jsonInputBytes) / jsonInputBytes * 100) : 0 }}%)
      </span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {AlertCircle, ArrowRight, Check, Copy, X} from 'lucide-vue-next'
import {formatJson, minifyJson} from '../../utils/frontendTools'
import {
  computeJsonStats,
  extractLineValue,
  getLine,
  locateJsonSyntaxError,
  tokenizeJsonLine,
  type JsonTokenType,
} from '../../utils/jsonAnalysis'

const input = ref('')
const output = ref('')
const error = ref('')
const errorLoc = ref<{ line: number; column: number; lineText: string } | null>(null)
const jsonMode = ref('format')
const copied = ref(false)
const copiedLine = ref<number | null>(null)
const parsed = ref<unknown>(undefined)

const jsonIndent = ref<number | string>(2)
const jsonSortKeys = ref(false)
const jsonIndentOptions = [
  {value: 2, label: '2'},
  {value: 4, label: '4'},
  {value: '\t', label: '탭'},
]

const MAX_HIGHLIGHT_LINES = 3000

const TOKEN_CLASS: Record<JsonTokenType, string> = {
  key: 'text-violet-600',
  string: 'text-emerald-600',
  number: 'text-blue-600',
  boolean: 'text-orange-600',
  null: 'text-rose-500',
  punct: 'text-muted-foreground',
  plain: 'text-foreground',
}

const outputLines = computed(() => output.value ? output.value.split('\n') : [])
const highlighted = computed(() => outputLines.value.length <= MAX_HIGHLIGHT_LINES)
const displayLines = computed(() =>
    highlighted.value ? outputLines.value.map(text => ({text, tokens: tokenizeJsonLine(text)})) : [],
)

const stats = computed(() =>
    output.value && !error.value && parsed.value !== undefined ? computeJsonStats(parsed.value) : null,
)

const errorSnippet = computed(() => {
  const loc = errorLoc.value
  if (!loc || !loc.lineText) return ''
  const windowStart = Math.max(0, loc.column - 1 - 40)
  const text = loc.lineText.slice(windowStart, windowStart + 80)
  const caret = ' '.repeat(Math.max(0, Math.min(loc.column - 1 - windowStart, text.length))) + '^'
  return `${text}\n${caret}`
})

const jsonInputBytes = computed(() => new TextEncoder().encode(input.value).length)
const jsonOutputBytes = computed(() => new TextEncoder().encode(output.value).length)

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function compute() {
  error.value = ''
  errorLoc.value = null
  output.value = ''
  parsed.value = undefined
  if (!input.value) return
  try {
    parsed.value = JSON.parse(input.value)
    output.value = jsonMode.value === 'format'
        ? formatJson(input.value, jsonIndent.value, jsonSortKeys.value)
        : minifyJson(input.value, jsonSortKeys.value)
  } catch (e: unknown) {
    parsed.value = undefined
    const loc = locateJsonSyntaxError(input.value)
    if (loc) {
      error.value = `${loc.line}번째 줄 ${loc.column}번째 열: ${loc.message}`
      errorLoc.value = {line: loc.line, column: loc.column, lineText: getLine(input.value, loc.line)}
    } else {
      error.value = e instanceof Error ? e.message : '변환 중 오류가 발생했습니다.'
    }
  }
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

async function copyLine(index: number, lineText: string) {
  await navigator.clipboard.writeText(extractLineValue(lineText))
  copiedLine.value = index
  setTimeout(() => {
    if (copiedLine.value === index) copiedLine.value = null
  }, 1500)
}

input.value = '{"name":"홍길동","age":30,"skills":["Java","Vue","Spring"]}'
compute()
</script>

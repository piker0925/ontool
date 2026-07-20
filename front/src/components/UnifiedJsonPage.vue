<template>
  <div class="flex flex-col gap-4">
    <!-- 탭 -->
    <div class="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
      <button
          v-for="t in TABS"
          :key="t.id"
          :class="tab === t.id
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
          class="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors sm:flex-1"
          @click="tab = t.id"
      >{{ t.label }}
      </button>
    </div>

    <!-- 포맷터 -->
    <div v-if="tab === 'formatter'" class="flex flex-col gap-3 max-w-4xl mx-auto w-full">
      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex gap-0.5 rounded-lg bg-muted p-0.5">
          <button v-for="opt in [{ value: 'format', label: '포맷' }, { value: 'minify', label: '미니파이' }]" :key="opt.value"
                  :class="fmtMode === opt.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                  class="rounded-md px-3 py-1 text-[12px] font-medium transition-colors"
                  @click="fmtMode = opt.value; fmtCompute()">{{ opt.label }}
          </button>
        </div>
        <template v-if="fmtMode === 'format'">
          <div class="flex items-center gap-1.5">
            <span class="text-[11px] text-muted-foreground">들여쓰기</span>
            <div class="flex gap-0.5 rounded-lg bg-muted p-0.5">
              <button v-for="opt in fmtIndentOptions" :key="String(opt.value)"
                      :class="fmtIndent === opt.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                      class="rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors"
                      @click="fmtIndent = opt.value; fmtCompute()">{{ opt.label }}
              </button>
            </div>
          </div>
        </template>
        <label class="flex items-center gap-1.5 cursor-pointer ml-auto">
          <input v-model="fmtSortKeys" class="accent-primary" type="checkbox" @change="fmtCompute()"/>
          <span class="text-[11px] text-muted-foreground">키 정렬 (A→Z)</span>
        </label>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div class="flex h-9 items-center justify-between border-b border-border px-3">
            <span class="text-[11px] font-medium text-muted-foreground">JSON 입력</span>
            <button v-if="fmtInput" class="rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                    @click="fmtInput = ''; fmtCompute()">
              <X class="size-3.5"/>
            </button>
          </div>
          <textarea v-model="fmtInput"
                    class="h-64 resize-none bg-muted/40 p-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
                    placeholder='{"key": "value"}'
                    @input="fmtCompute()"/>
        </div>
        <div class="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div class="flex h-9 items-center justify-between border-b border-border px-3">
            <span class="text-[11px] font-medium text-muted-foreground">결과</span>
            <button v-if="fmtOutput"
                    :class="fmtCopied ? 'text-emerald-500' : 'text-muted-foreground/50 hover:text-foreground'"
                    class="rounded p-0.5 transition-colors"
                    @click="copyText(fmtOutput)">
              <Check v-if="fmtCopied" class="size-3.5"/>
              <Copy v-else class="size-3.5"/>
            </button>
          </div>
          <div class="h-64 overflow-auto">
            <div v-if="fmtError" class="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
              <div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle class="size-4 text-destructive/70"/>
              </div>
              <p class="text-[12px] text-destructive">{{ fmtError }}</p>
              <pre v-if="fmtErrorSnippet"
                   class="max-w-full overflow-x-auto rounded-lg bg-muted/60 p-2.5 text-left font-mono text-[11px] leading-4 text-foreground">{{ fmtErrorSnippet }}</pre>
            </div>

            <pre v-else-if="fmtOutput && !fmtHighlighted"
                 class="p-3 font-mono text-[13px] text-foreground whitespace-pre-wrap break-all">{{ fmtOutput }}</pre>

            <div v-else-if="fmtOutput" class="py-2">
              <div v-for="(ln, i) in fmtDisplayLines" :key="i"
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
                  <Check v-if="fmtCopiedLine === i" class="size-3 text-emerald-500"/>
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

      <div v-if="fmtInput && fmtOutput && !fmtError" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <template v-if="fmtStats">
          <span>키 <span class="font-mono text-foreground/80">{{ fmtStats.keys }}</span></span>
          <span>최대 깊이 <span class="font-mono text-foreground/80">{{ fmtStats.maxDepth }}</span></span>
          <span>객체 <span class="font-mono text-foreground/80">{{ fmtStats.objects }}</span></span>
          <span>배열 <span class="font-mono text-foreground/80">{{ fmtStats.arrays }}</span></span>
          <span class="text-border">·</span>
        </template>
        <span>원본 <span class="font-mono text-foreground/80">{{ formatBytes(fmtInputBytes) }}</span></span>
        <span>→</span>
        <span>결과 <span class="font-mono text-foreground/80">{{ formatBytes(fmtOutputBytes) }}</span></span>
        <span :class="fmtOutputBytes < fmtInputBytes ? 'text-emerald-500' : 'text-muted-foreground'">
          ({{
            fmtOutputBytes < fmtInputBytes ? '' : '+'
          }}{{ fmtInputBytes > 0 ? Math.round((fmtOutputBytes - fmtInputBytes) / fmtInputBytes * 100) : 0 }}%)
        </span>
      </div>
    </div>

    <!-- JSON Diff/병합 뷰어 -->
    <div v-else-if="tab === 'diff'" class="flex flex-col gap-3">
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div class="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div class="flex h-9 items-center justify-between border-b border-border px-3">
            <span class="text-[11px] font-medium text-muted-foreground">JSON A (원본)</span>
          </div>
          <textarea v-model="diffLeft"
                    class="h-48 resize-none bg-muted/40 p-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
                    placeholder='{"name": "홍길동", "age": 30}'
                    @input="diffCompute()"/>
        </div>
        <div class="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div class="flex h-9 items-center justify-between border-b border-border px-3">
            <span class="text-[11px] font-medium text-muted-foreground">JSON B (비교 대상)</span>
          </div>
          <textarea v-model="diffRight"
                    class="h-48 resize-none bg-muted/40 p-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
                    placeholder='{"name": "홍길동", "age": 31}'
                    @input="diffCompute()"/>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center justify-between border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">비교 결과</span>
          <span v-if="!diffError && diffEntries.length" class="text-[11px] text-muted-foreground/70">{{ diffEntries.length }}건</span>
        </div>

        <div v-if="diffError" class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <AlertCircle class="size-4 text-destructive/70"/>
          <p class="text-[12px] text-destructive">{{ diffError }}</p>
        </div>

        <div v-else-if="!diffLeft || !diffRight" class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <ArrowRight class="size-4 text-muted-foreground/40"/>
          <p class="text-[11px] text-muted-foreground/50">양쪽에 JSON을 입력하면 구조적으로 비교합니다</p>
        </div>

        <div v-else-if="diffEntries.length === 0" class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <Check class="size-4 text-emerald-500"/>
          <p class="text-[12px] text-muted-foreground">두 JSON이 완전히 동일합니다</p>
        </div>

        <ul v-else class="divide-y divide-border">
          <li v-for="(entry, i) in diffEntries" :key="i" class="flex items-start gap-2 px-3 py-2 text-[12px]">
            <span :class="DIFF_KIND_CLASS[entry.kind]" class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase">
              {{ DIFF_KIND_LABEL[entry.kind] }}
            </span>
            <span class="min-w-0 flex-1 font-mono break-all">
              <span class="text-foreground">{{ entry.path }}</span>
              <template v-if="entry.kind === 'changed'">
                : <span class="text-rose-500 line-through">{{ formatDiffValue(entry.oldValue) }}</span>
                → <span class="text-emerald-600">{{ formatDiffValue(entry.newValue) }}</span>
              </template>
              <template v-else-if="entry.kind === 'removed'">
                : <span class="text-rose-500">{{ formatDiffValue(entry.oldValue) }}</span>
              </template>
              <template v-else>
                : <span class="text-emerald-600">{{ formatDiffValue(entry.newValue) }}</span>
              </template>
            </span>
          </li>
        </ul>
      </div>
    </div>

    <!-- JSONPath 플레이그라운드 -->
    <div v-else class="flex flex-col gap-3">
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">JSON 입력</span>
        </div>
        <textarea v-model="jpInput"
                  class="h-48 w-full resize-none bg-muted/40 p-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
                  placeholder='{"store": {"book": [{"author": "Kim"}]}}'
                  @input="jpCompute()"/>
      </div>

      <div class="flex items-center gap-2">
        <input v-model="jpExpr"
               class="flex-1 rounded-lg border border-input bg-background px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
               placeholder="$.store.book[*].author"
               @input="jpCompute()"/>
      </div>

      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center justify-between border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">매칭 결과</span>
          <span v-if="!jpError && jpMatches.length" class="text-[11px] text-muted-foreground/70">{{ jpMatches.length }}건</span>
        </div>

        <div v-if="jpError" class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <AlertCircle class="size-4 text-destructive/70"/>
          <p class="text-[12px] text-destructive">{{ jpError }}</p>
        </div>

        <div v-else-if="!jpInput || !jpExpr" class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <ArrowRight class="size-4 text-muted-foreground/40"/>
          <p class="text-[11px] text-muted-foreground/50">JSON과 JSONPath 표현식을 입력하면 매칭 결과가 나타납니다</p>
        </div>

        <div v-else-if="jpMatches.length === 0" class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <p class="text-[12px] text-muted-foreground">매칭되는 경로가 없습니다</p>
        </div>

        <ul v-else class="divide-y divide-border">
          <li v-for="(m, i) in jpMatches" :key="i" class="flex items-start gap-2 px-3 py-2 text-[12px] font-mono">
            <span class="min-w-0 flex-1 break-all text-violet-600">{{ m.path }}</span>
            <span class="min-w-0 flex-1 break-all text-foreground">{{ formatDiffValue(m.value) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {AlertCircle, ArrowRight, Check, Copy, X} from 'lucide-vue-next'
import {formatJson, minifyJson} from '../utils/jsonFormat'
import {
  computeJsonStats,
  extractLineValue,
  getLine,
  locateJsonSyntaxError,
  tokenizeJsonLine,
  type JsonTokenType,
} from '../utils/jsonAnalysis'
import {diffJson, type JsonDiffEntry, type JsonDiffKind} from '../utils/jsonDiff'
import {queryJsonPath, type JsonPathMatch} from '../utils/jsonPath'

type TabId = 'formatter' | 'diff' | 'jsonpath'

const TABS: Array<{ id: TabId; label: string }> = [
  {id: 'formatter', label: '포맷터'},
  {id: 'diff', label: 'Diff'},
  {id: 'jsonpath', label: 'JSONPath'},
]

const route = useRoute()
const router = useRouter()

const initialTab = typeof route.query.tab === 'string' && TABS.some(t => t.id === route.query.tab)
    ? route.query.tab as TabId
    : 'formatter'

const tab = ref<TabId>(initialTab)

watch(tab, id => {
  if (route.query.tab === id) return
  router.replace({query: {...route.query, tab: id}})
})

watch(() => route.query.tab, q => {
  if (typeof q === 'string' && q !== tab.value && TABS.some(t => t.id === q)) tab.value = q as TabId
})

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDiffValue(value: unknown): string {
  if (value === undefined) return '(없음)'
  if (typeof value === 'string') return JSON.stringify(value)
  return JSON.stringify(value)
}

async function copyText(text: string) {
  if (!text) return
  await navigator.clipboard.writeText(text)
  fmtCopied.value = true
  setTimeout(() => {
    fmtCopied.value = false
  }, 2000)
}

// ── 포맷터 탭 ──────────────────────────────────────────
const fmtInput = ref('{"name":"홍길동","age":30,"skills":["Java","Vue","Spring"]}')
const fmtOutput = ref('')
const fmtError = ref('')
const fmtErrorLoc = ref<{ line: number; column: number; lineText: string } | null>(null)
const fmtMode = ref('format')
const fmtCopied = ref(false)
const fmtCopiedLine = ref<number | null>(null)
const fmtParsed = ref<unknown>(undefined)

const fmtIndent = ref<number | string>(2)
const fmtSortKeys = ref(false)
const fmtIndentOptions = [
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

const fmtOutputLines = computed(() => fmtOutput.value ? fmtOutput.value.split('\n') : [])
const fmtHighlighted = computed(() => fmtOutputLines.value.length <= MAX_HIGHLIGHT_LINES)
const fmtDisplayLines = computed(() =>
    fmtHighlighted.value ? fmtOutputLines.value.map(text => ({text, tokens: tokenizeJsonLine(text)})) : [],
)

const fmtStats = computed(() =>
    fmtOutput.value && !fmtError.value && fmtParsed.value !== undefined ? computeJsonStats(fmtParsed.value) : null,
)

const fmtErrorSnippet = computed(() => {
  const loc = fmtErrorLoc.value
  if (!loc || !loc.lineText) return ''
  const windowStart = Math.max(0, loc.column - 1 - 40)
  const text = loc.lineText.slice(windowStart, windowStart + 80)
  const caret = ' '.repeat(Math.max(0, Math.min(loc.column - 1 - windowStart, text.length))) + '^'
  return `${text}\n${caret}`
})

const fmtInputBytes = computed(() => new TextEncoder().encode(fmtInput.value).length)
const fmtOutputBytes = computed(() => new TextEncoder().encode(fmtOutput.value).length)

function fmtCompute() {
  fmtError.value = ''
  fmtErrorLoc.value = null
  fmtOutput.value = ''
  fmtParsed.value = undefined
  if (!fmtInput.value) return
  try {
    fmtParsed.value = JSON.parse(fmtInput.value)
    fmtOutput.value = fmtMode.value === 'format'
        ? formatJson(fmtInput.value, fmtIndent.value, fmtSortKeys.value)
        : minifyJson(fmtInput.value, fmtSortKeys.value)
  } catch (e: unknown) {
    fmtParsed.value = undefined
    const loc = locateJsonSyntaxError(fmtInput.value)
    if (loc) {
      fmtError.value = `${loc.line}번째 줄 ${loc.column}번째 열: ${loc.message}`
      fmtErrorLoc.value = {line: loc.line, column: loc.column, lineText: getLine(fmtInput.value, loc.line)}
    } else {
      fmtError.value = e instanceof Error ? e.message : '변환 중 오류가 발생했습니다.'
    }
  }
}

async function copyLine(index: number, lineText: string) {
  await navigator.clipboard.writeText(extractLineValue(lineText))
  fmtCopiedLine.value = index
  setTimeout(() => {
    if (fmtCopiedLine.value === index) fmtCopiedLine.value = null
  }, 1500)
}

fmtCompute()

// ── Diff/병합 탭 ────────────────────────────────────────
const diffLeft = ref('{"name":"홍길동","age":30,"city":"서울"}')
const diffRight = ref('{"name":"홍길동","age":31,"country":"한국"}')
const diffError = ref('')
const diffEntries = ref<JsonDiffEntry[]>([])

const DIFF_KIND_LABEL: Record<JsonDiffKind, string> = {
  added: '추가',
  removed: '삭제',
  changed: '변경',
}
const DIFF_KIND_CLASS: Record<JsonDiffKind, string> = {
  added: 'bg-emerald-500/10 text-emerald-600',
  removed: 'bg-rose-500/10 text-rose-500',
  changed: 'bg-amber-500/10 text-amber-600',
}

function diffCompute() {
  diffError.value = ''
  diffEntries.value = []
  if (!diffLeft.value || !diffRight.value) return
  let a: unknown
  let b: unknown
  try {
    a = JSON.parse(diffLeft.value)
  } catch {
    diffError.value = 'JSON A를 파싱할 수 없습니다. 문법을 확인하세요.'
    return
  }
  try {
    b = JSON.parse(diffRight.value)
  } catch {
    diffError.value = 'JSON B를 파싱할 수 없습니다. 문법을 확인하세요.'
    return
  }
  diffEntries.value = diffJson(a, b)
}

diffCompute()

// ── JSONPath 탭 ────────────────────────────────────────
const jpInput = ref('{"store":{"book":[{"author":"Kim","price":10},{"author":"Lee","price":20}]}}')
const jpExpr = ref('$.store.book[*].author')
const jpError = ref('')
const jpMatches = ref<JsonPathMatch[]>([])

function jpCompute() {
  jpError.value = ''
  jpMatches.value = []
  if (!jpInput.value || !jpExpr.value) return
  let data: unknown
  try {
    data = JSON.parse(jpInput.value)
  } catch {
    jpError.value = 'JSON을 파싱할 수 없습니다. 문법을 확인하세요.'
    return
  }
  try {
    jpMatches.value = queryJsonPath(data, jpExpr.value)
  } catch (e: unknown) {
    jpError.value = e instanceof Error ? e.message : 'JSONPath 표현식을 해석할 수 없습니다.'
  }
}

jpCompute()
</script>

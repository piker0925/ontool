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

    <!-- TOC 생성기 -->
    <div v-if="tab === 'toc'" class="grid min-h-[380px] grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-2 lg:divide-x lg:divide-y-0">
      <div class="flex flex-col">
        <div class="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
          <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">마크다운 입력</span>
          <button v-if="tocInput" class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground/70 transition-colors hover:text-destructive"
                  @click="tocInput = ''">
            <Eraser class="size-3"/>
            지우기
          </button>
        </div>
        <textarea v-model="tocInput"
                  class="min-h-[28vh] flex-1 resize-y bg-muted/40 p-4 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
                  placeholder="# 제목&#10;## 소제목"/>
      </div>

      <div class="flex flex-col">
        <div class="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
          <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">목차</span>
          <button v-if="tocOutput"
                  :class="tocCopied ? 'text-emerald-500' : 'text-muted-foreground/60 hover:text-foreground'"
                  class="rounded p-0.5 transition-colors"
                  @click="copyToc">
            <Check v-if="tocCopied" class="size-3.5"/>
            <Copy v-else class="size-3.5"/>
          </button>
        </div>
        <pre v-if="tocOutput" class="h-full flex-1 overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-[13px] text-foreground">{{ tocOutput }}</pre>
        <div v-else class="flex h-full flex-1 flex-col items-center justify-center gap-2 text-center">
          <ArrowRight class="size-4 text-muted-foreground/40"/>
          <p class="text-[11px] text-muted-foreground/50">헤딩(#~######)이 있으면 목차가 생성됩니다</p>
        </div>
      </div>
    </div>

    <!-- 표 생성기 -->
    <div v-else class="flex flex-col gap-3">
      <div class="flex gap-0.5 rounded-lg bg-muted p-0.5 w-fit">
        <button v-for="opt in [{ value: 'csv', label: 'CSV 붙여넣기' }, { value: 'grid', label: '직접 입력' }]" :key="opt.value"
                :class="tableMode === opt.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                class="rounded-md px-3 py-1 text-[12px] font-medium transition-colors"
                @click="tableMode = opt.value as TableMode">{{ opt.label }}
        </button>
      </div>

      <div v-if="tableMode === 'csv'" class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">CSV 입력 (첫 줄은 헤더)</span>
          <button v-if="csvInput" class="rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                  @click="csvInput = ''">
            <X class="size-3.5"/>
          </button>
        </div>
        <textarea v-model="csvInput"
                  class="h-40 w-full resize-none bg-muted/40 p-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
                  placeholder="이름,도시,점수&#10;홍길동,서울,95"/>
      </div>

      <div v-else class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            행
            <input v-model.number="gridRowCount" class="w-14 rounded-md border border-input bg-background px-2 py-1 text-[13px] text-foreground outline-none" max="20" min="1" type="number"/>
          </label>
          <label class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            열
            <input v-model.number="gridColCount" class="w-14 rounded-md border border-input bg-background px-2 py-1 text-[13px] text-foreground outline-none" max="10" min="1" type="number"/>
          </label>
        </div>
        <div class="overflow-x-auto rounded-xl border border-border bg-card p-2">
          <table class="border-collapse">
            <tbody>
            <tr v-for="(row, r) in gridRows" :key="r">
              <td v-for="(_, c) in row" :key="c" class="p-0.5">
                <input v-model="gridRows[r][c]"
                       :placeholder="r === 0 ? `열${c + 1}` : ''"
                       class="w-28 rounded-md border border-input bg-background px-2 py-1 text-[13px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"/>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <span class="text-[11px] text-muted-foreground">열 정렬</span>
        <div v-for="(_, i) in tableColumnCount" :key="i" class="flex items-center gap-1">
          <span class="text-[11px] text-muted-foreground/70">열{{ i + 1 }}</span>
          <select v-model="columnAligns[i]" class="rounded-md border border-input bg-background px-1.5 py-0.5 text-[12px] text-foreground outline-none">
            <option value="left">좌</option>
            <option value="center">중앙</option>
            <option value="right">우</option>
          </select>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center justify-between border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">결과</span>
          <button v-if="tableOutput"
                  :class="tableCopied ? 'text-emerald-500' : 'text-muted-foreground/50 hover:text-foreground'"
                  class="rounded p-0.5 transition-colors"
                  @click="copyTable">
            <Check v-if="tableCopied" class="size-3.5"/>
            <Copy v-else class="size-3.5"/>
          </button>
        </div>
        <pre v-if="tableOutput" class="overflow-auto p-3 font-mono text-[13px] text-foreground whitespace-pre-wrap break-all">{{ tableOutput }}</pre>
        <div v-else class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <ArrowRight class="size-4 text-muted-foreground/40"/>
          <p class="text-[11px] text-muted-foreground/50">데이터를 입력하면 마크다운 표가 생성됩니다</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {ArrowRight, Check, Copy, Eraser, X} from 'lucide-vue-next'
import {generateToc} from '../utils/markdownToc'
import {buildMarkdownTable, type ColumnAlign, parseCsv} from '../utils/markdownTable'
import {clamp} from '../utils/clamp'

type TabId = 'toc' | 'table'
type TableMode = 'csv' | 'grid'

const TABS: Array<{ id: TabId; label: string }> = [
  {id: 'toc', label: 'TOC 생성기'},
  {id: 'table', label: '표 생성기'},
]

const route = useRoute()
const router = useRouter()

const initialTab = typeof route.query.tab === 'string' && TABS.some(t => t.id === route.query.tab)
    ? route.query.tab as TabId
    : 'toc'

const tab = ref<TabId>(initialTab)

watch(tab, id => {
  if (route.query.tab === id) return
  router.replace({query: {...route.query, tab: id}})
})

watch(() => route.query.tab, q => {
  if (typeof q === 'string' && q !== tab.value && TABS.some(t => t.id === q)) tab.value = q as TabId
})

async function copyWith(text: string, copiedFlag: { value: boolean }) {
  if (!text) return
  await navigator.clipboard.writeText(text)
  copiedFlag.value = true
  setTimeout(() => {
    copiedFlag.value = false
  }, 2000)
}

// ── TOC 생성기 탭 ──────────────────────────────────────
const tocInput = ref('# 제목\n## 소제목\n### 세부 항목\n## 다음 섹션')
const tocOutput = computed(() => generateToc(tocInput.value))
const tocCopied = ref(false)

async function copyToc() {
  await copyWith(tocOutput.value, tocCopied)
}

// ── 표 생성기 탭 ────────────────────────────────────────
const tableMode = ref<TableMode>('csv')
const csvInput = ref('이름,도시,점수\n홍길동,서울,95\n김철수,부산,88')

const gridRowCountRaw = ref(3)
const gridColCountRaw = ref(3)
const gridRowCount = computed({
  get: () => gridRowCountRaw.value,
  set: v => {
    gridRowCountRaw.value = clamp(v, 1, 20)
  },
})
const gridColCount = computed({
  get: () => gridColCountRaw.value,
  set: v => {
    gridColCountRaw.value = clamp(v, 1, 10)
  },
})
const gridRows = ref<string[][]>(
    Array.from({length: gridRowCount.value}, () => Array.from({length: gridColCount.value}, () => '')),
)

watch([gridRowCount, gridColCount], ([rowCount, colCount]) => {
  gridRows.value = Array.from({length: rowCount}, (_, r) =>
      Array.from({length: colCount}, (_, c) => gridRows.value[r]?.[c] ?? ''),
  )
})

const csvRows = computed(() => csvInput.value.trim() ? parseCsv(csvInput.value) : [])
const tableRows = computed(() => tableMode.value === 'csv' ? csvRows.value : gridRows.value)
const tableColumnCount = computed(() => tableRows.value[0]?.length ?? 0)

const columnAligns = ref<ColumnAlign[]>([])
watch(tableColumnCount, count => {
  columnAligns.value = Array.from({length: count}, (_, i) => columnAligns.value[i] ?? 'left')
}, {immediate: true})

const tableOutput = computed(() =>
    tableRows.value.length > 0 ? buildMarkdownTable(tableRows.value, columnAligns.value) : '',
)
const tableCopied = ref(false)

async function copyTable() {
  await copyWith(tableOutput.value, tableCopied)
}
</script>

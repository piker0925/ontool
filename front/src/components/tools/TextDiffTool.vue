<template>
  <div class="flex w-full flex-col gap-4">
    <!-- 입력 2패널 -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <label class="text-[11px] font-medium text-muted-foreground">원본</label>
          <div class="flex items-center gap-1">
            <button
                class="rounded-md px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                type="button"
                @click="loadSample"
            >
              예시
            </button>
            <button
                class="rounded-md px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                type="button"
                @click="swap"
            >
              ⇄ 바꾸기
            </button>
          </div>
        </div>
        <textarea
            v-model="left"
            class="min-h-[24vh] resize-y rounded-xl border border-border bg-card p-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-ring"
            placeholder="원본 텍스트를 입력하세요"
            spellcheck="false"
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-[11px] font-medium text-muted-foreground">변경본</label>
        <textarea
            v-model="right"
            class="min-h-[24vh] resize-y rounded-xl border border-border bg-card p-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-ring"
            placeholder="비교할 텍스트를 입력하세요"
            spellcheck="false"
        />
      </div>
    </div>

    <!-- 결과 카드 -->
    <div class="rounded-xl border border-border bg-card">
      <!-- 상단 바: 통계 + 모드 토글 + 블록 네비게이션 -->
      <div class="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-4 py-1.5">
        <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">비교 결과</span>

        <template v-if="hasInput && model">
          <span class="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
            +{{ model.stats.addedLines }}줄
          </span>
          <span class="rounded-full bg-rose-500/15 px-2 py-0.5 font-mono text-[11px] text-rose-600 dark:text-rose-400">
            -{{ model.stats.removedLines }}줄
          </span>
          <span class="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            변경 블록 {{ model.stats.blocks }}개
          </span>
          <span class="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            유사도 {{ model.stats.similarity }}%
          </span>
        </template>

        <div class="ml-auto flex items-center gap-2">
          <!-- 변경 블록 네비게이션 -->
          <div v-if="model && model.stats.blocks > 0" class="flex items-center gap-1">
            <span class="font-mono text-[11px] text-muted-foreground">{{ currentBlock + 1 }}/{{ model.stats.blocks }}</span>
            <button
                :disabled="currentBlock <= 0"
                class="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                title="이전 변경 블록"
                type="button"
                @click="goBlock(currentBlock - 1)"
            >
              ↑
            </button>
            <button
                :disabled="currentBlock >= model.stats.blocks - 1"
                class="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                title="다음 변경 블록"
                type="button"
                @click="goBlock(currentBlock + 1)"
            >
              ↓
            </button>
          </div>

          <!-- 모드 토글 -->
          <div class="flex overflow-hidden rounded-lg border border-border">
            <button
                :class="mode === 'side' ? 'bg-zone-accent-life text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
                class="px-2.5 py-1 text-[11px] font-medium transition-colors"
                type="button"
                @click="mode = 'side'"
            >
              나란히
            </button>
            <button
                :class="mode === 'inline' ? 'bg-zone-accent-life text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
                class="px-2.5 py-1 text-[11px] font-medium transition-colors"
                type="button"
                @click="mode = 'inline'"
            >
              인라인
            </button>
            <button
                :class="mode === 'merged' ? 'bg-zone-accent-life text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
                class="px-2.5 py-1 text-[11px] font-medium transition-colors"
                type="button"
                @click="mode = 'merged'"
            >
              합쳐보기
            </button>
          </div>
        </div>
      </div>

      <div ref="resultEl" class="p-3">
        <p v-if="!hasInput" class="px-1 py-2 text-[12px] text-muted-foreground">
          두 텍스트를 입력하면 즉시 비교합니다
        </p>
        <p v-else-if="pending" class="px-1 py-2 text-[12px] text-muted-foreground">비교 중…</p>
        <p v-else-if="model && model.identical" class="px-1 py-2 text-[13px] text-emerald-600 dark:text-emerald-400">
          두 텍스트가 동일합니다
        </p>

        <!-- Side-by-side -->
        <div v-else-if="model && mode === 'side'" class="overflow-x-auto">
          <div class="min-w-[640px] font-mono text-[12px] leading-relaxed">
            <div
                v-for="(row, i) in renderRows"
                :key="i"
                :class="row.blockIndex === currentBlock && row.blockIndex !== null ? 'outline outline-1 -outline-offset-1 outline-zone-accent-life/50' : ''"
                :data-block="row.blockIndex ?? undefined"
                class="grid grid-cols-2 gap-x-2"
            >
              <div :class="lineClass(row.left.type)" class="flex min-w-0 rounded-sm">
                <span class="w-10 shrink-0 select-none pr-2 text-right text-muted-foreground">{{ row.left.lineNum ?? '' }}</span>
                <span class="min-w-0 whitespace-pre-wrap break-all">
                  <template v-if="row.left.spans">
                    <span
                        v-for="(s, j) in row.left.spans"
                        :key="j"
                        :class="s.changed ? 'rounded-[2px] bg-rose-500/30' : ''"
                    >{{ s.text }}</span>
                  </template>
                  <template v-else>{{ row.left.text || ' ' }}</template>
                </span>
              </div>
              <div :class="lineClass(row.right.type)" class="flex min-w-0 rounded-sm">
                <span class="w-10 shrink-0 select-none pr-2 text-right text-muted-foreground">{{ row.right.lineNum ?? '' }}</span>
                <span class="min-w-0 whitespace-pre-wrap break-all">
                  <template v-if="row.right.spans">
                    <span
                        v-for="(s, j) in row.right.spans"
                        :key="j"
                        :class="s.changed ? 'rounded-[2px] bg-emerald-500/30' : ''"
                    >{{ s.text }}</span>
                  </template>
                  <template v-else>{{ row.right.text || ' ' }}</template>
                </span>
              </div>
            </div>
            <p v-if="rowsTruncated" class="mt-2 px-1 text-[11px] text-muted-foreground">
              성능을 위해 처음 {{ MAX_RENDER_ROWS.toLocaleString() }}행까지만 표시합니다
            </p>
          </div>
        </div>

        <!-- Inline -->
        <div v-else-if="model && mode === 'inline'" class="overflow-x-auto">
          <div class="min-w-[480px] font-mono text-[12px] leading-relaxed">
            <div
                v-for="(line, i) in renderInline"
                :key="i"
                :class="[
                  lineClass(line.type),
                  line.blockIndex === currentBlock && line.blockIndex !== null ? 'outline outline-1 -outline-offset-1 outline-zone-accent-life/50' : '',
                ]"
                :data-block="line.blockIndex ?? undefined"
                class="flex min-w-0 rounded-sm"
            >
              <span class="w-10 shrink-0 select-none pr-2 text-right text-muted-foreground">{{ line.oldLineNum ?? '' }}</span>
              <span class="w-10 shrink-0 select-none pr-2 text-right text-muted-foreground">{{ line.newLineNum ?? '' }}</span>
              <span
                  :class="line.type === 'add' ? 'text-emerald-600 dark:text-emerald-400' : line.type === 'remove' ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground/50'"
                  class="w-4 shrink-0 select-none"
              >{{ line.type === 'add' ? '+' : line.type === 'remove' ? '-' : '' }}</span>
              <span class="min-w-0 whitespace-pre-wrap break-all">
                <template v-if="line.spans">
                  <span
                      v-for="(s, j) in line.spans"
                      :key="j"
                      :class="s.changed ? (line.type === 'add' ? 'rounded-[2px] bg-emerald-500/30' : 'rounded-[2px] bg-rose-500/30') : ''"
                  >{{ s.text }}</span>
                </template>
                <template v-else>{{ line.text || ' ' }}</template>
              </span>
            </div>
            <p v-if="inlineTruncated" class="mt-2 px-1 text-[11px] text-muted-foreground">
              성능을 위해 처음 {{ MAX_RENDER_ROWS.toLocaleString() }}행까지만 표시합니다
            </p>
          </div>
        </div>

        <!-- 합쳐보기(Merged): 원본·변경본을 하나의 텍스트 흐름으로 합쳐 표시 -->
        <div v-else-if="model && mode === 'merged'" class="overflow-x-auto">
          <div class="min-w-[320px] whitespace-pre-wrap break-all rounded-lg bg-muted/30 p-3 font-mono text-[12px] leading-relaxed">
            <span
                v-for="(s, j) in renderMerged"
                :key="j"
                :class="mergedSpanClass(s.type)"
            >{{ s.text }}</span>
            <p v-if="mergedTruncated" class="mt-2 px-1 text-[11px] text-muted-foreground">
              성능을 위해 일부만 표시합니다
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {buildDiffModel, type DiffLineType, type DiffRenderModel, type MergedSpanType} from '../../utils/diffRender'

const left = ref('')
const right = ref('')
const mode = ref<'side' | 'inline' | 'merged'>('side')
const model = ref<DiffRenderModel | null>(null)
const pending = ref(false)
const currentBlock = ref(0)
const resultEl = ref<HTMLElement | null>(null)

const MAX_RENDER_ROWS = 5000
const LARGE_LINE_THRESHOLD = 5000
const LARGE_DEBOUNCE_MS = 300

const hasInput = computed(() => left.value !== '' || right.value !== '')

const renderRows = computed(() => (model.value ? model.value.rows.slice(0, MAX_RENDER_ROWS) : []))
const rowsTruncated = computed(() => !!model.value && model.value.rows.length > MAX_RENDER_ROWS)
const renderInline = computed(() => (model.value ? model.value.inline.slice(0, MAX_RENDER_ROWS) : []))
const inlineTruncated = computed(() => !!model.value && model.value.inline.length > MAX_RENDER_ROWS)
const renderMerged = computed(() => (model.value ? model.value.merged.slice(0, MAX_RENDER_ROWS) : []))
const mergedTruncated = computed(() => !!model.value && model.value.merged.length > MAX_RENDER_ROWS)

function lineClass(type: DiffLineType): string {
  switch (type) {
    case 'add':
      return 'bg-emerald-500/15'
    case 'remove':
      return 'bg-rose-500/15'
    case 'empty':
      return 'bg-muted/40'
    default:
      return ''
  }
}

/** 합쳐보기 조각 스타일: 삭제=취소선+옅은 빨강, 추가=밑줄+옅은 초록 */
function mergedSpanClass(type: MergedSpanType): string {
  switch (type) {
    case 'add':
      return 'rounded-[2px] bg-emerald-500/20 text-emerald-700 underline decoration-emerald-600/70 dark:bg-emerald-500/25 dark:text-emerald-300 dark:decoration-emerald-400/70'
    case 'remove':
      return 'rounded-[2px] bg-rose-500/20 text-rose-700 line-through decoration-rose-600/70 dark:bg-rose-500/25 dark:text-rose-300 dark:decoration-rose-400/70'
    default:
      return ''
  }
}

function countLines(s: string): number {
  if (s === '') return 0
  let n = 1
  for (let i = 0; i < s.length; i++) if (s[i] === '\n') n++
  return n
}

function compute() {
  const totalLines = countLines(left.value) + countLines(right.value)
  // 대용량 성능 가드: 라인 수가 크면 단어 단위 diff 생략
  model.value = buildDiffModel(left.value, right.value, {wordDiff: totalLines <= LARGE_LINE_THRESHOLD})
  currentBlock.value = 0
  pending.value = false
}

let timer: ReturnType<typeof setTimeout> | null = null

watch([left, right], () => {
  if (timer !== null) clearTimeout(timer)
  if (!hasInput.value) {
    model.value = null
    pending.value = false
    return
  }
  const totalLines = countLines(left.value) + countLines(right.value)
  // 대용량(>5000줄)일 때만 300ms 디바운스, 그 외에는 즉시 계산
  if (totalLines > LARGE_LINE_THRESHOLD) {
    pending.value = true
    timer = setTimeout(compute, LARGE_DEBOUNCE_MS)
  } else {
    compute()
  }
})

onBeforeUnmount(() => {
  if (timer !== null) clearTimeout(timer)
})

function goBlock(idx: number) {
  if (!model.value) return
  const clamped = Math.max(0, Math.min(idx, model.value.stats.blocks - 1))
  currentBlock.value = clamped
  const el = resultEl.value?.querySelector(`[data-block="${clamped}"]`)
  el?.scrollIntoView({behavior: 'smooth', block: 'center'})
}

function swap() {
  const tmp = left.value
  left.value = right.value
  right.value = tmp
}

function loadSample() {
  left.value = [
    '{',
    '  "name": "devtoolbox",',
    '  "version": "1.0.0",',
    '  "description": "developer tools",',
    '  "license": "MIT",',
    '  "scripts": {',
    '    "build": "vite build"',
    '  }',
    '}',
  ].join('\n')
  right.value = [
    '{',
    '  "name": "devtoolbox",',
    '  "version": "1.1.0",',
    '  "description": "all-in-one developer tools",',
    '  "scripts": {',
    '    "build": "vite build",',
    '    "test": "vitest run"',
    '  },',
    '  "private": true',
    '}',
  ].join('\n')
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-4">
    <!-- 엔진 라벨 + 프리셋 -->
    <div class="flex flex-wrap items-center gap-2">
      <span class="rounded-full border border-border bg-muted px-2.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
        JavaScript RegExp 엔진
      </span>
      <span class="text-[10px] text-muted-foreground">브라우저에서 즉시 실행 — 서버 전송 없음</span>
      <div class="ml-auto flex flex-wrap gap-1">
        <button
            v-for="p in REGEX_PRESETS"
            :key="p.id"
            class="rounded-lg border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            type="button"
            @click="applyPreset(p)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- 패턴 + 플래그 -->
    <div class="flex flex-col gap-2">
      <div :class="error ? 'border-destructive/60' : 'border-border focus-within:border-ring'"
           class="flex items-center gap-0 rounded-xl border bg-card px-3 font-mono text-[13px]">
        <span class="select-none text-muted-foreground">/</span>
        <input
            v-model="pattern"
            class="min-w-0 flex-1 bg-transparent px-1.5 py-2 text-foreground outline-none placeholder:text-muted-foreground/40"
            placeholder="(\d{4})-(\d{2})-(\d{2})"
            spellcheck="false"
            type="text"
        />
        <span class="select-none text-muted-foreground">/</span>
        <span class="select-none pl-0.5 text-primary">{{ flags }}</span>
      </div>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <label
            v-for="f in FLAG_DEFS"
            :key="f.flag"
            :title="f.desc"
            class="flex cursor-pointer items-center gap-1.5"
        >
          <input v-model="flagState[f.flag]" class="accent-primary" type="checkbox"/>
          <span class="font-mono text-[12px] font-semibold text-foreground">{{ f.flag }}</span>
          <span class="text-[11px] text-muted-foreground">{{ f.label }}</span>
        </label>
      </div>

      <p v-if="error" class="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 font-mono text-[12px] text-destructive">
        {{ error }}
      </p>
    </div>

    <!-- 모드 탭 -->
    <div class="flex w-56 gap-0.5 rounded-lg bg-muted p-0.5">
      <button
          v-for="tab in TABS"
          :key="tab.id"
          :class="mode === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          class="flex-1 rounded-md py-1 text-[12px] font-medium transition-colors"
          type="button"
          @click="mode = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 치환 패턴 (치환 모드) -->
    <div v-if="mode === 'replace'" class="flex flex-col gap-1.5">
      <label class="text-[11px] font-medium text-muted-foreground">치환 패턴 ($1, $&amp;, $&lt;name&gt; 지원)</label>
      <input
          v-model="replacement"
          class="rounded-xl border border-border bg-card px-3 py-2 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-ring"
          placeholder="[$1]"
          spellcheck="false"
          type="text"
      />
    </div>

    <!-- 테스트 텍스트 -->
    <div class="flex flex-col gap-1.5">
      <label class="text-[11px] font-medium text-muted-foreground">테스트 텍스트</label>
      <textarea
          v-model="text"
          class="min-h-[16vh] resize-y rounded-xl border border-border bg-card p-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-ring"
          placeholder="정규식을 테스트할 텍스트를 입력하세요"
          spellcheck="false"
      />
    </div>

    <!-- 하이라이트 미리보기 -->
    <div v-if="text && pattern && !error" class="rounded-xl border border-border bg-card">
      <div class="flex h-9 items-center gap-2 border-b border-border px-4">
        <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">하이라이트</span>
        <span class="text-[11px] text-muted-foreground">
          {{ matchOutcome.matches.length }}개 매치<template v-if="matchOutcome.truncated"> (최대 {{ MAX_MATCHES }}개까지만 표시)</template>
        </span>
      </div>
      <p class="whitespace-pre-wrap break-all p-4 font-mono text-[13px] leading-6 text-foreground">
        <template v-for="(seg, i) in segments" :key="i">
          <mark
              v-if="seg.matchIndex !== null"
              :class="seg.matchIndex % 2 === 0 ? 'bg-primary/20' : 'bg-primary/40'"
              class="rounded-[3px] px-px text-foreground"
          >{{ seg.text }}</mark>
          <template v-else>{{ seg.text }}</template>
        </template>
      </p>
    </div>

    <!-- 치환 결과 (치환 모드) -->
    <div v-if="mode === 'replace' && text && pattern && !error" class="rounded-xl border border-border bg-card">
      <div class="flex h-9 items-center gap-2 border-b border-border px-4">
        <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">치환 결과</span>
        <span class="text-[11px] text-muted-foreground">{{ replaceOutcome.count }}개 치환됨</span>
        <button
            class="ml-auto rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground"
            title="치환 결과 복사"
            type="button"
            @click="copyText(replaceOutcome.result, 'replace')"
        >
          <Check v-if="copiedKey === 'replace'" class="size-3.5 text-primary"/>
          <Copy v-else class="size-3.5"/>
        </button>
      </div>
      <p class="whitespace-pre-wrap break-all p-4 font-mono text-[13px] leading-6 text-foreground">{{ replaceOutcome.result }}</p>
    </div>

    <!-- 매치 목록 표 -->
    <div class="rounded-xl border border-border bg-card">
      <div class="flex h-9 items-center border-b border-border px-4">
        <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">매치 목록</span>
      </div>

      <p v-if="!pattern || !text" class="p-4 text-[12px] text-muted-foreground">
        패턴과 텍스트를 입력하면 매치 목록이 나타납니다
      </p>
      <p v-else-if="error" class="p-4 text-[12px] text-muted-foreground">패턴 오류를 먼저 해결하세요</p>
      <p v-else-if="matchOutcome.matches.length === 0" class="p-4 text-[13px] text-muted-foreground">
        일치하는 항목이 없습니다
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left font-mono text-[12px]">
          <thead>
          <tr class="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
            <th class="px-4 py-2 font-medium">#</th>
            <th class="px-2 py-2 font-medium">매치</th>
            <th class="px-2 py-2 font-medium">위치</th>
            <th class="px-2 py-2 font-medium">그룹</th>
            <th class="w-10 px-2 py-2"></th>
          </tr>
          </thead>
          <tbody>
          <tr
              v-for="m in matchOutcome.matches"
              :key="m.index"
              class="border-b border-border align-top last:border-0"
          >
            <td class="px-4 py-2 text-muted-foreground">{{ m.index + 1 }}</td>
            <td class="max-w-[24rem] break-all px-2 py-2 text-foreground">
              <mark :class="m.index % 2 === 0 ? 'bg-primary/20' : 'bg-primary/40'"
                    class="rounded-[3px] px-px text-foreground">{{ m.text }}</mark>
            </td>
            <td class="whitespace-nowrap px-2 py-2 text-muted-foreground">{{ m.start }}–{{ m.end }}</td>
            <td class="px-2 py-2">
              <span v-if="m.groups.length === 0" class="text-muted-foreground">—</span>
              <div v-else class="flex flex-col gap-0.5">
                <span v-for="g in m.groups" :key="g.num" class="break-all">
                  <span class="text-primary">{{ g.name ?? `$${g.num}` }}</span><span class="text-muted-foreground">:</span>
                  <span v-if="g.text !== null" class="text-foreground"> {{ g.text }}</span>
                  <span v-else class="text-muted-foreground"> (미참여)</span>
                </span>
              </div>
            </td>
            <td class="px-2 py-2">
              <button
                  class="rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-foreground"
                  title="매치 행 복사"
                  type="button"
                  @click="copyMatchRow(m)"
              >
                <Check v-if="copiedKey === `m-${m.index}`" class="size-3 text-primary"/>
                <Copy v-else class="size-3"/>
              </button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, reactive, ref} from 'vue'
import {Check, Copy} from 'lucide-vue-next'
import {
  findMatches,
  REGEX_PRESETS,
  type RegexMatchInfo,
  type RegexPreset,
  replacePreview,
  segmentText,
} from '../../utils/regexTester'

const MAX_MATCHES = 1000

const FLAG_DEFS = [
  {flag: 'g', label: '전체 검색', desc: 'global — 모든 매치 탐색'},
  {flag: 'i', label: '대소문자 무시', desc: 'ignoreCase'},
  {flag: 'm', label: '멀티라인', desc: 'multiline — ^$가 줄 단위로 매치'},
  {flag: 's', label: 'dotAll', desc: '.이 개행 문자에도 매치'},
  {flag: 'u', label: '유니코드', desc: 'unicode — \\u{...} 및 서로게이트 쌍 처리'},
] as const

const TABS = [
  {id: 'match', label: '매치'},
  {id: 'replace', label: '치환'},
] as const

const pattern = ref('')
const text = ref('')
const replacement = ref('')
const mode = ref<'match' | 'replace'>('match')
const flagState = reactive<Record<string, boolean>>({g: true, i: false, m: false, s: false, u: false})
const copiedKey = ref('')

const flags = computed(() => FLAG_DEFS.map((f) => f.flag).filter((f) => flagState[f]).join(''))

const matchOutcome = computed(() => findMatches(pattern.value, flags.value, text.value, MAX_MATCHES))
const error = computed(() => matchOutcome.value.error)
const segments = computed(() => segmentText(text.value, matchOutcome.value.matches))
const replaceOutcome = computed(() =>
    replacePreview(pattern.value, flags.value, text.value, replacement.value))

function applyPreset(p: RegexPreset) {
  pattern.value = p.pattern
  text.value = p.sample
  for (const f of FLAG_DEFS) flagState[f.flag] = p.flags.includes(f.flag)
}

let copyTimer: ReturnType<typeof setTimeout> | undefined

async function copyText(value: string, key: string) {
  await navigator.clipboard.writeText(value)
  copiedKey.value = key
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copiedKey.value = ''), 1200)
}

function copyMatchRow(m: RegexMatchInfo) {
  const groupPart = m.groups.length
      ? '  ' + m.groups.map((g) => `${g.name ?? '$' + g.num}=${g.text ?? '(미참여)'}`).join('  ')
      : ''
  void copyText(`[${m.start}-${m.end}] ${m.text}${groupPart}`, `m-${m.index}`)
}

// 초기 예시: 날짜 프리셋 (그룹 캡처가 바로 보이도록)
applyPreset(REGEX_PRESETS.find((p) => p.id === 'date')!)
</script>

<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <div class="flex items-center gap-4 flex-wrap">
      <div class="flex items-center gap-2">
        <label class="text-[11px] font-medium text-muted-foreground">버전</label>
        <div class="flex rounded-lg border border-border overflow-hidden">
          <button v-for="v in (['v4', 'v7'] as const)" :key="v"
                  :class="uuidVersion === v ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'"
                  class="px-3 py-1 text-[12px] font-medium transition-colors"
                  @click="uuidVersion = v; generateUuids()">{{ v }}
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-[11px] font-medium text-muted-foreground">개수</label>
        <input v-model.number="uuidCount"
               class="w-16 rounded-lg border border-border bg-card px-2 py-1 text-[12px] text-foreground outline-none focus:border-ring"
               max="100" min="1" type="number"
               @change="clampCount"/>
      </div>
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input v-model="uuidNoHyphen" class="rounded accent-primary" type="checkbox"/>
        <span class="text-[11px] text-muted-foreground">하이픈 제거</span>
      </label>
    </div>
    <p v-if="uuidVersion === 'v7'" class="text-[11px] text-muted-foreground">
      v7은 앞 48비트가 생성 시각(밀리초)이라 시간순 정렬이 가능합니다.
    </p>
    <div class="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
      <div v-for="(uid, i) in uuidList" :key="i"
           class="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 transition-colors hover:bg-accent">
        <span class="flex-1 font-mono text-[13px] text-foreground break-all">{{ uid }}</span>
        <span v-if="copiedIndex === i"
              class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">복사됨</span>
        <button class="rounded p-1 transition-colors text-muted-foreground/50 hover:text-foreground"
                @click="copyRow(uid, i)">
          <Copy class="size-3.5"/>
        </button>
      </div>
      <p v-if="uuidList.length === 0" class="text-[12px] text-muted-foreground py-2">생성 버튼을 클릭하세요</p>
    </div>
    <div class="flex gap-2 items-center flex-wrap">
      <button
          class="flex-1 min-w-24 rounded-xl bg-primary py-2.5 text-[14px] font-semibold text-primary-foreground transition-colors hover:opacity-90"
          @click="generateUuids()">생성
      </button>
      <template v-if="uuidList.length > 0">
        <select v-model="exportFormat"
                class="rounded-xl border border-border bg-card px-3 py-2.5 text-[12px] text-foreground outline-none focus:border-ring">
          <option value="lines">줄바꿈</option>
          <option value="json">JSON 배열</option>
          <option value="csv">CSV</option>
          <option value="sql">SQL IN절</option>
        </select>
        <button
            class="rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] text-foreground/80 transition-colors hover:bg-accent"
            @click="copyExport">
          {{ exportCopied ? '복사됨!' : '전체 복사' }}
        </button>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {Copy} from 'lucide-vue-next'
import {formatUuidExport, generateUuid, generateUuidV7, type UuidExportFormat} from '../../utils/frontendTools'

const uuidRawList = ref<string[]>([])
const uuidCount = ref(1)
const uuidVersion = ref<'v4' | 'v7'>('v4')
const uuidNoHyphen = ref(false)
const exportFormat = ref<UuidExportFormat>('lines')
const copiedIndex = ref<number | null>(null)
const exportCopied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined
let exportTimer: ReturnType<typeof setTimeout> | undefined

const uuidList = computed(() =>
    uuidRawList.value.map(id => uuidNoHyphen.value ? id.replace(/-/g, '') : id)
)

function clampCount() {
  const n = Math.floor(Number(uuidCount.value))
  uuidCount.value = isNaN(n) ? 1 : Math.min(100, Math.max(1, n))
}

function generateUuids() {
  clampCount()
  copiedIndex.value = null
  uuidRawList.value = Array.from(
      {length: uuidCount.value},
      () => uuidVersion.value === 'v7' ? generateUuidV7() : generateUuid(),
  )
}

async function copyRow(text: string, index: number) {
  await navigator.clipboard.writeText(text)
  copiedIndex.value = index
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copiedIndex.value = null), 3000)
}

async function copyExport() {
  await navigator.clipboard.writeText(formatUuidExport(uuidList.value, exportFormat.value))
  exportCopied.value = true
  clearTimeout(exportTimer)
  exportTimer = setTimeout(() => (exportCopied.value = false), 2000)
}

generateUuids()
</script>

<template>
  <div class="flex flex-col gap-3 max-w-4xl mx-auto w-full">
    <div class="flex items-center gap-4 flex-wrap">
      <div class="flex items-center gap-1.5">
        <span class="text-[11px] text-muted-foreground">정밀도(소수점)</span>
        <div class="flex gap-0.5 rounded-lg bg-muted p-0.5">
          <button v-for="p in [0, 1, 2, 3]" :key="p"
                  :class="precision === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                  class="rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors"
                  @click="precision = p; compute()">{{ p }}
          </button>
        </div>
      </div>
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input v-model="removeMetadata" class="accent-primary" type="checkbox" @change="compute()"/>
        <span class="text-[11px] text-muted-foreground">주석·메타데이터 제거</span>
      </label>
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input v-model="keepViewBox" class="accent-primary" type="checkbox" @change="compute()"/>
        <span class="text-[11px] text-muted-foreground">viewBox 유지</span>
      </label>
    </div>

    <div class="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
      <div class="flex h-9 items-center justify-between border-b border-border px-3">
        <span class="text-[11px] font-medium text-muted-foreground">SVG 입력</span>
        <div class="flex items-center gap-2">
          <button class="text-[11px] text-muted-foreground hover:text-foreground transition-colors" @click="fileInput?.click()">
            파일 선택
          </button>
          <input ref="fileInput" accept=".svg,image/svg+xml" class="hidden" type="file" @change="handleFileSelect"/>
          <button v-if="input" class="rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                  @click="input = ''; compute()">
            <X class="size-3.5"/>
          </button>
        </div>
      </div>
      <textarea v-model="input"
                class="h-40 resize-none bg-muted/40 p-3 font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground/40"
                placeholder="<svg>...</svg>"
                @input="compute()"/>
    </div>

    <div v-if="error" class="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5">
      <AlertCircle class="size-4 shrink-0 text-destructive/70"/>
      <p class="text-[12px] text-destructive">{{ error }}</p>
    </div>

    <template v-else-if="result">
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div class="flex h-8 items-center px-3 text-[11px] font-medium text-muted-foreground">최적화 전</div>
          <iframe :srcdoc="previewHtml(input)" class="h-48 w-full bg-white" sandbox=""></iframe>
        </div>
        <div class="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div class="flex h-8 items-center justify-between px-3">
            <span class="text-[11px] font-medium text-muted-foreground">최적화 후</span>
            <button :class="copied ? 'text-emerald-500' : 'text-muted-foreground/50 hover:text-foreground'"
                    class="rounded p-0.5 transition-colors"
                    @click="copyOutput">
              <Check v-if="copied" class="size-3.5"/>
              <Copy v-else class="size-3.5"/>
            </button>
          </div>
          <iframe :srcdoc="previewHtml(result.output)" class="h-48 w-full bg-white" sandbox=""></iframe>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>원본 <span class="font-mono text-foreground/80">{{ formatBytes(result.originalBytes) }}</span></span>
        <span>→</span>
        <span>결과 <span class="font-mono text-foreground/80">{{ formatBytes(result.optimizedBytes) }}</span></span>
        <span :class="reductionPercent > 0 ? 'text-emerald-500' : 'text-muted-foreground'">
          ({{ reductionPercent >= 0 ? '-' : '+' }}{{ Math.abs(reductionPercent) }}%)
        </span>
      </div>
    </template>

    <div v-else class="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
      <ArrowRight class="size-4 text-muted-foreground/40"/>
      <p class="text-[11px] text-muted-foreground/50">SVG를 입력하면 최적화 결과가 표시됩니다</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {AlertCircle, ArrowRight, Check, Copy, X} from 'lucide-vue-next'
import {optimizeSvg, SvgParseError, type SvgOptimizeResult} from '../../utils/svgOptimize'

const input = ref('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <circle cx="50.123456" cy="50.654321" r="40.111111" fill="#6366f1"/>\n</svg>')
const precision = ref(2)
const removeMetadata = ref(true)
const keepViewBox = ref(true)
const error = ref('')
const result = ref<SvgOptimizeResult | null>(null)
const copied = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const reductionPercent = computed(() => {
  if (!result.value || result.value.originalBytes === 0) return 0
  return Math.round((1 - result.value.optimizedBytes / result.value.originalBytes) * 100)
})

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function previewHtml(svg: string): string {
  return `<!doctype html><html><head><style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh}svg{max-width:100%;max-height:100%}</style></head><body>${svg}</body></html>`
}

function compute() {
  error.value = ''
  result.value = null
  if (!input.value.trim()) return
  try {
    result.value = optimizeSvg(input.value, {
      precision: precision.value,
      removeMetadata: removeMetadata.value,
      keepViewBox: keepViewBox.value,
    })
  } catch (e: unknown) {
    error.value = e instanceof SvgParseError ? e.message : 'SVG를 처리하는 중 오류가 발생했습니다.'
  }
}

async function handleFileSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  input.value = await file.text()
  if (fileInput.value) fileInput.value.value = ''
  compute()
}

async function copyOutput() {
  if (!result.value) return
  await navigator.clipboard.writeText(result.value.output)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

compute()
</script>

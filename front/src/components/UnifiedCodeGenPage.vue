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

      <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <!-- 형식 셀렉터 -->
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-medium text-muted-foreground">형식</label>
          <select
              v-model="formatId"
              class="rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            <option v-for="f in FORMATS" :key="f.id" :value="f.id">{{ f.label }}</option>
          </select>
        </div>

        <!-- 내용 + 형식별 검증 가이드 -->
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-medium text-muted-foreground">{{ format.contentLabel }}</label>
          <input
              v-model="content"
              :class="contentError
                ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                : 'border-input focus:border-ring focus:ring-ring/20'"
              :placeholder="format.sample"
              class="rounded-md border bg-muted/40 px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:ring-2"
              type="text"
          />
          <p v-if="contentError" class="text-[11px] text-destructive">{{ contentError }}</p>
          <p v-else class="text-[11px] text-muted-foreground">{{ format.guide }}</p>
        </div>

        <!-- QR 전용 옵션 -->
        <template v-if="formatId === 'qr'">
          <div class="flex gap-3">
            <div class="flex flex-1 flex-col gap-1.5">
              <label class="text-[11px] font-medium text-muted-foreground">크기 (px)</label>
              <input
                  v-model="size"
                  class="rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  max="2048"
                  min="64"
                  placeholder="300"
                  type="number"
              />
            </div>
            <div class="flex flex-1 flex-col gap-1.5">
              <label class="text-[11px] font-medium text-muted-foreground">여백 (모듈)</label>
              <input
                  v-model="margin"
                  class="rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  max="10"
                  min="0"
                  placeholder="4"
                  type="number"
              />
            </div>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] font-medium text-muted-foreground">에러 정정 레벨</label>
            <select
                v-model="errorCorrection"
                class="rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option v-for="l in EC_LEVELS" :key="l.id" :value="l.id">{{ l.label }}</option>
            </select>
            <p class="text-[11px] text-muted-foreground">{{ ecLevel.help }}</p>
          </div>
        </template>

        <!-- 바코드 전용 옵션 -->
        <template v-else>
          <div class="flex gap-3">
            <div class="flex flex-1 flex-col gap-1.5">
              <label class="text-[11px] font-medium text-muted-foreground">너비 (px)</label>
              <input
                  v-model="width"
                  class="rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  max="2000"
                  min="50"
                  placeholder="400"
                  type="number"
              />
            </div>
            <div class="flex flex-1 flex-col gap-1.5">
              <label class="text-[11px] font-medium text-muted-foreground">높이 (px)</label>
              <input
                  v-model="height"
                  class="rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  max="1000"
                  min="20"
                  placeholder="120"
                  type="number"
              />
            </div>
          </div>
        </template>

        <!-- 색상 (공통) -->
        <div class="flex gap-3">
          <div class="flex flex-1 flex-col gap-1.5">
            <label class="text-[11px] font-medium text-muted-foreground">코드 색상</label>
            <div class="flex items-center gap-2">
              <input
                  :value="colorPickerValue(foreground, '#000000')"
                  class="size-8 shrink-0 cursor-pointer rounded border border-input bg-background p-0.5"
                  type="color"
                  @input="foreground = ($event.target as HTMLInputElement).value"
              />
              <input
                  v-model="foreground"
                  :class="isValidHexColor(foreground)
                    ? 'border-input focus:border-ring focus:ring-ring/20'
                    : 'border-destructive focus:border-destructive focus:ring-destructive/20'"
                  class="w-full rounded-md border bg-muted/40 px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-colors focus:ring-2"
                  placeholder="#000000"
                  type="text"
              />
            </div>
          </div>
          <div class="flex flex-1 flex-col gap-1.5">
            <label class="text-[11px] font-medium text-muted-foreground">배경색</label>
            <div class="flex items-center gap-2">
              <input
                  :value="colorPickerValue(background, '#FFFFFF')"
                  class="size-8 shrink-0 cursor-pointer rounded border border-input bg-background p-0.5"
                  type="color"
                  @input="background = ($event.target as HTMLInputElement).value"
              />
              <input
                  v-model="background"
                  :class="isValidHexColor(background)
                    ? 'border-input focus:border-ring focus:ring-ring/20'
                    : 'border-destructive focus:border-destructive focus:ring-destructive/20'"
                  class="w-full rounded-md border bg-muted/40 px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-colors focus:ring-2"
                  placeholder="#FFFFFF"
                  type="text"
              />
            </div>
          </div>
        </div>
        <p v-if="colorError" class="-mt-2 text-[11px] text-destructive">{{ colorError }}</p>
        <p v-else-if="lowContrast" class="-mt-2 text-[11px] text-amber-500">
          명암 대비가 낮아 스캐너가 인식하지 못할 수 있습니다 (대비율 {{ contrastText }}:1)
        </p>
      </div>

      <div class="flex h-9 shrink-0 items-center border-t border-border px-4">
        <p class="text-[11px] text-muted-foreground">입력하면 자동으로 생성됩니다</p>
      </div>
    </div>

    <!-- Output -->
    <div class="flex flex-col">
      <div class="flex h-10 shrink-0 items-center border-b border-border px-4">
        <span
            class="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          결과
          <Loader2 v-if="running" class="size-3 animate-spin"/>
        </span>
      </div>

      <div class="flex-1 overflow-auto">
        <div v-if="error" class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <AlertCircle class="size-5 text-destructive/70"/>
          <p class="text-[13px] text-foreground">{{ error }}</p>
          <p class="text-[11px] text-muted-foreground">입력을 확인하거나 잠시 후 다시 시도해 주세요</p>
        </div>
        <div v-else-if="imageBase64" class="flex flex-col items-center gap-4 p-6">
          <img
              :src="`data:image/png;base64,${imageBase64}`"
              alt="생성된 코드 이미지"
              class="max-w-full rounded border border-border bg-white shadow-sm"
              @load="onImageLoad"
          />
          <!-- 결과 메타 -->
          <div
              class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span>{{ generated.formatLabel }}</span>
            <span v-if="imageDims">{{ imageDims }} px</span>
            <span>PNG</span>
            <span v-if="generated.errorCorrection">에러 정정 {{ generated.errorCorrection }}</span>
            <span>내용 {{ generated.contentLength }}자</span>
          </div>
          <Button class="text-[12px]" size="sm" variant="outline" @click="downloadImage">
            다운로드 (PNG)
          </Button>
        </div>
        <div v-else class="flex h-full flex-col items-center justify-center gap-2.5 px-6 text-center">
          <div class="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-border">
            <ArrowRight class="size-5 text-muted-foreground/50"/>
          </div>
          <p class="text-[12px] text-muted-foreground">내용을 입력하면 코드 이미지가 나타납니다</p>
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
import {AlertCircle, ArrowRight, Loader2, Wand2} from 'lucide-vue-next'
import {apiClient} from '../api/client'
import {Button} from '@/components/ui/button'
import {
  type CodeFormatId,
  contrastRatio,
  isValidHexColor,
  normalizeHex,
  validateCodeContent,
} from './codeGenUtils'

interface CodeFormat {
  id: CodeFormatId
  label: string
  /** 내부적으로 호출하는 백엔드 모듈 id */
  moduleId: 'qr-code' | 'barcode'
  contentLabel: string
  sample: string
  /** 입력 규칙 안내 (검증 가이드) */
  guide: string
}

const FORMATS: CodeFormat[] = [
  {
    id: 'qr',
    label: 'QR 코드',
    moduleId: 'qr-code',
    contentLabel: 'URL 또는 텍스트',
    sample: 'https://github.com',
    guide: 'URL·텍스트 등 모든 내용 사용 가능',
  },
  {
    id: 'code128',
    label: '바코드 · Code 128',
    moduleId: 'barcode',
    contentLabel: '바코드 내용',
    sample: 'DEV-2026-0001',
    guide: '영문·숫자·ASCII 기호만 지원 (한글 불가)',
  },
  {
    id: 'ean13',
    label: '바코드 · EAN-13',
    moduleId: 'barcode',
    contentLabel: '상품 코드',
    sample: '8801234567893',
    guide: '숫자 12~13자리 — 12자리 입력 시 체크 디지트 자동 계산',
  },
]

const EC_LEVELS = [
  {id: 'L', label: 'L — 복원력 7%', help: '데이터 밀도 최소화. 화면 표시 등 깨끗한 환경에 적합합니다.'},
  {id: 'M', label: 'M — 복원력 15% (권장)', help: '일반 용도의 균형 잡힌 기본값입니다.'},
  {id: 'Q', label: 'Q — 복원력 25%', help: '오염·손상 우려가 있는 환경(옥외 부착 등)에 적합합니다.'},
  {id: 'H', label: 'H — 복원력 30%', help: '인쇄물·로고 삽입 등 가림이 생기는 용도에 적합합니다.'},
] as const

const route = useRoute()
const router = useRouter()

const initialFormat = typeof route.query.format === 'string' && FORMATS.some(f => f.id === route.query.format)
    ? route.query.format as CodeFormatId
    : 'qr'

const formatId = ref<CodeFormatId>(initialFormat)

// URL query 양방향 동기화 (replace라 뒤로가기 이력을 오염시키지 않음)
watch(formatId, id => {
  if (route.query.format === id) return
  router.replace({query: {...route.query, format: id}})
})

watch(() => route.query.format, q => {
  if (typeof q === 'string' && q !== formatId.value && FORMATS.some(f => f.id === q)) {
    formatId.value = q as CodeFormatId
  }
})

const content = ref('')
const size = ref('300')
const margin = ref('4')
const errorCorrection = ref<'L' | 'M' | 'Q' | 'H'>('M')
const width = ref('400')
const height = ref('120')
const foreground = ref('#000000')
const background = ref('#FFFFFF')

const imageBase64 = ref('')
const imageDims = ref('')
const error = ref('')
const running = ref(false)

/** 생성 시점의 설정 스냅샷 — 결과 메타 표시에 사용 */
const generated = ref({formatLabel: '', errorCorrection: '', contentLength: 0, filename: 'code.png'})

const format = computed(() => FORMATS.find(f => f.id === formatId.value) ?? FORMATS[0])
const ecLevel = computed(() => EC_LEVELS.find(l => l.id === errorCorrection.value) ?? EC_LEVELS[1])

/** 형식별 즉시 검증 — 백엔드 호출 전에 프론트에서 차단 */
const contentError = computed(() => validateCodeContent(formatId.value, content.value.trim()))

const colorError = computed(() => {
  if (!isValidHexColor(foreground.value)) return '코드 색상은 #RRGGBB 형식의 hex여야 합니다'
  if (!isValidHexColor(background.value)) return '배경색은 #RRGGBB 형식의 hex여야 합니다'
  return null
})

const contrast = computed(() =>
    colorError.value ? null : contrastRatio(foreground.value, background.value))
const lowContrast = computed(() => contrast.value !== null && contrast.value < 3)
const contrastText = computed(() => contrast.value === null ? '' : contrast.value.toFixed(1))

function colorPickerValue(hex: string, fallback: string): string {
  return isValidHexColor(hex) ? normalizeHex(hex).toLowerCase() : fallback
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let runToken = 0

watch([content, formatId, size, margin, errorCorrection, width, height, foreground, background], () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!content.value.trim() || contentError.value || colorError.value) {
    imageBase64.value = ''
    error.value = ''
    return
  }
  debounceTimer = setTimeout(generate, 500)
})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

async function generate() {
  const trimmed = content.value.trim()
  if (!trimmed || contentError.value || colorError.value) return
  const token = ++runToken
  running.value = true
  try {
    const params: Record<string, string> = {
      content: trimmed,
      foreground: normalizeHex(foreground.value),
      background: normalizeHex(background.value),
    }
    if (format.value.id === 'qr') {
      params.size = size.value || '300'
      params.margin = margin.value || '4'
      params.errorCorrection = errorCorrection.value
    } else {
      params.format = format.value.id
      params.width = width.value || '400'
      params.height = height.value || '120'
    }
    const {data} = await apiClient.post(`/api/v1/tools/${format.value.moduleId}/run`, params)
    if (token !== runToken) return
    imageBase64.value = data.result ?? ''
    imageDims.value = ''
    error.value = ''
    generated.value = {
      formatLabel: format.value.label,
      errorCorrection: format.value.id === 'qr' ? errorCorrection.value : '',
      contentLength: trimmed.length,
      filename: format.value.id === 'qr' ? 'qr-code.png' : `barcode-${format.value.id}.png`,
    }
  } catch (e: unknown) {
    if (token !== runToken) return
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message ?? '서버에 연결할 수 없습니다'
    imageBase64.value = ''
  } finally {
    if (token === runToken) running.value = false
  }
}

function onImageLoad(e: Event) {
  const img = e.target as HTMLImageElement
  imageDims.value = `${img.naturalWidth}×${img.naturalHeight}`
}

function applySample() {
  content.value = format.value.sample
}

function downloadImage() {
  if (!imageBase64.value) return
  const a = document.createElement('a')
  a.href = `data:image/png;base64,${imageBase64.value}`
  a.download = generated.value.filename
  a.click()
}
</script>

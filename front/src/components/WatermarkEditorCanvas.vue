<template>
  <div class="flex flex-col gap-2">
    <div v-if="!file" class="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-[12px] text-muted-foreground">
      파일을 업로드하면 여기서 텍스트 위치를 직접 드래그해 배치할 수 있습니다
    </div>

    <template v-else>
      <div v-if="status === 'error'" class="flex h-40 items-center justify-center rounded-md border border-border text-[12px] text-muted-foreground">
        ⚠ 미리보기를 불러오지 못했습니다
      </div>

      <div v-else class="flex flex-col items-center gap-2">
        <div
            ref="stageEl"
            class="relative overflow-hidden rounded-md border border-border bg-white"
            :style="{width: canvasWidth + 'px', height: canvasHeight + 'px'}"
        >
          <canvas ref="canvasEl" class="block" :class="{'opacity-0': status === 'loading'}"/>

          <div
              v-for="el in draggableElements" :key="el.id"
              class="absolute -translate-y-0 cursor-move touch-none select-none whitespace-nowrap rounded-sm px-0.5 leading-none"
              :class="selectedId === el.id ? 'outline outline-1 outline-dashed outline-primary' : 'outline outline-1 outline-dashed outline-transparent hover:outline-primary/40'"
              :style="{
                left: el.xPercent + '%',
                top: el.yPercent + '%',
                color: el.color,
                fontSize: (el.fontSize * renderScale) + 'px',
                fontWeight: CSS_WEIGHT[el.fontWeight],
                fontFamily: '\'Pretendard Variable\', Pretendard, sans-serif',
              }"
              :data-testid="`wm-element-${el.id}`"
              @pointerdown="startDrag(el, $event)"
          >{{ el.text || '(빈 텍스트)' }}
          </div>
        </div>

        <div v-if="pageCount > 1" class="flex items-center gap-3 text-[12px] text-muted-foreground">
          <button
              class="flex size-6 items-center justify-center rounded hover:bg-accent disabled:opacity-30"
              :disabled="currentPage <= 1" type="button" @click="currentPage -= 1"
          ><ChevronLeft class="size-4"/>
          </button>
          <span data-testid="wm-page-indicator">{{ currentPage }} / {{ pageCount }} 페이지</span>
          <button
              class="flex size-6 items-center justify-center rounded hover:bg-accent disabled:opacity-30"
              :disabled="currentPage >= pageCount" type="button" @click="currentPage += 1"
          ><ChevronRight class="size-4"/>
          </button>
        </div>

        <div class="flex w-full items-center justify-between">
          <span class="text-[11px] text-muted-foreground">텍스트 {{ elements.length }}개</span>
          <button
              class="text-[11px] text-primary hover:underline" type="button"
              data-testid="wm-add-text" @click="addElement"
          >+ 텍스트 추가
          </button>
        </div>

        <div v-if="selectedElement" class="flex w-full flex-col gap-2 rounded-md border border-border p-3">
          <div class="flex items-center gap-2">
            <input
                :value="selectedElement.text"
                class="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                data-testid="wm-text-input" type="text"
                @input="patchSelected({text: ($event.target as HTMLInputElement).value})"
            />
            <input
                :value="selectedElement.color"
                class="h-8 w-10 rounded-md border border-input bg-background p-0.5"
                data-testid="wm-color-input" type="color"
                @input="patchSelected({color: ($event.target as HTMLInputElement).value})"
            />
            <input
                :value="selectedElement.fontSize"
                class="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-[13px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                data-testid="wm-fontsize-input" type="number" min="8" max="300"
                @input="patchSelected({fontSize: Number(($event.target as HTMLInputElement).value) || selectedElement!.fontSize})"
            />
            <button
                class="flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive"
                data-testid="wm-remove-element" type="button" @click="removeElement(selectedElement.id)"
            ><X class="size-4"/>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-[11px] text-muted-foreground">굵기</label>
            <select
                :value="selectedElement.fontWeight"
                class="rounded-md border border-input bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                data-testid="wm-weight-select"
                @change="patchSelected({fontWeight: ($event.target as HTMLSelectElement).value as FontWeight})"
            >
              <option v-for="w in FONT_WEIGHTS" :key="w" :value="w">{{ WEIGHT_LABEL[w] }}</option>
            </select>
          </div>
          <label v-if="pageCount > 1" class="flex items-center gap-2 text-[11px] text-muted-foreground">
            <input
                :checked="selectedElement.page !== null" data-testid="wm-page-scope-toggle" type="checkbox"
                @change="patchSelected({page: ($event.target as HTMLInputElement).checked ? currentPage : null})"
            />
            이 텍스트는 {{ currentPage }}페이지에만 적용 (해제 시 모든 페이지)
          </label>
          <label class="flex items-center gap-2 text-[11px] text-muted-foreground">
            <input
                :checked="selectedElement.tiled" data-testid="wm-tiled-toggle" type="checkbox"
                @change="patchSelected({tiled: ($event.target as HTMLInputElement).checked})"
            />
            배경 전체 채우기 (대각선으로 반복 인쇄, 위치 드래그 대신 자동 배치)
          </label>
          <p v-if="selectedElement.tiled" class="text-[11px] text-muted-foreground/70">
            — 미리보기에는 반복 패턴이 표시되지 않습니다. 실제 결과는 생성 후 확인하세요.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
// <script setup>은 런타임 값을 export할 수 없어(타입 export만 허용), 다른 파일이 가져다 쓰는
// FONT_WEIGHTS 상수·WatermarkTextElement 타입은 이 일반 <script> 블록에 둔다.
export const FONT_WEIGHTS = ['REGULAR', 'MEDIUM', 'BOLD', 'BLACK'] as const
export type FontWeight = typeof FONT_WEIGHTS[number]

export interface WatermarkTextElement {
  id: string
  text: string
  xPercent: number
  yPercent: number
  color: string
  fontSize: number
  page: number | null
  fontWeight: FontWeight
  tiled: boolean
}
</script>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {ChevronLeft, ChevronRight, X} from 'lucide-vue-next'

const CSS_WEIGHT: Record<FontWeight, number> = {REGULAR: 400, MEDIUM: 500, BOLD: 700, BLACK: 900}
const WEIGHT_LABEL: Record<FontWeight, string> = {REGULAR: '보통', MEDIUM: '중간', BOLD: '굵게', BLACK: '아주 굵게'}

const props = defineProps<{
  file: File | null
  elements: WatermarkTextElement[]
}>()
const emit = defineEmits<{ 'update:elements': [elements: WatermarkTextElement[]] }>()

const RENDER_MAX_WIDTH = 480
type Status = 'idle' | 'loading' | 'done' | 'error'
const status = ref<Status>('idle')
const canvasEl = ref<HTMLCanvasElement | null>(null)
const stageEl = ref<HTMLDivElement | null>(null)
const canvasWidth = ref(0)
const canvasHeight = ref(0)
const renderScale = ref(1) // fontSize(pt 또는 이미지 픽셀)를 미리보기 px로 바꾸는 배율
const pageCount = ref(1)
const currentPage = ref(1)
const selectedId = ref<string | null>(null)

let nextId = 0

const isPdf = computed(() => props.file?.name.toLowerCase().endsWith('.pdf') ?? false)
const visibleElements = computed(() => props.elements.filter(e => e.page === null || e.page === currentPage.value))
// 배경 전체 채우기(tiled) 요소는 드래그로 잡을 단일 위치가 없으므로 캔버스에 박스를 그리지 않는다.
const draggableElements = computed(() => visibleElements.value.filter(e => !e.tiled))
const selectedElement = computed(() => props.elements.find(e => e.id === selectedId.value) ?? null)

async function renderPdf(file: File) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc =
      (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  const data = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({data}).promise
  pageCount.value = doc.numPages
  if (currentPage.value > doc.numPages) currentPage.value = 1

  const page = await doc.getPage(currentPage.value)
  const base = page.getViewport({scale: 1})
  const scale = Math.min(2, RENDER_MAX_WIDTH / base.width)
  const viewport = page.getViewport({scale})

  const canvas = canvasEl.value
  if (!canvas) throw new Error('canvas not ready')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({canvas, canvasContext: ctx, viewport}).promise

  canvasWidth.value = viewport.width
  canvasHeight.value = viewport.height
  renderScale.value = scale // scale=1일 때 PDF 1pt = 1px이므로, fontSize(pt) * scale = 미리보기 px
}

function loadImageBitmap(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

async function renderImage(file: File) {
  pageCount.value = 1
  currentPage.value = 1
  const img = await loadImageBitmap(file)
  const scale = Math.min(1, RENDER_MAX_WIDTH / img.width)

  const canvas = canvasEl.value
  if (!canvas) throw new Error('canvas not ready')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  canvas.width = img.width * scale
  canvas.height = img.height * scale
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(img.src)

  canvasWidth.value = canvas.width
  canvasHeight.value = canvas.height
  // 이미지 대상은 fontSize가 원본 이미지 픽셀 단위이므로, 축소 비율만큼 미리보기에서도 축소한다.
  renderScale.value = scale
}

async function render() {
  if (!props.file) {
    status.value = 'idle'
    return
  }
  status.value = 'loading'
  try {
    if (isPdf.value) {
      await renderPdf(props.file)
    } else {
      await renderImage(props.file)
    }
    status.value = 'done'
  } catch {
    status.value = 'error'
  }
}

watch(() => props.file, render, {immediate: true})
watch(currentPage, () => { if (isPdf.value) render() })

function addElement() {
  const el: WatermarkTextElement = {
    id: `el-${nextId++}`,
    text: '텍스트',
    xPercent: 40,
    yPercent: 40,
    color: '#000000',
    fontSize: 24,
    page: null,
    fontWeight: 'REGULAR',
    tiled: false,
  }
  emit('update:elements', [...props.elements, el])
  selectedId.value = el.id
}

function removeElement(id: string) {
  emit('update:elements', props.elements.filter(e => e.id !== id))
  if (selectedId.value === id) selectedId.value = null
}

function patchSelected(patch: Partial<WatermarkTextElement>) {
  if (!selectedElement.value) return
  const id = selectedElement.value.id
  emit('update:elements', props.elements.map(e => e.id === id ? {...e, ...patch} : e))
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function startDrag(el: WatermarkTextElement, e: PointerEvent) {
  selectedId.value = el.id
  const target = e.currentTarget as HTMLElement
  const stage = stageEl.value
  if (!stage) return
  // 포인터 캡처는 드래그 중 커서가 요소 밖으로 나가도 추적을 이어가기 위한 보강 장치일 뿐이므로,
  // 실패해도(NotFoundError 등) 드래그 자체는 이어갈 수 있어야 한다 — 실패를 이유로 아래 리스너 등록을
  // 건너뛰면 드래그가 통째로 먹통이 된다.
  try {
    target.setPointerCapture(e.pointerId)
  } catch {
    // capture 없이도 진행
  }
  const stageRect = stage.getBoundingClientRect()

  function onMove(ev: PointerEvent) {
    const x = ev.clientX - stageRect.left
    const y = ev.clientY - stageRect.top
    const xPercent = clamp((x / stageRect.width) * 100, 0, 100)
    const yPercent = clamp((y / stageRect.height) * 100, 0, 100)
    emit('update:elements', props.elements.map(e => e.id === el.id ? {...e, xPercent, yPercent} : e))
  }
  function onUp(ev: PointerEvent) {
    try {
      target.releasePointerCapture(ev.pointerId)
    } catch {
      // capture가 안 잡혔으면 해제할 것도 없다
    }
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
  }
  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
}
</script>

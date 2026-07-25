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

          <img
              v-if="wmImageUrl && imagePosition && wmDisplaySize"
              :src="wmImageUrl"
              alt="워터마크 이미지 미리보기"
              class="absolute cursor-move touch-none select-none rounded-sm outline outline-1 outline-dashed outline-transparent hover:outline-primary/40"
              :style="{
                left: imagePosition.xPercent + '%',
                top: imagePosition.yPercent + '%',
                width: wmDisplaySize.width + 'px',
                height: wmDisplaySize.height + 'px',
              }"
              data-testid="wm-image-element"
              @pointerdown="startImageDrag($event)"
          />
        </div>

        <div v-if="pageCount > 1" class="flex items-center gap-3 text-[12px] text-muted-foreground">
          <button
              aria-label="이전 페이지"
              class="flex size-6 items-center justify-center rounded hover:bg-accent disabled:opacity-30"
              :disabled="currentPage <= 1" type="button" @click="currentPage -= 1"
          ><ChevronLeft class="size-4"/>
          </button>
          <span data-testid="wm-page-indicator">{{ currentPage }} / {{ pageCount }} 페이지</span>
          <button
              aria-label="다음 페이지"
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
                aria-label="텍스트 요소 삭제"
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
          <p v-if="selectedElement.tiled" class="text-[11px] text-muted-foreground">
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

/**
 * 워터마크 이미지의 위치(129) — 텍스트 요소와 같은 좌상단 앵커 퍼센트 좌표계를 쓴다. 워터마크
 * 이미지는 파일 슬롯 제약(113)상 항상 1개뿐이라 배열이 아닌 단일 값으로 관리한다.
 */
export interface WatermarkImagePosition {
  xPercent: number
  yPercent: number
}
</script>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {ChevronLeft, ChevronRight, X} from 'lucide-vue-next'
import {readImageDimensions} from '../utils/imageDimensions'

const CSS_WEIGHT: Record<FontWeight, number> = {REGULAR: 400, MEDIUM: 500, BOLD: 700, BLACK: 900}
const WEIGHT_LABEL: Record<FontWeight, string> = {REGULAR: '보통', MEDIUM: '중간', BOLD: '굵게', BLACK: '아주 굵게'}
// 백엔드 PdfWatermarkModule/VideoWatermarkModule의 MARGIN과 동일한 값 — 위치 파라미터를 아예 안 보낼 때
// 백엔드가 폴백하는 "레거시 우하단"과 시각적으로 같은 지점을 기본값으로 보여주기 위해 맞춰둔다.
const LEGACY_MARGIN = 20

const props = withDefaults(defineProps<{
  file: File | null
  elements: WatermarkTextElement[]
  watermarkImageFile?: File | null
  imagePosition?: WatermarkImagePosition | null
}>(), {
  watermarkImageFile: null,
  imagePosition: null,
})
const emit = defineEmits<{
  'update:elements': [elements: WatermarkTextElement[]]
  'update:imagePosition': [position: WatermarkImagePosition]
}>()

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

// 워터마크 이미지 자체의 미리보기 렌더링 상태 — 텍스트 요소와 달리 파일 하나뿐이라 배열이 아니다.
const wmImageUrl = ref<string | null>(null)
const wmNaturalSize = ref<{width: number, height: number} | null>(null)
const wmDisplaySize = computed(() => wmNaturalSize.value ? {
  width: wmNaturalSize.value.width * renderScale.value,
  height: wmNaturalSize.value.height * renderScale.value,
} : null)

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
  maybeEmitDefaultImagePosition()
}

watch(() => props.file, render, {immediate: true})
watch(currentPage, () => { if (isPdf.value) render() })

/**
 * 워터마크 이미지가 새로 올라오면 실제 픽셀 크기를 읽어와 미리보기 박스 크기 계산에 쓰고, 오브젝트
 * URL을 만들어 <img> 미리보기에 물린다. 대상 파일 미리보기(renderImage)와 달리 캔버스에 픽셀을
 * 합성하지 않는다 — 워터마크는 단순 <img> 오버레이로 충분하고, 드래그 판정도 그 쪽이 더 쉽다.
 */
watch(() => props.watermarkImageFile, async (file, prevFile) => {
  if (wmImageUrl.value) URL.revokeObjectURL(wmImageUrl.value)
  wmImageUrl.value = null
  wmNaturalSize.value = null
  if (!file) return
  if (file !== prevFile) wmImageUrl.value = URL.createObjectURL(file)
  const size = await readImageDimensions(file)
  // await 도중 파일이 또 바뀌었으면(빠른 교체) 이 결과는 이제 최신이 아니므로 버린다.
  if (props.watermarkImageFile !== file) return
  wmNaturalSize.value = size
  maybeEmitDefaultImagePosition()
}, {immediate: true})

/**
 * 워터마크 이미지 위치가 아직 없을 때(사용자가 드래그로 정한 적 없음) 우하단 근처 기본값을 계산해
 * emit한다 — 115가 정했던 "고정 우하단"을 초기값으로만 재현하고, 이후엔 자유롭게 드래그로 바뀐다.
 * 백엔드가 퍼센트 파라미터 없이 호출될 때 쓰는 폴백(WatermarkPlacement.bottomRightX/Y)과 같은
 * 비율식이므로, 프론트가 계산 없이 보내는 값이 백엔드의 레거시 폴백과 시각적으로 일치한다.
 */
function maybeEmitDefaultImagePosition() {
  if (props.imagePosition || !wmDisplaySize.value || !canvasWidth.value || !canvasHeight.value) return
  const marginPx = LEGACY_MARGIN * renderScale.value
  const xPercent = clamp(
      ((canvasWidth.value - wmDisplaySize.value.width - marginPx) / canvasWidth.value) * 100, 0, 100)
  const yPercent = clamp(
      ((canvasHeight.value - wmDisplaySize.value.height - marginPx) / canvasHeight.value) * 100, 0, 100)
  emit('update:imagePosition', {xPercent, yPercent})
}

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

/**
 * 드래그 공통 로직 — stage 기준 포인터 좌표를 0~100% 로 변환해 onPercentChange로 흘려보낸다.
 * 텍스트 요소 드래그(startDrag)와 워터마크 이미지 드래그(startImageDrag)가 이 하나를 공유한다
 * (129 — 이미지 워터마크도 텍스트와 같은 좌표 규약·같은 드래그 UX를 쓰도록 통일).
 */
function startDragCore(e: PointerEvent, onPercentChange: (xPercent: number, yPercent: number) => void) {
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
    onPercentChange(xPercent, yPercent)
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

function startDrag(el: WatermarkTextElement, e: PointerEvent) {
  selectedId.value = el.id
  startDragCore(e, (xPercent, yPercent) => {
    emit('update:elements', props.elements.map(item => item.id === el.id ? {...item, xPercent, yPercent} : item))
  })
}

function startImageDrag(e: PointerEvent) {
  startDragCore(e, (xPercent, yPercent) => {
    emit('update:imagePosition', {xPercent, yPercent})
  })
}
</script>

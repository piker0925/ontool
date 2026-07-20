<template>
  <div
      :class="{ dragging }"
      class="file-uploader"
      @click="fileInput?.click()"
      @dragleave="dragging = false"
      @dragover.prevent="dragging = true"
      @drop.prevent="onDrop"
  >
    <input ref="fileInput" :accept="accept" :multiple="multiple" hidden type="file" @change="onChange"/>
    <slot>
      <div style="font-size:2rem;margin-bottom:.5rem">📂</div>
      <p>파일을 드래그하거나 클릭하여 선택하세요</p>
      <p v-if="multiple" style="font-size:.75rem;margin-top:.25rem;opacity:.7">여러 파일 동시 업로드 가능</p>
    </slot>
  </div>

  <div v-if="staged.length" class="mt-3 flex flex-col gap-2" @click.stop>
    <ul class="flex flex-col gap-1">
      <li
          v-for="(f, i) in staged" :key="f.name + i"
          class="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-[12px] text-foreground"
      >
        <span class="flex-1 truncate font-mono">{{ f.name }}</span>
        <span v-if="pageCounts.get(f)" class="shrink-0 text-[11px] text-muted-foreground">
          {{ pageCounts.get(f) }}페이지
        </span>
        <button
            v-if="reorderable"
            :data-testid="`move-up-${i}`" :disabled="i === 0"
            class="flex size-8 shrink-0 items-center justify-center rounded text-foreground/70 transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground/70"
            title="위로 이동"
            type="button" @click="staged = moveItem(staged, i, -1)"
        ><ChevronUp class="size-4"/>
        </button>
        <button
            v-if="reorderable"
            :data-testid="`move-down-${i}`" :disabled="i === staged.length - 1"
            class="flex size-8 shrink-0 items-center justify-center rounded text-foreground/70 transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground/70"
            title="아래로 이동"
            type="button" @click="staged = moveItem(staged, i, 1)"
        ><ChevronDown class="size-4"/>
        </button>
        <button
            :data-testid="`remove-${i}`"
            class="ml-1 flex size-8 shrink-0 items-center justify-center rounded text-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="제거"
            type="button" @click="staged.splice(i, 1)"
        ><X class="size-4"/>
        </button>
      </li>
    </ul>
    <div v-if="splitPreview" class="flex flex-col gap-1 rounded-md border border-border bg-muted/30 p-2.5">
      <span class="text-[11px] text-muted-foreground">생성될 파일 ({{ splitPreview.length }}개)</span>
      <p class="break-all font-mono text-[11px] text-foreground/80">{{ splitPreview.join(', ') }}</p>
    </div>

    <Button class="h-7 text-[12px]" data-testid="confirm-upload" @click="upload(staged)">
      {{ staged.length >= 2 ? `${staged.length}개 파일 실행` : '실행' }}
    </Button>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {ChevronDown, ChevronUp, X} from 'lucide-vue-next'
import {apiClient} from '../api/client'
import type {UploadResult} from '../types'
import {moveItem} from '../utils/fileOrder'
import {uploadErrorMessage} from '../utils/uploadError'
import {previewSplitFileNames} from '../utils/pdfSplitPreview'
import {readImageDimensions, type PixelSize} from '../utils/imageDimensions'
import {Button} from '@/components/ui/button'

const props = withDefaults(defineProps<{
  moduleId: string
  params?: Record<string, string>
  accept?: string
  multiple?: boolean
  reorderable?: boolean
}>(), {
  multiple: true,
  reorderable: false,
})
const emit = defineEmits<{
  uploaded: [result: UploadResult]
  error: [message: string]
  dimensions: [dims: PixelSize | null]
  staged: [files: File[]]
}>()

const dragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const staged = ref<File[]>([])
const pageCounts = ref(new Map<File, number>())
const imageDims = ref(new Map<File, PixelSize>())

// 파일이 정확히 1장일 때만 "이 파일의 실제 크기"가 의미 있다 — 여러 장이면 어느 걸 기준으로
// 삼을지 애매해서 null로 둔다(소비 측에서 배치용 안내 문구로 대체).
const singleFileDims = computed<PixelSize | null>(() =>
    staged.value.length === 1 ? imageDims.value.get(staged.value[0]) ?? null : null)

watch(singleFileDims, dims => emit('dimensions', dims), {immediate: true})
// 워터마크 편집기처럼 업로드 전 스테이징된 원본 파일이 필요한 소비자를 위한 훅 — deep이어야
// splice/moveItem 같은 제자리 변경도 감지한다.
watch(staged, files => emit('staged', [...files]), {immediate: true, deep: true})

async function loadImageDimensions(file: File) {
  const dims = await readImageDimensions(file)
  if (dims) imageDims.value.set(file, dims)
}

// 총 페이지 수를 알아야 "몇 페이지부터 몇 페이지까지" 같은 범위 입력이 가능하므로
// PDF가 스테이징되는 즉시 pdf.js로 페이지 수를 읽어 표시한다. 실패해도 핵심 기능은
// 아니므로 조용히 무시한다.
async function loadPageCount(file: File) {
  if (!file.name.toLowerCase().endsWith('.pdf')) return
  try {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc =
        (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    const data = await file.arrayBuffer()
    const doc = await pdfjs.getDocument({data}).promise
    pageCounts.value.set(file, doc.numPages)
  } catch {
    // 페이지 수 표시는 보조 정보이므로 실패 시 그냥 표시하지 않는다.
  }
}

// pdf-split 전용: 범위/분할방식 입력 즉시 실제 생성될 파일명을 보여준다(설명 문구 대신 결과 시연).
const splitPreview = computed(() => {
  if (props.moduleId !== 'pdf-split' || staged.value.length !== 1) return null
  const totalPages = pageCounts.value.get(staged.value[0])
  if (!totalPages) return null
  const pageRange = props.params?.pageRange ?? ''
  const groupMode = props.params?.groupMode ?? '낱장'
  return previewSplitFileNames(pageRange, groupMode, totalPages, staged.value[0].name)
})

async function upload(files: File[]) {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  if (props.params) {
    Object.entries(props.params).forEach(([k, v]) => {
      if (v !== '' && v !== undefined) form.append(k, v)
    })
  }
  try {
    const {data} = await apiClient.post<UploadResult>(`/api/v1/tools/${props.moduleId}/upload`, form)
    staged.value = []
    emit('uploaded', data)
  } catch (e) {
    // 실패 시 staged를 비우지 않아 사용자가 그대로 재시도할 수 있게 둔다.
    emit('error', uploadErrorMessage(e))
  }
}

function handleFiles(files: File[]) {
  if (!files.length) return
  // 파일 업로드하는 모든 모듈은 즉시 실행하지 않고 스테이징한다(034). 사용자가 파라미터를
  // 조정하거나 잘못 올린 파일을 취소·교체한 뒤 '실행' 버튼을 눌러야 그 시점 값으로 실행된다.
  const selected = props.multiple ? files : files.slice(0, 1)
  // multiple이면 여러 번 나눠 담을 수 있게 누적, 단일 모듈이면 새 선택으로 교체한다.
  staged.value = props.multiple ? [...staged.value, ...selected] : selected
  selected.forEach(loadPageCount)
  selected.forEach(loadImageDimensions)
}

function onDrop(e: DragEvent) {
  dragging.value = false
  handleFiles(Array.from(e.dataTransfer?.files ?? []))
}

function onChange(e: Event) {
  const input = e.target as HTMLInputElement
  handleFiles(Array.from(input.files ?? []))
  input.value = ''
}
</script>

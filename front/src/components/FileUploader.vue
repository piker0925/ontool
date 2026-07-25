<template>
  <div
      v-if="!secondSlotActive"
      :class="{ dragging }"
      class="file-uploader"
      @click="fileInput?.click()"
      @dragleave="dragging = false"
      @dragover.prevent="dragging = true"
      @drop.prevent="onDrop"
  >
    <input
        ref="fileInput" :accept="accept" :multiple="multiple" data-testid="main-file-input" hidden type="file"
        @change="onChange"
    />
    <slot>
      <div style="font-size:2rem;margin-bottom:.5rem">📂</div>
      <p>파일을 드래그하거나 클릭하여 선택하세요</p>
      <p v-if="multiple" style="font-size:.75rem;margin-top:.25rem;opacity:.7">여러 파일 동시 업로드 가능</p>
    </slot>
  </div>

  <!-- 113 확장: 순서 기반 암묵 규칙 대신, 대상 파일이 담긴 뒤에만 나타나는 명시적인 두 번째 슬롯.
       FileUploader의 소유권 구조(하나의 staged 배열·하나의 POST)는 그대로 두는 veneer다. -->
  <button
      v-if="showSecondSlotButton"
      :class="{'dragging border-ring text-foreground': secondSlotDragging}"
      class="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
      data-testid="add-second-slot"
      type="button"
      @click="secondSlotInput?.click()"
      @dragleave="secondSlotDragging = false"
      @dragover.prevent="secondSlotDragging = true"
      @drop.prevent="onSecondSlotDrop"
  >{{ secondSlotLabel }}
  </button>
  <input
      v-if="secondSlotLabel"
      ref="secondSlotInput" :accept="secondSlotAccept" data-testid="second-slot-file-input" hidden type="file"
      @change="onSecondSlotChange"
  />

  <div v-if="staged.length" class="mt-3 flex flex-col gap-2" @click.stop>
    <ul class="flex flex-col gap-1">
      <li
          v-for="(f, i) in staged" :key="f.name + i"
          class="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-[12px] text-foreground"
      >
        <span
            v-if="secondSlotLabel"
            :data-testid="`staged-role-badge-${i}`"
            class="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >{{ i === 0 ? '대상 파일' : secondSlotItemLabel }}</span>
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
            type="button" @click="removeStaged(i)"
        ><X class="size-4"/>
        </button>
      </li>
    </ul>
    <div v-if="splitPreview" class="flex flex-col gap-1 rounded-md border border-border bg-muted/30 p-2.5">
      <span class="text-[11px] text-muted-foreground">생성될 파일 ({{ splitPreview.length }}개)</span>
      <p class="break-all font-mono text-[11px] text-foreground/80">{{ splitPreview.join(', ') }}</p>
    </div>

    <Button :disabled="uploading" class="h-7 gap-1.5 text-[12px]" data-testid="confirm-upload" @click="upload(staged)">
      <Loader2 v-if="uploading" class="size-3 animate-spin"/>
      {{ runLabel }}
    </Button>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {ChevronDown, ChevronUp, Loader2, X} from 'lucide-vue-next'
import {apiClient} from '../api/client'
import type {UploadResult} from '../types'
import {moveItem} from '../utils/fileOrder'
import {uploadErrorMessage} from '../utils/uploadError'
import {isOversizedFile, oversizedFileMessage} from '../utils/fileSizeLimit'
import {previewSplitFileNames} from '../utils/pdfSplitPreview'
import {readImageDimensions, type PixelSize} from '../utils/imageDimensions'
import {Button} from '@/components/ui/button'

const props = withDefaults(defineProps<{
  moduleId: string
  params?: Record<string, string>
  accept?: string
  multiple?: boolean
  reorderable?: boolean
  /** 서버(/api/v1/modules)가 내려주는 이 모듈의 실제 업로드 한도(106). 0/미지정이면 사전검증을 건너뛴다. */
  maxFileSizeBytes?: number
  /**
   * 누적 스테이징 가능한 총 파일 개수 상한(113). `multiple`과 별개 축이다 — `multiple`은
   * "한 번의 선택/드롭에서 몇 개까지 담을지"를, `maxFiles`는 "여러 번의 선택을 거쳐 최종적으로
   * 몇 개까지 쌓일 수 있는지"를 제어한다. 예: 워터마크 도구는 대상 파일 1개를 여러 개 한 번에
   * 고르지 못하게 `multiple=false`로 막으면서도, 대상 파일 → 워터마크 이미지 순으로 두 번 선택해
   * 총 2개까지는 쌓이게 하려고 `maxFiles=2`를 함께 준다. 미지정이면 기존처럼 무제한 누적(교체는
   * multiple=false일 때의 기존 동작 그대로).
   */
  maxFiles?: number
  /**
   * (113 확장) 지정하면 대상 파일이 1개 스테이징된 뒤 일반 드롭존 대신 이 라벨의 전용 버튼을
   * 보여준다 — 클릭하면 `secondSlotAccept`로 범위를 좁힌 파일 선택기가 뜬다. 순서만으로 "이게
   * 워터마크 이미지다"를 암묵적으로 가정하던 이전 UX를 명시적인 어포던스로 바꾼다. `maxFiles`와
   * 함께 써야 의미가 있다(현재는 2 고정 시나리오만 지원).
   */
  secondSlotLabel?: string
  /** 두 번째 슬롯 전용 accept — 확장자 화이트리스트로도 함께 쓰여, 맞지 않는 파일은 스테이징 자체를 막는다. */
  secondSlotAccept?: string
  /**
   * (130) 스테이징 목록에서 두 번째 이후 항목에 붙일 역할 배지 문구. secondSlotLabel과 함께 줘야
   * 의미가 있다 — 첫 번째 항목은 항상 "대상 파일"로 고정 표시하고, 이 값은 그 나머지(현재는
   * 인덱스 1, 워터마크 이미지)에 쓰인다. 라벨 부재로 두 스테이징 항목을 구분 못해 사용자가
   * 엉뚱한 X를 누르는 오조작을 막기 위한 배지 — secondSlotLabel이 없으면 렌더되지 않는다.
   */
  secondSlotItemLabel?: string
}>(), {
  multiple: true,
  reorderable: false,
  maxFileSizeBytes: 0,
})
const emit = defineEmits<{
  uploaded: [result: UploadResult]
  error: [message: string]
  dimensions: [dims: PixelSize | null]
  staged: [files: File[]]
}>()

const dragging = ref(false)
const secondSlotDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const secondSlotInput = ref<HTMLInputElement | null>(null)
const staged = ref<File[]>([])
const pageCounts = ref(new Map<File, number>())
const imageDims = ref(new Map<File, PixelSize>())
const uploading = ref(false)
const uploadProgress = ref(0)
// 114: 현재 staged 세트로 이미 한 번 실행에 성공했는지 — 재실행 버튼 문구("다시 실행")를
// 결정하는 데만 쓰인다. staged가 실제로 바뀌면(새 파일 추가·제거) 다시 false로 돌아간다.
const alreadyRan = ref(false)

// 파일이 정확히 1장일 때만 "이 파일의 실제 크기"가 의미 있다 — 여러 장이면 어느 걸 기준으로
// 삼을지 애매해서 null로 둔다(소비 측에서 배치용 안내 문구로 대체).
const singleFileDims = computed<PixelSize | null>(() =>
    staged.value.length === 1 ? imageDims.value.get(staged.value[0]) ?? null : null)

// secondSlotLabel이 있고 대상 파일이 이미 스테이징됐으면, 일반 드롭존은 완전히 숨긴다 — 남겨두면
// 두 번째 파일도 일반 accept(예: PDF 포함)로 올릴 수 있는 예전의 애매한 경로가 되살아난다.
const secondSlotActive = computed(() => Boolean(props.secondSlotLabel) && staged.value.length >= 1)
// 한도(maxFiles)에 아직 여유가 있을 때만 "추가" 버튼을 보여준다 — 다 찼으면 버튼도 사라진다.
const showSecondSlotButton = computed(() =>
    secondSlotActive.value && staged.value.length < (props.maxFiles ?? Infinity))

// 114: 결과를 확인한 뒤 파라미터만 바꿔 재실행하고 싶을 때, 결과 화면에 별도 컨트롤을 두는 대신
// (FileResultPanel 참고 — 초기화/재실행 컨트롤은 항상 이 왼쪽 패널에 둔다는 기존 관례) 이 버튼
// 문구 자체로 "지금 누르면 같은 파일이 다시 전송된다"는 걸 알려준다.
const runLabel = computed(() => {
  if (uploading.value) return `업로드 중… ${uploadProgress.value}%`
  const verb = alreadyRan.value ? '다시 실행' : '실행'
  return staged.value.length >= 2 ? `${staged.value.length}개 파일 ${verb}` : verb
})

watch(singleFileDims, dims => emit('dimensions', dims), {immediate: true})
// 워터마크 편집기처럼 업로드 전 스테이징된 원본 파일이 필요한 소비자를 위한 훅 — deep이어야
// splice/moveItem 같은 제자리 변경도 감지한다. 114: staged가 실제로 바뀌는 모든 경로(추가·제거·
// 순서 변경·clear())가 이 한 지점을 지나므로, "다시 실행" 문구 취소도 여기서 함께 처리한다 —
// upload() 성공 시에는 staged를 건드리지 않으므로 이 watch가 alreadyRan을 되돌리지 않는다.
watch(staged, files => {
  emit('staged', [...files])
  alreadyRan.value = false
}, {immediate: true, deep: true})

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
  // 업로드가 오래 걸리는 파일(용량이 크거나 회선이 느림)에서도 클릭이 씹힌 게 아니라
  // 실제로 진행 중임을 보여주기 위해 버튼을 비활성화하고 실제 전송률을 보여준다(정적 스피너 대신).
  uploading.value = true
  uploadProgress.value = 0
  try {
    const {data} = await apiClient.post<UploadResult>(`/api/v1/tools/${props.moduleId}/upload`, form, {
      onUploadProgress: e => {
        if (e.total) uploadProgress.value = Math.round((e.loaded / e.total) * 100)
      },
    })
    // 114: 결과 확인 후 파라미터만 바꿔 재실행할 수 있도록, 성공해도 staged를 비우지 않는다 —
    // 같은 File 객체로 재업로드 없이 다시 POST할 수 있게 유지한다. 새 파일을 고르거나(드롭존·두
    // 번째 슬롯) 개별 제거(제거 버튼)해야만 비워진다. 새로고침·탭 종료로 이 메모리 참조가
    // 사라지는 건 알려진 제약(114 이슈) — 그 경우엔 기존처럼 재업로드해야 한다.
    alreadyRan.value = true
    emit('uploaded', data)
  } catch (e) {
    // 실패 시 staged를 비우지 않아 사용자가 그대로 재시도할 수 있게 둔다.
    emit('error', uploadErrorMessage(e))
  } finally {
    uploading.value = false
  }
}

// 스테이징된 파일의 페이지 수·픽셀 크기 등 부가 메타데이터를 비동기로 채운다 — 어느 경로로
// 담겼든(누적/교체) 새로 추가되는 파일에는 항상 이 처리가 필요하다.
function trackMetadata(files: File[]) {
  files.forEach(loadPageCount)
  files.forEach(loadImageDimensions)
}

function handleFiles(files: File[]) {
  if (!files.length) return
  // 파일 업로드하는 모든 모듈은 즉시 실행하지 않고 스테이징한다(034). 사용자가 파라미터를
  // 조정하거나 잘못 올린 파일을 취소·교체한 뒤 '실행' 버튼을 눌러야 그 시점 값으로 실행된다.
  const selected = props.multiple ? files : files.slice(0, 1)

  // 서버 업로드 한도를 넘는 파일은 스테이징하지 않고 선택 즉시 거른다. 안 그러면 전송이
  // 다 끝날 때까지 기다렸다가 413을 받게 되어, 큰 파일일수록 "입력이 된 건지" 알 수 없는
  // 채로 한참 방치된다.
  const oversized = selected.filter(f => isOversizedFile(f, props.maxFileSizeBytes))
  oversized.forEach(f => emit('error', oversizedFileMessage(f, props.maxFileSizeBytes)))
  const valid = selected.filter(f => !isOversizedFile(f, props.maxFileSizeBytes))
  if (!valid.length) return

  if (props.maxFiles) {
    // maxFiles가 있으면 multiple 값과 무관하게 항상 누적한다(대상 파일 + 워터마크 이미지처럼
    // 서로 다른 선택을 순서대로 합치는 조합용) — 다만 총 개수가 한도를 넘으면 넘는 만큼만 잘라
    // 담고 에러로 알린다. (multiple=true와 함께 쓰이면 한 번의 선택/드롭에 담긴 파일 중 일부만
    // 한도 내로 잘릴 수도 있다 — 아래 room 계산이 그 경우도 함께 처리한다.)
    const room = props.maxFiles - staged.value.length
    if (room <= 0) {
      emit('error', `이 도구는 파일을 최대 ${props.maxFiles}개까지만 담을 수 있습니다.`)
      return
    }
    if (valid.length > room) {
      emit('error', `이 도구는 파일을 최대 ${props.maxFiles}개까지만 담을 수 있습니다. 초과한 파일은 담기지 않았습니다.`)
    }
    const toAdd = valid.slice(0, room)
    staged.value = [...staged.value, ...toAdd]
    trackMetadata(toAdd)
    return
  }

  // multiple이면 여러 번 나눠 담을 수 있게 누적, 단일 모듈이면 새 선택으로 교체한다.
  staged.value = props.multiple ? [...staged.value, ...valid] : valid
  trackMetadata(valid)
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

// secondSlotLabel 모드에서는 인덱스 0(대상 파일)이 항상 "대상"이라는 계약이 있다 — 그걸 그냥
// splice하면 인덱스 1(워터마크 이미지)이 밀려와 대상 자리를 차지해버린다. 그러느니 통째로 비우고
// 처음부터 다시 고르게 하는 편이 안전하다. secondSlotLabel이 없는 일반 모듈은 기존처럼 splice만.
function removeStaged(i: number) {
  if (props.secondSlotLabel && i === 0) {
    staged.value = []
    return
  }
  staged.value.splice(i, 1)
}

// 114: FileUploader가 staged의 유일한 소유자이므로, 부모(예: ToolPage의 좌측 업로드 패널
// 헤더 "초기화" ✕ 버튼 — resetAll)가 결과와 함께 스테이징된 파일까지 완전히 비우고 싶을 때는
// 이 메서드로만 가능하다. 개별 파일만 지우고 싶으면 기존 "제거" 버튼(removeStaged)을 쓴다.
function clear() {
  staged.value = []
  pageCounts.value = new Map()
  imageDims.value = new Map()
}

defineExpose({clear})

function secondSlotExtensions(): string[] {
  return (props.secondSlotAccept ?? '')
      .split(',')
      .map(token => token.trim().replace(/^\./, '').toLowerCase())
      .filter(Boolean)
}

function fileExtension(file: File): string {
  const dot = file.name.lastIndexOf('.')
  return dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : ''
}

// 두 번째 슬롯은 "이미지여야 한다" 같은 도구별 제약이 있을 수 있으므로, accept 속성만으로는
// 부족하다(드래그, accept 무시 등으로 우회 가능) — 확장자 화이트리스트로 한 번 더 막는다.
// (130) 클릭(change)·드래그앤드롭(drop) 두 경로 모두 이 검증을 반드시 거치게 한다 — 이전에는
// 클릭 경로만 있었는데 OS 파일 선택창의 accept 필터가 이미지 아닌 파일을 먼저 걸러버려서 이
// 화이트리스트 자체가 사실상 도달 불가능한 코드였다. 드롭은 OS 필터를 거치지 않으므로 이 경로가
// 생겨야 검증이 실제로 실행될 수 있다.
function stageSecondSlotFile(files: File[]) {
  if (!files.length) return
  const file = files[0]
  const allowed = secondSlotExtensions()
  if (allowed.length && !allowed.includes(fileExtension(file))) {
    emit('error', `이 파일은 ${allowed.join('/')} 형식의 이미지만 업로드할 수 있습니다. (${file.name})`)
    return
  }
  handleFiles([file])
}

function onSecondSlotChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  stageSecondSlotFile(files)
}

function onSecondSlotDrop(e: DragEvent) {
  secondSlotDragging.value = false
  stageSecondSlotFile(Array.from(e.dataTransfer?.files ?? []))
}
</script>

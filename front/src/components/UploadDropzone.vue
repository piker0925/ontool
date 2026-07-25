<!-- 145: 순수 클라이언트(캔버스/WASM) 이미지·문서 도구들이 저마다 따로 그리던 밋밋한 업로드 상자를
     Heavy 워크벤치(FileUploader.vue)의 대시보더+아이콘+드래그 안내 패턴으로 통일하는 공용 컴포넌트.
     FileUploader.vue 자체를 재사용하지 않는 이유: FileUploader는 `/api/v1/tools/{moduleId}/upload`로
     즉시 POST하는 백엔드 Job 큐 전용 컴포넌트라, 서버에 아무것도 보내지 않고 File을 그대로 브라우저에서
     처리하는 이 도구들과는 계약이 다르다(개조하면 FileUploader의 스테이징·재실행 등 무관한 책임까지
     끌려온다 — ADR 없이 큰 리팩터를 피하라는 이슈 지침과도 맞지 않음). 대신 "드래그+클릭으로 File을
     얻는다"는 시각·동작만 이 컴포넌트로 뽑아내 양쪽이 같은 모양을 공유하게 한다. -->
<template>
  <input
      ref="inputRef"
      :accept="accept"
      :multiple="multiple"
      class="hidden"
      data-testid="upload-dropzone-input"
      type="file"
      @change="onChange"
  />
  <button
      v-if="active"
      :aria-label="label"
      :class="[zoneHoverClass, {[zoneDraggingClass]: dragging}, sizeClass]"
      class="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-card text-center transition-colors"
      data-testid="upload-dropzone"
      type="button"
      @click="open"
      @dragleave="dragging = false"
      @dragover.prevent="dragging = true"
      @drop.prevent="onDrop"
  >
    <component :is="iconComponent" class="size-6 text-muted-foreground/60"/>
    <p class="text-[13px] text-muted-foreground">{{ label }}</p>
    <p class="text-[11px] text-muted-foreground/60">{{ hint }}</p>
  </button>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {FolderOpen} from 'lucide-vue-next'
import type {Component} from 'vue'

type Zone = 'dev' | 'files' | 'life' | 'fun'

const props = withDefaults(defineProps<{
  label: string
  /** Heavy 워크벤치(FileUploader.vue)의 "파일을 드래그하거나 클릭하여 선택하세요"와 동일한 안내 문구를 기본값으로 둔다 */
  hint?: string
  accept?: string
  multiple?: boolean
  icon?: Component
  /** DESIGN.md 39행: tools/ 컴포넌트의 강조 요소는 전역 primary가 아니라 구역별 zone-accent를 써야 한다 */
  zone?: Zone
  /** false면 안내 박스 UI는 숨기지만 내부 input은 계속 마운트해 둔다 — "다른 파일" 버튼이
      open()으로 다시 열 수 있어야 하기 때문에, 상자를 통째로 v-if로 걷어내면 안 된다. */
  active?: boolean
  /** ImageDiffTool처럼 두 개를 나란히 두는 좁은 레이아웃용 압축 높이 */
  size?: 'default' | 'compact'
}>(), {
  hint: '파일을 드래그하거나 클릭하여 선택하세요',
  multiple: false,
  zone: 'files',
  active: true,
  size: 'default',
})

const emit = defineEmits<{
  select: [files: File[]]
}>()

// 145: 이슈 원문·Heavy 워크벤치(FileUploader.vue)가 공통으로 "폴더 아이콘"(📂)을 기준으로 삼으므로
// 기본 아이콘도 업로드 화살표가 아니라 폴더 계열로 맞춘다. 도구별로 다른 아이콘이 더 맞으면 icon prop으로 덮어쓴다.
const iconComponent = computed(() => props.icon ?? FolderOpen)

const inputRef = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

const sizeClass = computed(() => props.size === 'compact' ? 'w-full px-3 py-6' : 'h-40 w-full')

const ZONE_HOVER_CLASSES: Record<Zone, string> = {
  dev: 'hover:border-zone-accent-dev/50 hover:text-zone-accent-dev',
  files: 'hover:border-zone-accent-files/50 hover:text-zone-accent-files',
  life: 'hover:border-zone-accent-life/50 hover:text-zone-accent-life',
  fun: 'hover:border-zone-accent-fun/50 hover:text-zone-accent-fun',
}
const ZONE_DRAGGING_CLASSES: Record<Zone, string> = {
  dev: 'border-zone-accent-dev/50 text-zone-accent-dev',
  files: 'border-zone-accent-files/50 text-zone-accent-files',
  life: 'border-zone-accent-life/50 text-zone-accent-life',
  fun: 'border-zone-accent-fun/50 text-zone-accent-fun',
}

const zoneHoverClass = computed(() => ZONE_HOVER_CLASSES[props.zone])
const zoneDraggingClass = computed(() => ZONE_DRAGGING_CLASSES[props.zone])

function open() {
  inputRef.value?.click()
}

function onChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (files.length) emit('select', files)
}

function onDrop(e: DragEvent) {
  dragging.value = false
  const files = Array.from(e.dataTransfer?.files ?? [])
  if (files.length) emit('select', files)
}

defineExpose({open})
</script>

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
        <button
            v-if="reorderable"
            :data-testid="`move-up-${i}`" :disabled="i === 0"
            class="rounded p-1 text-foreground/70 transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground/70"
            title="위로 이동"
            type="button" @click="staged = moveItem(staged, i, -1)"
        ><ChevronUp class="size-3.5"/>
        </button>
        <button
            v-if="reorderable"
            :data-testid="`move-down-${i}`" :disabled="i === staged.length - 1"
            class="rounded p-1 text-foreground/70 transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground/70"
            title="아래로 이동"
            type="button" @click="staged = moveItem(staged, i, 1)"
        ><ChevronDown class="size-3.5"/>
        </button>
        <button
            :data-testid="`remove-${i}`"
            class="rounded p-1 text-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="제거"
            type="button" @click="staged.splice(i, 1)"
        ><X class="size-3.5"/>
        </button>
      </li>
    </ul>
    <Button class="h-7 text-[12px]" data-testid="confirm-upload" @click="upload(staged)">
      {{ staged.length >= 2 ? `${staged.length}개 파일 실행` : '실행' }}
    </Button>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {ChevronDown, ChevronUp, X} from 'lucide-vue-next'
import {apiClient} from '../api/client'
import type {UploadResult} from '../types'
import {moveItem} from '../utils/fileOrder'
import {uploadErrorMessage} from '../utils/uploadError'
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
}>()

const dragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const staged = ref<File[]>([])

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

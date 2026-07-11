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

  <div v-if="reorderable && staged.length" class="mt-3 flex flex-col gap-2" @click.stop>
    <ul class="flex flex-col gap-1">
      <li
          v-for="(f, i) in staged" :key="f.name + i"
          class="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-700"
      >
        <span class="flex-1 truncate">{{ f.name }}</span>
        <button
            :data-testid="`move-up-${i}`" :disabled="i === 0"
            class="rounded p-0.5 text-slate-400 transition-colors hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
            type="button" @click="staged = moveItem(staged, i, -1)"
        >↑
        </button>
        <button
            :data-testid="`move-down-${i}`" :disabled="i === staged.length - 1"
            class="rounded p-0.5 text-slate-400 transition-colors hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
            type="button" @click="staged = moveItem(staged, i, 1)"
        >↓
        </button>
        <button
            :data-testid="`remove-${i}`"
            class="rounded p-0.5 text-slate-400 transition-colors hover:text-red-500"
            type="button" @click="staged.splice(i, 1)"
        >✕
        </button>
      </li>
    </ul>
    <Button class="h-7 text-[12px]" data-testid="confirm-upload" @click="upload(staged)">
      {{ staged.length }}개 파일 병합 업로드
    </Button>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {apiClient} from '../api/client'
import type {UploadResult} from '../types'
import {moveItem} from '../utils/fileOrder'
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
  const {data} = await apiClient.post<UploadResult>(`/api/v1/tools/${props.moduleId}/upload`, form)
  staged.value = []
  emit('uploaded', data)
}

function handleFiles(files: File[]) {
  if (!files.length) return
  const selected = props.multiple ? files : files.slice(0, 1)
  if (props.reorderable) {
    staged.value = [...staged.value, ...selected]
  } else {
    upload(selected)
  }
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

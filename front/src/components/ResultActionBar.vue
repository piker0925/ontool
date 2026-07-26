<template>
  <div class="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 p-1 backdrop-blur-sm shadow-xs">
    <!-- 복사 버튼 -->
    <button
      type="button"
      title="클립보드로 복사"
      aria-label="클립보드로 복사"
      class="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
      @click="handleCopy"
    >
      <Check v-if="copied" class="size-3.5 text-emerald-500" aria-hidden="true" />
      <Copy v-else class="size-3.5" aria-hidden="true" />
      <span>{{ copied ? '복사됨' : '복사' }}</span>
    </button>

    <!-- 다운로드 버튼 (filename이 있을 때) -->
    <button
      v-if="filename"
      type="button"
      title="파일로 다운로드"
      aria-label="파일로 다운로드"
      class="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
      @click="handleDownload"
    >
      <Download class="size-3.5" aria-hidden="true" />
      <span>다운로드</span>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { Check, Copy, Download } from 'lucide-vue-next'

const props = defineProps<{
  text: string
  filename?: string
}>()

const copied = ref(false)

async function handleCopy() {
  if (!props.text) return
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy text:', err)
  }
}

function handleDownload() {
  if (!props.text || !props.filename) return
  const blob = new Blob([props.text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = props.filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

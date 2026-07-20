<template>
  <div class="flex flex-col gap-3 max-w-lg mx-auto w-full">
    <div class="flex gap-2">
      <button class="flex-1 rounded-xl border border-dashed border-border bg-card px-3 py-6 text-[12px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
              @click="inputA?.click()">{{ fileNameA || '이미지 A 선택' }}
      </button>
      <button class="flex-1 rounded-xl border border-dashed border-border bg-card px-3 py-6 text-[12px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
              @click="inputB?.click()">{{ fileNameB || '이미지 B 선택' }}
      </button>
    </div>
    <input ref="inputA" accept="image/*" class="hidden" type="file" @change="onFileChangeA"/>
    <input ref="inputB" accept="image/*" class="hidden" type="file" @change="onFileChangeB"/>

    <div v-show="diffRatio !== null" class="rounded-xl border border-border bg-card p-4">
      <p class="text-[13px] text-foreground">차이 픽셀 비율: <span class="font-mono font-semibold">{{ ((diffRatio ?? 0) * 100).toFixed(2) }}%</span></p>
    </div>

    <div v-show="diffRatio !== null" class="overflow-hidden rounded-xl border border-border bg-card">
      <canvas ref="canvasEl" class="block w-full"/>
    </div>

    <p v-if="error" class="text-[11px] text-destructive/70">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {diffImages} from '../../utils/imageDiff'
import {useImageFileInput} from '../../composables/useImageFileInput'

const {fileInput: inputA, imageEl: imageA, fileName: fileNameA, error: errorA, onFileChange: onFileChangeA} = useImageFileInput()
const {fileInput: inputB, imageEl: imageB, fileName: fileNameB, error: errorB, onFileChange: onFileChangeB} = useImageFileInput()
const canvasEl = ref<HTMLCanvasElement | null>(null)
const diffRatio = ref<number | null>(null)
const sizeMismatchError = ref('')
const error = computed(() => errorA.value || errorB.value || sizeMismatchError.value)

watch([imageA, imageB], () => {
  const a = imageA.value
  const b = imageB.value
  const canvas = canvasEl.value
  if (!a || !b || !canvas) return

  if (a.naturalWidth !== b.naturalWidth || a.naturalHeight !== b.naturalHeight) {
    sizeMismatchError.value = '두 이미지의 크기가 같아야 비교할 수 있습니다'
    diffRatio.value = null
    return
  }
  sizeMismatchError.value = ''

  canvas.width = a.naturalWidth
  canvas.height = a.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.drawImage(a, 0, 0)
  const dataA = ctx.getImageData(0, 0, canvas.width, canvas.height)
  ctx.drawImage(b, 0, 0)
  const dataB = ctx.getImageData(0, 0, canvas.width, canvas.height)

  const result = diffImages(
      {width: canvas.width, height: canvas.height, data: dataA.data},
      {width: canvas.width, height: canvas.height, data: dataB.data},
  )

  diffRatio.value = result.diffRatio
  ctx.putImageData(new ImageData(result.diffData, canvas.width, canvas.height), 0, 0)
})
</script>

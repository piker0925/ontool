<template>
  <div class="flex flex-col gap-3 max-w-lg mx-auto w-full">
    <input ref="fileInput" accept="image/*" class="hidden" type="file" @change="onFileChange"/>

    <button v-if="!imageEl"
            class="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-card text-[13px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            @click="fileInput?.click()">이미지를 선택하세요
    </button>

    <div v-show="!!imageEl" class="flex flex-wrap gap-1.5">
      <button v-for="preset in SOCIAL_CROP_PRESETS" :key="preset.id"
              :class="selectedPreset.id === preset.id ? 'bg-card text-foreground shadow-sm border-ring' : 'text-muted-foreground hover:text-foreground border-border'"
              class="rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors"
              @click="selectedPreset = preset">{{ preset.label }}
      </button>
    </div>

    <div v-show="!!imageEl" class="overflow-hidden rounded-xl border border-border bg-card">
      <canvas ref="canvasEl" class="block w-full"/>
    </div>

    <div v-show="!!imageEl" class="flex gap-2">
      <button class="flex-1 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition-colors hover:opacity-90"
              @click="downloadCropped">크롭 이미지 다운로드
      </button>
      <button class="rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] text-foreground transition-colors hover:border-ring"
              @click="fileInput?.click()">다른 이미지
      </button>
    </div>

    <p v-if="error" class="text-[11px] text-destructive/70">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import {ref, watch} from 'vue'
import {computeCenteredCropRect, SOCIAL_CROP_PRESETS, type SocialCropPreset} from '../../utils/imageCrop'
import {useImageFileInput} from '../../composables/useImageFileInput'

const {fileInput, imageEl, error, onFileChange} = useImageFileInput()
const canvasEl = ref<HTMLCanvasElement | null>(null)
const selectedPreset = ref<SocialCropPreset>(SOCIAL_CROP_PRESETS[0])

function render() {
  const img = imageEl.value
  const canvas = canvasEl.value
  if (!img || !canvas) return

  const rect = computeCenteredCropRect({width: img.naturalWidth, height: img.naturalHeight}, selectedPreset.value.aspect)
  canvas.width = rect.width
  canvas.height = rect.height

  const ctx = canvas.getContext('2d')
  ctx?.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height)
}

watch([imageEl, selectedPreset], render)

function downloadCropped() {
  const canvas = canvasEl.value
  if (!canvas) return

  canvas.toBlob(blob => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${selectedPreset.value.id}.png`
    a.click()
    URL.revokeObjectURL(a.href)
  }, 'image/png')
}
</script>

<template>
  <div class="flex flex-col gap-3 max-w-lg mx-auto w-full">
    <input ref="fileInput" accept="image/*" class="hidden" type="file" @change="onFileChange"/>

    <button v-if="!imageEl"
            class="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-card text-[13px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            @click="fileInput?.click()">이미지를 선택하세요
    </button>

    <div v-show="!!imageEl" class="flex gap-0.5 rounded-lg bg-muted p-0.5">
      <button v-for="opt in TYPES" :key="opt.v"
              :class="type === opt.v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              class="flex-1 rounded-md px-3 py-1 text-[12px] font-medium transition-colors"
              @click="type = opt.v">{{ opt.l }}
      </button>
    </div>

    <div v-show="!!imageEl" class="overflow-hidden rounded-xl border border-border bg-card">
      <canvas ref="canvasEl" class="block w-full"/>
    </div>

    <p v-if="error" class="text-[11px] text-destructive/70">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import {ref, watch} from 'vue'
import {applyColorblindFilter, type ColorblindType} from '../../utils/colorblindSim'
import {useImageFileInput} from '../../composables/useImageFileInput'

const TYPES: { v: ColorblindType; l: string }[] = [
  {v: 'protanopia', l: '적색맹'},
  {v: 'deuteranopia', l: '녹색맹'},
  {v: 'tritanopia', l: '청색맹'},
]

const {fileInput, imageEl, error, onFileChange} = useImageFileInput()
const canvasEl = ref<HTMLCanvasElement | null>(null)
const type = ref<ColorblindType>('protanopia')

function render() {
  const img = imageEl.value
  const canvas = canvasEl.value
  if (!img || !canvas) return

  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.drawImage(img, 0, 0)
  const source = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const result = applyColorblindFilter({width: canvas.width, height: canvas.height, data: source.data}, type.value)
  ctx.putImageData(new ImageData(result.data, canvas.width, canvas.height), 0, 0)
}

watch([imageEl, type], render)
</script>

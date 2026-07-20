<template>
  <div class="flex flex-col gap-3 max-w-lg mx-auto w-full">
    <input ref="fileInput" accept="image/*" class="hidden" type="file" @change="onFileChange"/>

    <button v-if="!imageEl"
            class="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-card text-[13px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            @click="fileInput?.click()">이미지를 선택하세요
    </button>

    <template v-else>
      <div class="flex items-center gap-3">
        <label class="text-[11px] font-medium text-muted-foreground shrink-0">가로 해상도</label>
        <input v-model.number="columns" class="flex-1" max="200" min="20" step="10" type="range"/>
        <span class="w-10 text-right font-mono text-[12px] text-foreground">{{ columns }}</span>
      </div>

      <div class="flex gap-0.5 rounded-lg bg-muted p-0.5">
        <button v-for="preset in ASCII_CHARSET_PRESETS" :key="preset.id"
                :class="selectedCharset.id === preset.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                class="flex-1 rounded-md px-3 py-1 text-[12px] font-medium transition-colors"
                @click="selectedCharset = preset">{{ preset.label }}
        </button>
      </div>

      <pre v-if="ascii" class="overflow-x-auto rounded-xl border border-border bg-card p-3 font-mono text-[6px] leading-[6px] text-foreground whitespace-pre">{{ ascii }}</pre>

      <div class="flex gap-2">
        <button class="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] text-foreground transition-colors hover:border-ring"
                @click="copyAscii">텍스트 복사
        </button>
        <button class="rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] text-foreground transition-colors hover:border-ring"
                @click="fileInput?.click()">다른 이미지
        </button>
      </div>
    </template>

    <p v-if="error" class="text-[11px] text-destructive/70">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import {ref, watch} from 'vue'
import {ASCII_CHARSET_PRESETS, type AsciiCharsetPreset, imageToAscii} from '../../utils/imageToAscii'
import {useImageFileInput} from '../../composables/useImageFileInput'

const {fileInput, imageEl, error, onFileChange} = useImageFileInput()
const columns = ref(80)
const selectedCharset = ref<AsciiCharsetPreset>(ASCII_CHARSET_PRESETS[0])
const ascii = ref('')

function render() {
  const img = imageEl.value
  if (!img) return

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.drawImage(img, 0, 0)
  const source = ctx.getImageData(0, 0, canvas.width, canvas.height)
  ascii.value = imageToAscii({width: canvas.width, height: canvas.height, data: source.data}, columns.value, selectedCharset.value.charset)
}

watch([imageEl, columns, selectedCharset], render)

async function copyAscii() {
  await navigator.clipboard.writeText(ascii.value)
}
</script>

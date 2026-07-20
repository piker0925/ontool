<template>
  <div class="flex flex-col gap-3 max-w-lg mx-auto w-full">
    <input ref="fileInput" accept="image/*" class="hidden" type="file" @change="onFileChange"/>

    <button v-if="!imageEl"
            class="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-card text-[13px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            @click="fileInput?.click()">이미지를 선택하세요
    </button>

    <template v-else>
      <div class="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <img v-for="s in SIZES" :key="s" :height="Math.min(s, 48)" :src="imageEl?.src" :width="Math.min(s, 48)" alt="" class="rounded border border-border"/>
      </div>

      <button :disabled="generating" class="rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
              @click="generateAndDownload">{{ generating ? '생성 중...' : 'favicon.ico + ZIP 다운로드' }}
      </button>
    </template>

    <p v-if="error" class="text-[11px] text-destructive/70">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import JSZip from 'jszip'
import {encodeIco, type FaviconImage} from '../../utils/faviconGen'
import {useImageFileInput} from '../../composables/useImageFileInput'

const SIZES = [16, 32, 48, 180]

const {fileInput, imageEl, error, onFileChange} = useImageFileInput()
const generating = ref(false)

function renderPng(img: HTMLImageElement, size: number): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx?.drawImage(img, 0, 0, size, size)

  return new Promise((resolve, reject) => {
    canvas.toBlob(async blob => {
      if (!blob) {
        reject(new Error('PNG 생성 실패'))
        return
      }
      resolve(new Uint8Array(await blob.arrayBuffer()))
    }, 'image/png')
  })
}

async function generateAndDownload() {
  const img = imageEl.value
  if (!img) return

  generating.value = true
  error.value = ''
  try {
    const images: FaviconImage[] = await Promise.all(
        SIZES.map(async size => ({size, pngData: await renderPng(img, size)})),
    )

    const ico = encodeIco(images)

    const zip = new JSZip()
    zip.file('favicon.ico', ico)
    images.forEach(image => zip.file(`favicon-${image.size}x${image.size}.png`, image.pngData))

    const zipBlob = await zip.generateAsync({type: 'blob'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(zipBlob)
    a.download = 'favicon.zip'
    a.click()
    URL.revokeObjectURL(a.href)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Favicon 생성 실패'
  } finally {
    generating.value = false
  }
}
</script>

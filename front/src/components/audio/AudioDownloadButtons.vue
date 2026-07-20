<template>
  <div class="flex items-center gap-2">
    <Button data-testid="download-wav" size="sm" variant="outline" @click="download('wav')">
      WAV 다운로드
    </Button>
    <Button data-testid="download-mp3" size="sm" variant="outline" @click="download('mp3')">
      MP3 다운로드
    </Button>
  </div>
</template>

<script lang="ts" setup>
import {Button} from '@/components/ui/button'
import type {PcmAudio} from '../../utils/audioTypes'
import {encodeMp3, encodeWav} from '../../utils/audioEncode'

const props = defineProps<{
  pcm: PcmAudio
  fileNameBase: string
}>()

function download(format: 'wav' | 'mp3') {
  const bytes = format === 'wav' ? encodeWav(props.pcm) : encodeMp3(props.pcm)
  const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mpeg'
  // encodeWav/encodeMp3는 항상 오프셋 0의 전용 ArrayBuffer를 새로 할당해 반환하므로
  // .buffer를 그대로 BlobPart로 써도 안전하다(최신 TS lib의 TypedArray<ArrayBufferLike>
  // 제네릭이 Blob 생성자가 요구하는 ArrayBufferView<ArrayBuffer>와 구조적으로 어긋나는 것을 우회).
  const blob = new Blob([bytes.buffer as ArrayBuffer], {type: mimeType})
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${props.fileNameBase}.${format}`
  anchor.click()

  URL.revokeObjectURL(url)
}
</script>

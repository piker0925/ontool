<template>
  <div
      :class="{ dragging }"
      class="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-8 text-center transition-colors hover:border-zone-accent-files/50 hover:bg-zone-accent-files/5 aria-[dragging=true]:border-zone-accent-files aria-[dragging=true]:bg-zone-accent-files/10"
      :aria-dragging="dragging"
      @click="fileInput?.click()"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
  >
    <input ref="fileInput" accept="audio/*" hidden type="file" @change="onChange"/>
    <slot>
      <div class="text-2xl">🎵</div>
      <p class="text-[13px] text-foreground">오디오 파일을 드래그하거나 클릭하여 선택하세요</p>
      <p class="text-[11px] text-muted-foreground">WAV, MP3 등 브라우저가 지원하는 형식</p>
    </slot>
  </div>

  <p v-if="loading" class="mt-2 text-[12px] text-muted-foreground">디코딩 중…</p>
  <p v-if="errorMessage" class="mt-2 text-[12px] text-destructive">{{ errorMessage }}</p>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {audioBufferLikeToPcm} from '../../utils/audioDecode'
import {sniffWavSampleRate} from '../../utils/wavSampleRateSniff'
import type {PcmAudio} from '../../utils/audioTypes'

const emit = defineEmits<{
  loaded: [payload: {pcm: PcmAudio, file: File}]
  error: [message: string]
}>()

const dragging = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

async function decodeFile(file: File) {
  loading.value = true
  errorMessage.value = ''
  try {
    const arrayBuffer = await file.arrayBuffer()
    const AudioContextCtor = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext
    if (!AudioContextCtor) throw new Error('이 브라우저는 오디오 처리를 지원하지 않습니다')
    const ctx = createAudioContext(AudioContextCtor, arrayBuffer)
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      const pcm = audioBufferLikeToPcm(audioBuffer)
      emit('loaded', {pcm, file})
    } finally {
      await ctx.close?.()
    }
  } catch {
    const message = '오디오 파일을 디코딩할 수 없습니다. 지원하는 형식(WAV, MP3 등)인지 확인해주세요.'
    errorMessage.value = message
    emit('error', message)
  } finally {
    loading.value = false
  }
}

/**
 * WAV 파일이면 헤더에서 원본 샘플레이트를 읽어 AudioContext를 그 값으로 만든다 — 그러면
 * decodeAudioData가 하드웨어 기본 샘플레이트로 강제 리샘플링하지 않는다(이슈 110, wavSampleRateSniff
 * 참조). mp3 등 비-WAV 입력이거나, 브라우저가 그 샘플레이트를 지원하지 않아 생성자가 던지면
 * (스펙상 UA가 지원 안 하는 값이면 NotSupportedError) 기본 AudioContext로 폴백한다 — 이 경우
 * 여전히 하드웨어 기본 샘플레이트로 리샘플링되지만, 이전과 동일한 동작이라 회귀가 아니다.
 */
function createAudioContext(ctor: typeof AudioContext, arrayBuffer: ArrayBuffer): AudioContext {
  const nativeSampleRate = sniffWavSampleRate(arrayBuffer)
  if (nativeSampleRate != null) {
    try {
      return new ctor({sampleRate: nativeSampleRate})
    } catch {
      // 폴백 — 아래 기본 생성자로 진행
    }
  }
  return new ctor()
}

function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) decodeFile(file)
}

function onChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) decodeFile(file)
  input.value = ''
}
</script>

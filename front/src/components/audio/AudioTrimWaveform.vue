<template>
  <div class="flex flex-col gap-3">
    <div ref="waveformContainer" class="min-h-16 w-full rounded-md bg-muted/30"></div>

    <div class="flex flex-wrap items-center gap-3">
      <label class="flex flex-col gap-1 text-[12px] text-muted-foreground">
        시작(초)
        <input
            v-model.number="startSeconds" data-testid="trim-start-input"
            :max="durationSeconds(pcm)" class="w-24 rounded-md border border-input bg-background px-2 py-1 font-mono text-[13px]"
            min="0" step="0.1" type="number"
            @change="onManualChange"
        />
      </label>
      <label class="flex flex-col gap-1 text-[12px] text-muted-foreground">
        끝(초)
        <input
            v-model.number="endSeconds" data-testid="trim-end-input"
            :max="durationSeconds(pcm)" class="w-24 rounded-md border border-input bg-background px-2 py-1 font-mono text-[13px]"
            min="0" step="0.1" type="number"
            @change="onManualChange"
        />
      </label>
      <span class="font-mono text-[12px] text-muted-foreground">선택 구간: {{ (endSeconds - startSeconds).toFixed(1) }}초</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {onBeforeUnmount, onMounted, ref} from 'vue'
import type {PcmAudio} from '../../utils/audioTypes'
import {durationSeconds} from '../../utils/audioTypes'
import {encodeWav} from '../../utils/audioEncode'

const props = defineProps<{
  pcm: PcmAudio
}>()

const emit = defineEmits<{
  change: [selection: {start: number, end: number}]
}>()

const waveformContainer = ref<HTMLDivElement | null>(null)
const startSeconds = ref(0)
const endSeconds = ref(durationSeconds(props.pcm))

// wavesurfer.js는 실제 DOM/오디오 디코딩이 필요한 브라우저 전용 라이브러리라 vitest(jsdom)에서
// 의미 있게 단위 테스트할 수 없다 — 초기화는 onMounted에서 시도하고 실패해도(예: jsdom) 숫자
// 입력 기반 트리밍 흐름은 계속 동작하도록 방어적으로 처리한다. 실제 드래그 선택 UX는
// 브라우저 검증 단계에서 확인한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wavesurfer: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let region: any = null

function emitChange() {
  emit('change', {start: startSeconds.value, end: endSeconds.value})
}

function onManualChange() {
  startSeconds.value = Math.max(0, Math.min(startSeconds.value, durationSeconds(props.pcm)))
  endSeconds.value = Math.max(startSeconds.value, Math.min(endSeconds.value, durationSeconds(props.pcm)))
  if (region) {
    region.setOptions({start: startSeconds.value, end: endSeconds.value})
  }
  emitChange()
}

async function initWavesurfer() {
  if (!waveformContainer.value) return
  try {
    const [{default: WaveSurfer}, {default: RegionsPlugin}] = await Promise.all([
      import('wavesurfer.js'),
      import('wavesurfer.js/dist/plugins/regions.js'),
    ])

    // DESIGN.md: 캔버스류 라이브러리는 Tailwind 클래스를 못 받으므로, zone-accent-files
    // CSS 커스텀 프로퍼티(AudioWaveformPlayer.vue와 동일한 패턴)를 읽어와 원시 색상
    // 리터럴 없이 파형·선택 영역 색을 통일한다.
    const zoneAccentFiles = getComputedStyle(document.documentElement).getPropertyValue('--zone-accent-files').trim() || undefined

    const regions = RegionsPlugin.create()
    wavesurfer = WaveSurfer.create({
      container: waveformContainer.value,
      height: 64,
      waveColor: zoneAccentFiles,
      progressColor: zoneAccentFiles,
      plugins: [regions],
    })

    const wavBytes = encodeWav(props.pcm)
    const blob = new Blob([wavBytes.buffer as ArrayBuffer], {type: 'audio/wav'})
    await wavesurfer.loadBlob(blob)

    region = regions.addRegion({
      start: startSeconds.value,
      end: endSeconds.value,
      color: zoneAccentFiles ? `color-mix(in oklch, ${zoneAccentFiles} 20%, transparent)` : undefined,
      drag: true,
      resize: true,
    })

    regions.on('region-updated', (updatedRegion: {start: number, end: number}) => {
      startSeconds.value = updatedRegion.start
      endSeconds.value = updatedRegion.end
      emitChange()
    })
  } catch {
    // jsdom 등 wavesurfer.js가 동작할 수 없는 환경 — 숫자 입력 기반 흐름은 정상 동작한다.
  }
}

// props.pcm이 바뀔 때 재초기화하는 watch를 두지 않는다 — 이 컴포넌트는 사용처(AudioTrimTool.vue
// 등)의 v-if="!original"에 의해 파일을 새로 업로드할 때마다 항상 파괴 후 새로 마운트되므로(마운트된
// 인스턴스에서 pcm prop이 바뀌는 경우가 실제로 없음), 그런 watch는 죽은 코드이자 미검증
// 코드 경로가 된다(075 리뷰에서 발견).
onMounted(() => {
  emitChange()
  initWavesurfer()
})
onBeforeUnmount(() => {
  wavesurfer?.destroy?.()
})
</script>

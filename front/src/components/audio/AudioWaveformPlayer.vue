<template>
  <div class="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
    <div v-if="label" class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{{ label }}</div>

    <canvas
        ref="canvasEl" class="h-16 w-full cursor-pointer rounded-md bg-muted/30" height="64"
        data-testid="waveform-canvas"
        @click="onCanvasClick"
    ></canvas>

    <div class="flex flex-wrap items-center gap-3">
      <Button data-testid="play-pause-button" size="sm" variant="outline" @click="togglePlay">
        {{ isPlaying ? '일시정지' : '재생' }}
      </Button>
      <span class="font-mono text-[11px] text-muted-foreground">{{ formattedDuration }}</span>
    </div>
    <p class="text-[11px] text-muted-foreground">파형을 클릭하면 그 위치부터 재생됩니다.</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {Button} from '@/components/ui/button'
import type {PcmAudio} from '../../utils/audioTypes'
import {computeWaveformPeaks} from '../../utils/audioWaveformPeaks'
import {durationSeconds} from '../../utils/audioTypes'
import {pixelToSeconds, secondsToPixel} from '../../utils/audioWaveformSelection'

const props = defineProps<{
  pcm: PcmAudio
  label?: string
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const isPlaying = ref(false)

// 파형 막대가 캔버스 상하 끝에 완전히 닿으면(peak≈1.0) 둥근 모서리(rounded-md)와 겹쳐 잘려
// 보인다 — 위아래에 여백을 남기도록 실제 진폭을 캔버스 높이의 이 비율까지만 쓴다. 0.86은
// 정규화된(피크가 0dBFS에 가까운) 신호로 브라우저에서 직접 스크린샷을 보며 조정한 값이다.
const WAVEFORM_VERTICAL_SCALE = 0.86

let audioContext: AudioContext | null = null
let sourceNode: AudioBufferSourceNode | null = null
// 재생 위치 추적용: 소스를 시작시킨 시점의 AudioContext.currentTime과 그때 넘긴 재생
// 오프셋(초). Web Audio는 현재 재생 위치를 직접 주지 않으므로, 이 두 값과
// "지금의 currentTime"의 차이로 매 프레임 위치를 계산한다(currentPlaybackSeconds).
let playbackStartContextTime = 0
let playbackStartOffsetSeconds = 0
let playheadRafId: number | null = null

// computeWaveformPeaks()는 샘플 전체를 훑는 O(n) 연산이라, 재생 중 매 프레임(rAF, ~60fps)
// drawWaveform()을 부를 때마다 다시 계산하면 긴 파일에서 눈에 띄게 버벅인다. pcm/캔버스 폭이
// 바뀔 때만 다시 계산해 캐시해두고, 재생 중 매 프레임에는 캐시된 막대만 그린다.
let cachedPeaks: number[] = []
let cachedPeaksWidth = 0

const totalDurationSeconds = computed(() => durationSeconds(props.pcm))

const formattedDuration = computed(() => {
  const total = totalDurationSeconds.value
  const minutes = Math.floor(total / 60)
  const seconds = Math.floor(total % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
})

// DESIGN.md: 캔버스 2D 컨텍스트는 Tailwind 클래스를 못 쓰므로, 원시 oklch 리터럴을 박아넣는
// 대신 :root에 정의된 zone-accent-files CSS 커스텀 프로퍼티(라이트/다크 테마에 따라 값이
// 갈리는 실제 토큰, front/src/style.css)를 읽어와 그대로 쓴다.
function resolveZoneAccentFilesColor(): string {
  if (typeof document === 'undefined') return 'currentColor'
  const value = getComputedStyle(document.documentElement).getPropertyValue('--zone-accent-files').trim()
  return value || 'currentColor'
}

function recomputePeaks(width: number) {
  cachedPeaks = computeWaveformPeaks(props.pcm.interleaved, props.pcm.channels, Math.max(1, Math.floor(width)))
  cachedPeaksWidth = width
}

function currentPlaybackSeconds(): number {
  if (!audioContext) return 0
  const elapsed = audioContext.currentTime - playbackStartContextTime
  return Math.max(0, Math.min(totalDurationSeconds.value, playbackStartOffsetSeconds + elapsed))
}

function drawWaveform() {
  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  // jsdom 등 캔버스 2D 컨텍스트가 없는 환경에서는 조용히 건너뛴다 — 실제 렌더링은
  // 브라우저 검증 단계에서 눈으로 확인한다.
  if (!ctx) return

  const width = canvas.clientWidth || 300
  const height = canvas.clientHeight || 64
  canvas.width = width
  canvas.height = height

  if (cachedPeaksWidth !== width) recomputePeaks(width)

  const midY = height / 2
  const accentColor = resolveZoneAccentFilesColor()

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = accentColor
  cachedPeaks.forEach((peak, i) => {
    const barHeight = Math.max(1, peak * height * WAVEFORM_VERTICAL_SCALE)
    ctx.fillRect(i, midY - barHeight / 2, 1, barHeight)
  })

  if (isPlaying.value) {
    const x = secondsToPixel(currentPlaybackSeconds(), width, totalDurationSeconds.value)
    ctx.save()
    ctx.strokeStyle = accentColor
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
    ctx.restore()
  }
}

function clientXToSeconds(clientX: number): number {
  const canvas = canvasEl.value
  if (!canvas) return 0
  const rect = canvas.getBoundingClientRect()
  const width = canvas.clientWidth || rect.width
  return pixelToSeconds(clientX - rect.left, width, totalDurationSeconds.value)
}

function stopPlayheadLoop() {
  if (playheadRafId !== null) {
    cancelAnimationFrame(playheadRafId)
    playheadRafId = null
  }
}

function startPlayheadLoop() {
  stopPlayheadLoop()
  const tick = () => {
    if (!isPlaying.value) return
    drawWaveform()
    playheadRafId = requestAnimationFrame(tick)
  }
  playheadRafId = requestAnimationFrame(tick)
}

function getOrCreateAudioContext(): AudioContext | null {
  // 재생 버튼을 누를 때마다 새 AudioContext를 만들면 브라우저의 동시 컨텍스트 개수 제한
  // (Chrome 기준 약 6개)에 금방 부딪힌다 — 컴포넌트 인스턴스당 하나만 만들어 재사용한다.
  if (audioContext) return audioContext
  const AudioContextCtor = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext
  if (!AudioContextCtor) return null
  audioContext = new AudioContextCtor()
  return audioContext
}

// 클릭-탐색(item 2)과 재생 버튼이 공유하는 실제 재생 시작 로직. 이미 재생 중이던 소스가
// 있으면 그 소스의 onended를 먼저 떼어낸 뒤 정지한다 — 안 그러면 onended가 isPlaying을
// false로 되돌린 직후 새 소스가 다시 true로 덮어써 깜빡이거나, 테스트의 동기 stop()에서
// 순서가 꼬인다.
function startPlaybackFrom(startSeconds: number) {
  const ctx = getOrCreateAudioContext()
  if (!ctx) return

  if (sourceNode) {
    sourceNode.onended = null
    sourceNode.stop()
  }

  const {interleaved, channels, sampleRate} = props.pcm
  const frameCount = interleaved.length / channels
  const buffer = ctx.createBuffer(channels, frameCount, sampleRate)
  for (let c = 0; c < channels; c++) {
    const channelData = new Float32Array(frameCount)
    for (let i = 0; i < frameCount; i++) channelData[i] = interleaved[i * channels + c]
    buffer.copyToChannel(channelData, c)
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.onended = () => {
    isPlaying.value = false
    // 자연 종료된 소스를 계속 들고 있으면, 다음 재생 시작 시 "이미 끝난 소스에 다시 stop()을
    // 호출"하는 불필요한 호출이 생긴다(Web Audio 스펙상 안전하긴 하지만 지저분하다) — 비워둔다.
    sourceNode = null
    stopPlayheadLoop()
    drawWaveform()
  }
  source.start(0, startSeconds)
  sourceNode = source
  playbackStartContextTime = ctx.currentTime
  playbackStartOffsetSeconds = startSeconds
  isPlaying.value = true
  startPlayheadLoop()
}

function stopPlayback() {
  sourceNode?.stop()
}

async function togglePlay() {
  if (isPlaying.value) {
    stopPlayback()
    return
  }
  startPlaybackFrom(0)
}

// 파형 클릭 → 그 위치부터 재생(탐색). 이미 재생 중이면 이전 소스를 정지하고 새 위치에서
// 이어서 재생하고, 멈춰 있었다면 그 위치부터 새로 재생을 시작한다.
function onCanvasClick(event: MouseEvent) {
  const seconds = clientXToSeconds(event.clientX)
  startPlaybackFrom(seconds)
}

watch(() => props.pcm, () => {
  // 새 오디오(다른 파일 업로드, 새 처리 결과)로 바뀌면 재생 중이던 소스는 더 이상 의미가
  // 없는 버퍼를 참조하므로 정지하고, 캐시된 피크도 새로 계산해야 한다.
  stopPlayback()
  cachedPeaksWidth = 0
  drawWaveform()
})
onMounted(drawWaveform)
onBeforeUnmount(() => {
  stopPlayback()
  stopPlayheadLoop()
  audioContext?.close?.()
})
</script>

<template>
  <AudioToolShell
      :file-name="fileName" :original="original" :result="result" :result-file-name-base="resultFileNameBase"
      :upload-error="uploadError"
      @error="uploadError = $event" @loaded="onLoaded" @reset="reset"
  >
    <div class="flex flex-col gap-3">
      <AudioTrimWaveform :pcm="original!" @change="onTrimSelectionChange"/>
      <Button :disabled="processing" class="w-fit" data-testid="apply-trim" @click="applyTrim">
        {{ processing ? '처리 중...' : '적용' }}
      </Button>
    </div>
  </AudioToolShell>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {Button} from '@/components/ui/button'
import AudioToolShell from '../audio/AudioToolShell.vue'
import AudioTrimWaveform from '../audio/AudioTrimWaveform.vue'
import {trim} from '../../utils/audioTrim'
import {applyFadeInOut} from '../../utils/audioFade'
import {useAudioToolWorkflow} from '../../composables/useAudioToolWorkflow'

const {original, fileName, uploadError, result, processing, resultFileNameBase, onLoaded, reset, runTool} =
    useAudioToolWorkflow()

const trimStart = ref(0)
const trimEnd = ref(0)

// 트리밍이 만든 새 시작/끝 경계는 원본에 없던 진폭 불연속(클릭음)을 만든다 — 사용자가
// 값을 조절할 결정이 아니라 항상 필요한 보정이므로, 토글/입력 없이 고정된 짧은(20ms)
// 디클릭 페이드를 조용히 덧붙인다.
const TRIM_DECLICK_FADE_SECONDS = 0.02

function onTrimSelectionChange(selection: {start: number, end: number}) {
  trimStart.value = selection.start
  trimEnd.value = selection.end
}

function applyTrim() {
  runTool(
      audio => applyFadeInOut(trim(audio, trimStart.value, trimEnd.value), TRIM_DECLICK_FADE_SECONDS, TRIM_DECLICK_FADE_SECONDS),
      `trim-${trimStart.value}s-${trimEnd.value}s`,
  )
}
</script>

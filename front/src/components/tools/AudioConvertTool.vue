<template>
  <AudioToolShell
      :file-name="fileName" :original="original" :result="result" :result-file-name-base="resultFileNameBase"
      :upload-error="uploadError"
      @error="uploadError = $event" @loaded="onLoaded" @reset="reset"
  >
    <div class="flex flex-col gap-3">
      <p class="text-[13px] text-muted-foreground">
        원본을 그대로 mp3/wav로 다시 인코딩합니다. 신호는 바뀌지 않고 포맷만 바뀝니다.
      </p>
      <Button :disabled="processing" class="w-fit" data-testid="apply-convert" @click="applyConvert">
        {{ processing ? '처리 중...' : '적용' }}
      </Button>
    </div>
  </AudioToolShell>
</template>

<script lang="ts" setup>
import {Button} from '@/components/ui/button'
import AudioToolShell from '../audio/AudioToolShell.vue'
import {useAudioToolWorkflow} from '../../composables/useAudioToolWorkflow'

const {original, fileName, uploadError, result, processing, resultFileNameBase, onLoaded, reset, runTool} =
    useAudioToolWorkflow()

function applyConvert() {
  // 포맷 변환은 신호를 바꾸지 않는다 — mp3/wav 재인코딩만 AudioDownloadButtons가 담당한다.
  runTool(audio => ({...audio}), 'converted')
}
</script>

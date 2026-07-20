<template>
  <AudioToolShell
      :file-name="fileName" :original="original" :result="result" :result-file-name-base="resultFileNameBase"
      :upload-error="uploadError"
      @error="uploadError = $event" @loaded="onLoaded" @reset="reset"
  >
    <div class="flex flex-col gap-3">
      <label class="flex flex-col gap-1.5 text-[13px] text-foreground">
        배속 (0.25 ~ 4.0)
        <input
            v-model.number="speedRate" data-testid="speed-rate-input"
            class="w-32 rounded-md border border-input bg-background px-3 py-1.5 font-mono text-[13px]"
            max="4" min="0.25" step="0.05" type="number"
        />
      </label>
      <label class="flex items-center gap-2 text-[13px] text-foreground">
        <input v-model="speedPreservePitch" data-testid="speed-preserve-pitch" type="checkbox"/>
        피치 유지 (끄면 배속에 비례해 피치도 함께 변함)
      </label>
      <Button :disabled="processing" class="w-fit" data-testid="apply-speed" @click="applySpeed">
        {{ processing ? '처리 중...' : '적용' }}
      </Button>
    </div>
  </AudioToolShell>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {Button} from '@/components/ui/button'
import AudioToolShell from '../audio/AudioToolShell.vue'
import {changeSpeed} from '../../utils/audioSpeed'
import {useAudioToolWorkflow} from '../../composables/useAudioToolWorkflow'

const {original, fileName, uploadError, result, processing, resultFileNameBase, onLoaded, reset, runTool} =
    useAudioToolWorkflow()

const speedRate = ref(1)
const speedPreservePitch = ref(true)

function applySpeed() {
  runTool(
      audio => changeSpeed(audio, speedRate.value, speedPreservePitch.value),
      `speed-${speedRate.value}x`,
  )
}
</script>

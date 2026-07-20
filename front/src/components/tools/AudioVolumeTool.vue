<template>
  <AudioToolShell
      :file-name="fileName" :original="original" :result="result" :result-file-name-base="resultFileNameBase"
      :upload-error="uploadError"
      @error="uploadError = $event" @loaded="onLoaded" @reset="reset"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <span class="text-[13px] font-medium text-foreground">자동 정규화</span>
        <p class="text-[12px] text-muted-foreground">소리 크기를 자동으로 적당한 크기로 맞춰줍니다.</p>
        <label class="flex flex-col gap-1.5 text-[13px] text-foreground">
          목표 피크(dBFS)
          <input
              v-model.number="targetPeakDb" data-testid="target-peak-db-input"
              class="w-32 rounded-md border border-input bg-background px-3 py-1.5 font-mono text-[13px]"
              max="0" min="-24" step="0.5" type="number"
          />
        </label>
        <Button :disabled="processing" class="w-fit" data-testid="apply-normalize" @click="applyNormalize">
          {{ processing ? '처리 중...' : '원클릭 정규화' }}
        </Button>
      </div>

      <div class="flex flex-col gap-2 border-t border-border pt-3">
        <span class="text-[13px] font-medium text-foreground">수동 증폭</span>
        <p class="text-[12px] text-muted-foreground">직접 소리를 더 크게 키우거나 작게 줄입니다.</p>
        <label class="flex flex-col gap-1.5 text-[13px] text-foreground">
          게인(dB) — 클리핑 방지를 위해 0dBFS를 넘으면 자동으로 제한됩니다
          <input
              v-model.number="gainDb" data-testid="gain-db-input"
              class="w-32 rounded-md border border-input bg-background px-3 py-1.5 font-mono text-[13px]"
              max="40" min="-40" step="1" type="number"
          />
        </label>
        <Button :disabled="processing" class="w-fit" data-testid="apply-gain" @click="applyGain">
          {{ processing ? '처리 중...' : '적용' }}
        </Button>
      </div>
    </div>
  </AudioToolShell>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {Button} from '@/components/ui/button'
import AudioToolShell from '../audio/AudioToolShell.vue'
import {autoNormalize, manualGain} from '../../utils/audioVolume'
import {formatSigned} from '../../utils/audioFileName'
import {useAudioToolWorkflow} from '../../composables/useAudioToolWorkflow'

const {original, fileName, uploadError, result, processing, resultFileNameBase, onLoaded, reset, runTool} =
    useAudioToolWorkflow()

const targetPeakDb = ref(-1)
const gainDb = ref(0)

function applyNormalize() {
  runTool(
      audio => autoNormalize(audio, targetPeakDb.value),
      `normalized${formatSigned(targetPeakDb.value)}db`,
  )
}

function applyGain() {
  runTool(
      audio => manualGain(audio, gainDb.value),
      `gain${formatSigned(gainDb.value)}db`,
  )
}
</script>

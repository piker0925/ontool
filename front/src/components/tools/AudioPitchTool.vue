<template>
  <AudioToolShell
      :file-name="fileName" :original="original" :result="result" :result-file-name-base="resultFileNameBase"
      :upload-error="uploadError"
      @error="uploadError = $event" @loaded="onLoaded" @reset="reset"
  >
    <div class="flex flex-col gap-3">
      <label class="flex flex-col gap-1.5 text-[13px] text-foreground">
        피치 조절 (반음, -12 ~ +12)
        <input
            v-model.number="pitchSemitones" data-testid="pitch-semitones-input"
            class="w-32 rounded-md border border-input bg-background px-3 py-1.5 font-mono text-[13px]"
            max="12" min="-12" step="1" type="number"
        />
      </label>
      <p v-if="largeShiftWarning" class="text-[12px] text-amber-600 dark:text-amber-400">
        {{ largeShiftWarning }}
      </p>
      <Button :disabled="processing" class="w-fit" data-testid="apply-pitch" @click="applyPitch">
        {{ processing ? '처리 중...' : '적용' }}
      </Button>
    </div>
  </AudioToolShell>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {Button} from '@/components/ui/button'
import AudioToolShell from '../audio/AudioToolShell.vue'
import {shiftPitch} from '../../utils/audioPitch'
import {formatSigned} from '../../utils/audioFileName'
import {useAudioToolWorkflow} from '../../composables/useAudioToolWorkflow'

const {original, fileName, uploadError, result, processing, resultFileNameBase, onLoaded, reset, runTool} =
    useAudioToolWorkflow()

const pitchSemitones = ref(0)

// 이 도구는 포먼트(음색) 보정을 하지 않는 단순 피치 시프트라, 조절 폭이 커질수록
// 주파수는 정확해도 음색이 달라진다(다람쥐 목소리/저음 처짐). 실측(FFT로 F1 포먼트 위치
// 추적) 결과 ±2반음은 드리프트 5.8%로 미미했지만 ±3반음부터 12.1%로 체감 가능한 수준이라
// 그 지점부터 미리 안내한다.
const largeShiftWarning = computed(() => {
  if (Math.abs(pitchSemitones.value) < 3) return ''
  return '조절 폭이 크면 음정은 정확해도 음색(목소리 톤)이 달라질 수 있습니다.'
})

function applyPitch() {
  runTool(
      audio => shiftPitch(audio, pitchSemitones.value),
      `pitch${formatSigned(pitchSemitones.value)}`,
  )
}
</script>

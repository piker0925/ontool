<template>
  <div class="flex flex-col gap-4">
    <div v-if="!original" class="rounded-xl border border-border bg-card p-6">
      <AudioDropzone @error="$emit('error', $event)" @loaded="$emit('loaded', $event)"/>
      <p v-if="uploadError" class="mt-2 text-[12px] text-destructive">{{ uploadError }}</p>
    </div>

    <template v-else>
      <div class="flex items-center justify-between">
        <span class="truncate font-mono text-[12px] text-muted-foreground">{{ fileName }}</span>
        <Button size="sm" variant="outline" @click="$emit('reset')">
          다른 파일 선택
        </Button>
      </div>

      <AudioWaveformPlayer :pcm="original" label="원본"/>

      <div class="rounded-xl border border-border bg-card p-4" data-testid="tool-panel">
        <slot/>
      </div>

      <div v-if="result" class="flex flex-col gap-2">
        <AudioWaveformPlayer :pcm="result" label="결과"/>
        <AudioDownloadButtons :file-name-base="resultFileNameBase" :pcm="result"/>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
// 오디오 도구 5종(피치·배속·트리밍·변환·볼륨)이 공유하는 "업로드 전 드롭존 / 업로드 후
// 파일명·원본 파형·도구 패널·결과" 마크업 뼈대. 도구별로 다른 부분은 tool-panel 안의 파라미터
// 컨트롤뿐이라 슬롯으로 받는다 — useAudioToolWorkflow.ts가 로직 중복을 없앤 것과 같은 이유로
// (074/075 리뷰에서 지적된 중복) 마크업 중복도 여기서 없앤다.
import {Button} from '@/components/ui/button'
import AudioDropzone from './AudioDropzone.vue'
import AudioWaveformPlayer from './AudioWaveformPlayer.vue'
import AudioDownloadButtons from './AudioDownloadButtons.vue'
import type {PcmAudio} from '../../utils/audioTypes'

defineProps<{
  original: PcmAudio | null
  fileName: string
  uploadError: string
  result: PcmAudio | null
  resultFileNameBase: string
}>()

defineEmits<{
  loaded: [payload: {pcm: PcmAudio, file: File}]
  error: [message: string]
  reset: []
}>()
</script>

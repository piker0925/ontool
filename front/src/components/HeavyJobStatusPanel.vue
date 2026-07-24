<template>
  <div class="flex flex-col">
    <div class="flex h-10 shrink-0 items-center border-b border-border px-4">
      <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">결과</span>
    </div>

    <FileResultPanel
        v-if="result && result.url"
        class="min-h-0 flex-1"
        :advisory="result.text"
        :url="result.url"
    />
    <!-- FileResultPanel 자체는 시각적 결과 뷰어라 별도 알림이 없다 — 완료 전환을 스크린리더에게
         알리기 위한 화면 밖(sr-only) 상태 텍스트를 덧붙인다. -->
    <span v-if="result && result.url" role="status" aria-live="polite" class="sr-only">처리가 완료되었습니다.</span>

    <!-- 처리 중/완료/실패 전환을 스크린리더가 알 수 있도록 각 상태 브랜치에 live region을 둔다.
         에러(업로드 실패·처리 실패·SSE 재연결 실패)는 즉시 알아야 하므로 role=alert + aria-live=assertive,
         그 외 상태(대기/안내 문구)는 role=status + aria-live=polite. 브랜치가 서로 배타적이라 중첩되지 않는다. -->
    <div v-else class="flex flex-1 items-center justify-center p-6">
      <div v-if="uploadError" role="alert" aria-live="assertive" class="flex flex-col items-center gap-3 text-center">
        <div class="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-destructive/40">
          <AlertTriangle class="size-5 text-destructive/70"/>
        </div>
        <p class="max-w-xs text-[13px] font-medium text-destructive">{{ uploadError }}</p>
      </div>

      <div v-else-if="result && !result.url" role="alert" aria-live="assertive" class="flex flex-col items-center gap-3 text-center">
        <div class="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-destructive/40">
          <AlertTriangle class="size-5 text-destructive/70"/>
        </div>
        <p class="max-w-xs text-[13px] font-medium text-destructive">{{ result.text }}</p>
      </div>

      <div v-else-if="!jobId" role="status" aria-live="polite" class="flex flex-col items-center gap-3 text-center">
        <div class="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-border">
          <ArrowRight class="size-5 text-muted-foreground/50"/>
        </div>
        <p class="text-[12px] text-muted-foreground">{{ idlePrompt }}</p>
      </div>

      <!-- SSE 재연결 반복 실패 (042): 무한 스피너로 방치하지 않고 명확히 실패 안내 -->
      <div v-else-if="sseFailed" role="alert" aria-live="assertive" class="flex flex-col items-center gap-3 text-center">
        <div class="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-destructive/40">
          <AlertTriangle class="size-5 text-destructive/70"/>
        </div>
        <p class="max-w-xs text-[13px] font-medium text-destructive">상태를 확인할 수 없습니다 — 새로고침해 주세요</p>
      </div>

      <div v-else role="status" aria-live="polite" class="flex w-full max-w-sm flex-col items-center gap-4">
        <Loader2 class="size-8 animate-spin text-primary/60"/>
        <p v-if="reconnecting" class="text-[12px] text-amber-600">연결이 끊겼습니다 · 재연결 중…</p>
        <p v-if="progress && progress.queuePosition > 0" class="text-[13px] text-muted-foreground">
          대기 중… 앞에 {{ progress.queuePosition }}개
        </p>
        <template v-else-if="progress && progress.progress > 0">
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
                :style="{width: progress.progress + '%'}"
                class="h-full rounded-full bg-primary transition-[width]"
            ></div>
          </div>
          <p class="text-[13px] text-muted-foreground">
            처리 중… {{ progress.progress }}%
            <span v-if="progress.etaSeconds != null"> · 약 {{ formatEta(progress.etaSeconds) }} 남음</span>
          </p>
        </template>
        <p v-else class="text-[13px] text-muted-foreground">처리 중입니다…</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {AlertTriangle, ArrowRight, Loader2} from 'lucide-vue-next'
import FileResultPanel from './FileResultPanel.vue'
import {formatEta} from '../utils/formatEta'
import type {HeavyJobProgress, HeavyJobResult} from '../composables/useHeavyJob'

withDefaults(defineProps<{
  jobId: string | null
  progress: HeavyJobProgress | null
  reconnecting: boolean
  sseFailed: boolean
  result: HeavyJobResult | null
  uploadError?: string | null
  idlePrompt?: string
}>(), {
  uploadError: null,
  idlePrompt: '입력 후 실행하면 처리가 시작됩니다',
})
</script>

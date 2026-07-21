<template>
  <div
      class="grid min-h-[420px] grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-2 lg:divide-x lg:divide-y-0"
  >
    <!-- Left: 파라미터 + 업로드 -->
    <div class="flex flex-col overflow-hidden">
      <div class="flex h-10 shrink-0 items-center border-b border-border px-4">
        <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">헤더/푸터/페이지번호</span>
      </div>

      <div class="flex flex-col gap-1.5 border-b border-border p-4">
        <label class="text-[11px] text-muted-foreground">헤더 텍스트</label>
        <input
            v-model="headerText"
            class="rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/20"
            placeholder="예: 회사명"
            type="text"
        />
        <label class="mt-2 text-[11px] text-muted-foreground">푸터 텍스트</label>
        <input
            v-model="footerText"
            class="rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/20"
            placeholder="예: 대외비"
            type="text"
        />
        <label class="mt-2 text-[11px] text-muted-foreground">페이지 번호 형식 ({page}, {total} 치환)</label>
        <input
            v-model="pageNumberFormat"
            class="rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/20"
            placeholder="예: {page} / {total}"
            type="text"
        />
        <p class="mt-2 text-[11px] text-muted-foreground/70">— 헤더·푸터·페이지 번호 중 최소 하나는 입력해야 합니다.</p>
      </div>

      <div class="flex flex-1 flex-col overflow-auto p-6">
        <FileUploader
            accept=".pdf"
            moduleId="pdf-header-footer"
            :multiple="false"
            :params="currentParams"
            @error="onUploadError"
            @uploaded="onUploaded"
        />
      </div>
    </div>

    <HeavyJobStatusPanel
        :job-id="heavyJob.jobId.value"
        :progress="heavyJob.progress.value"
        :reconnecting="heavyJob.reconnecting.value"
        :result="heavyJob.result.value"
        :sse-failed="heavyJob.sseFailed.value"
        :upload-error="uploadError"
        idle-prompt="파일을 업로드하면 처리가 시작됩니다"
    />
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import FileUploader from './FileUploader.vue'
import HeavyJobStatusPanel from './HeavyJobStatusPanel.vue'
import {useHeavyJob} from '../composables/useHeavyJob'
import {isBatchResult, type UploadResult} from '../types'

const headerText = ref('')
const footerText = ref('')
const pageNumberFormat = ref('')

const currentParams = computed<Record<string, string>>(() => ({
  headerText: headerText.value, footerText: footerText.value, pageNumberFormat: pageNumberFormat.value,
}))

const heavyJob = useHeavyJob()
const uploadError = ref<string | null>(null)

function onUploaded(r: UploadResult) {
  uploadError.value = ''
  if (isBatchResult(r)) return
  heavyJob.track(r.jobId, 'pdf-header-footer', '헤더/푸터/페이지번호')
}

function onUploadError(message: string) {
  uploadError.value = message
}
</script>

<template>
  <div
      class="grid min-h-[420px] grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-2 lg:divide-x lg:divide-y-0"
  >
    <!-- Left: 안내 + 업로드 -->
    <div class="flex flex-col overflow-hidden">
      <div class="flex h-10 shrink-0 items-center gap-2 border-b border-border px-4">
        <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">오피스 문서 변환기</span>
        <Badge v-if="detectedFormat" variant="secondary">{{ officeFormatLabel(detectedFormat) }}</Badge>
      </div>

      <div class="flex flex-col gap-1.5 border-b border-border p-4">
        <p class="rounded-lg border border-border bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
          베타 — HWP·HWPX·PPTX·레거시 DOC·XLS·PPT를 PDF로 변환합니다. 표·이미지 등 레이아웃이 원본과 다를 수 있습니다.
        </p>
      </div>

      <div class="flex flex-1 flex-col overflow-auto p-6">
        <FileUploader
            accept=".hwp,.hwpx,.pptx,.ppt,.doc,.xls"
            moduleId="office-document-convert"
            :multiple="false"
            @error="onUploadError"
            @staged="onStaged"
            @uploaded="onUploaded"
        />
      </div>
    </div>

    <div class="relative flex flex-col overflow-hidden">
      <Badge class="absolute right-3 top-2 z-10" variant="secondary">베타</Badge>
      <HeavyJobStatusPanel
          :job-id="heavyJob.jobId.value"
          :progress="heavyJob.progress.value"
          :reconnecting="heavyJob.reconnecting.value"
          :result="heavyJob.result.value"
          :sse-failed="heavyJob.sseFailed.value"
          :upload-error="uploadError"
          idle-prompt="문서를 업로드하면 PDF로 변환됩니다"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import FileUploader from './FileUploader.vue'
import HeavyJobStatusPanel from './HeavyJobStatusPanel.vue'
import {Badge} from './ui/badge'
import {useHeavyJob} from '../composables/useHeavyJob'
import {isBatchResult, type UploadResult} from '../types'
import {detectOfficeFormat, officeFormatLabel, type OfficeDocumentFormat} from '../utils/officeDocumentFormat'

const heavyJob = useHeavyJob()
const uploadError = ref<string | null>(null)
const detectedFormat = ref<OfficeDocumentFormat | null>(null)

// FileUploader는 업로드 성공 직후 staged를 []로 비우며 다시 emit한다 — 그 순간에 배지가
// 꺼지지 않도록 빈 배열 emission은 무시하고, 실제로 파일이 선택됐을 때만 갱신한다.
function onStaged(files: File[]) {
  if (files.length === 0) return
  detectedFormat.value = detectOfficeFormat(files[0].name)
}

function onUploaded(r: UploadResult) {
  uploadError.value = ''
  if (isBatchResult(r)) return
  heavyJob.track(r.jobId, 'office-document-convert', '오피스 문서 변환기')
}

function onUploadError(message: string) {
  uploadError.value = message
}
</script>

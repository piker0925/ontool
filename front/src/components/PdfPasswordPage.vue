<template>
  <div
      class="grid min-h-[420px] grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-2 lg:divide-x lg:divide-y-0"
  >
    <!-- Left: 파라미터 + 업로드 -->
    <div class="flex flex-col overflow-hidden">
      <div class="flex h-10 shrink-0 items-center border-b border-border px-4">
        <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">PDF 비밀번호 설정/해제</span>
      </div>

      <div class="flex flex-col gap-1.5 border-b border-border p-4">
        <label class="text-[11px] text-muted-foreground">동작</label>
        <select
            v-model="passwordMode"
            class="rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
        >
          <option value="SET">비밀번호 설정</option>
          <option value="REMOVE">비밀번호 제거</option>
        </select>
        <label class="mt-2 text-[11px] text-muted-foreground">비밀번호</label>
        <div class="relative">
          <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="w-full rounded-md border border-input bg-background px-3 py-1.5 pr-9 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/20"
              placeholder="비밀번호 입력"
          />
          <button
              :aria-label="showPassword ? '비밀번호 숨기기' : '비밀번호 표시'"
              class="absolute right-0 top-0 flex h-full w-9 items-center justify-center text-muted-foreground/70 hover:text-foreground"
              type="button"
              @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="size-4"/>
            <Eye v-else class="size-4"/>
          </button>
        </div>
      </div>

      <div class="flex flex-1 flex-col overflow-auto p-6">
        <FileUploader
            accept=".pdf"
            moduleId="pdf-password"
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
import {Eye, EyeOff} from 'lucide-vue-next'
import FileUploader from './FileUploader.vue'
import HeavyJobStatusPanel from './HeavyJobStatusPanel.vue'
import {useHeavyJob} from '../composables/useHeavyJob'
import {isBatchResult, type UploadResult} from '../types'

const passwordMode = ref<'SET' | 'REMOVE'>('SET')
const password = ref('')
const showPassword = ref(false)

const currentParams = computed<Record<string, string>>(() => ({
  mode: passwordMode.value, password: password.value,
}))

const heavyJob = useHeavyJob()
const uploadError = ref<string | null>(null)

function onUploaded(r: UploadResult) {
  uploadError.value = ''
  if (isBatchResult(r)) return
  heavyJob.track(r.jobId, 'pdf-password', 'PDF 비밀번호 설정/해제')
}

function onUploadError(message: string) {
  uploadError.value = message
}
</script>

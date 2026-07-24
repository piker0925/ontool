<template>
  <div
      class="grid min-h-[420px] grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-2 lg:divide-x lg:divide-y-0"
  >
    <!-- Left: 파라미터 + 업로드 -->
    <div class="flex flex-col overflow-hidden">
      <div class="flex h-10 shrink-0 items-center border-b border-border px-4">
        <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">워터마크 삽입</span>
      </div>

      <div class="flex flex-col gap-4 border-b border-border p-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] text-muted-foreground">텍스트·이미지 워터마크 — 미리보기에서 드래그해 위치를 잡으세요 (텍스트는 여러 개 추가 가능)</label>
          <WatermarkEditorCanvas
              v-model:elements="watermarkElements"
              v-model:image-position="imagePosition"
              :file="targetFile"
              :watermark-image-file="watermarkImageFile"
          />

          <label class="mt-3 text-[11px] text-muted-foreground">투명도 (0~100)</label>
          <input
              v-model="watermarkOpacity"
              class="rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              placeholder="30"
              type="text"
          />
          <p class="mt-2 text-[11px] text-muted-foreground/70">
            — <strong>대상 파일은 1개만</strong> 업로드할 수 있습니다. 대상 파일을 올린 뒤 아래
            "이미지 워터마크 추가" 버튼으로 워터마크 이미지를 더할 수 있고, 미리보기 위에서 텍스트와
            똑같이 드래그해 위치를 잡을 수 있습니다(기본 위치는 우하단).
          </p>
        </div>
      </div>

      <div class="flex flex-1 flex-col overflow-auto p-6">
        <FileUploader
            accept=".pdf,.jpg,.jpeg,.png"
            moduleId="pdf-watermark"
            :max-files="2"
            :multiple="false"
            :params="currentParams"
            :reorderable="false"
            second-slot-accept=".jpg,.jpeg,.png"
            second-slot-item-label="워터마크 이미지"
            second-slot-label="+ 이미지 워터마크 추가"
            @error="onUploadError"
            @staged="onStaged"
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
import {computed, ref, watch} from 'vue'
import FileUploader from './FileUploader.vue'
import HeavyJobStatusPanel from './HeavyJobStatusPanel.vue'
import WatermarkEditorCanvas, {type WatermarkImagePosition, type WatermarkTextElement} from './WatermarkEditorCanvas.vue'
import {useHeavyJob} from '../composables/useHeavyJob'
import {isBatchResult, type UploadResult} from '../types'

const watermarkElements = ref<WatermarkTextElement[]>([])
const watermarkOpacity = ref('30')
// 129: 이미지 워터마크 위치 — null이면 아직 정해지지 않은 상태(편집기가 이미지 로드 시 우하단 근처
// 기본값을 계산해 채워준다). 텍스트와 달리 이미지는 파일이 1개뿐이라 단일 값으로 관리한다.
const imagePosition = ref<WatermarkImagePosition | null>(null)

// 편집기가 미리보기를 그리려면 업로드 전 스테이징된 원본 파일이 필요하다 — FileUploader가
// 스테이징 변경을 emit하면 첫 번째 파일(대상 파일)·두 번째 파일(워터마크 이미지)을 각각 붙잡아 둔다.
const stagedFiles = ref<File[]>([])
const targetFile = computed<File | null>(() => stagedFiles.value[0] ?? null)
const watermarkImageFile = computed<File | null>(() => stagedFiles.value[1] ?? null)
function onStaged(files: File[]) {
  stagedFiles.value = files
}
// 파일이 바뀌면(교체·제거) 이전 파일 기준으로 잡아둔 위치는 더 이상 유효하지 않을 수 있다(페이지 수 등).
watch(targetFile, (next, prev) => {
  if (next !== prev) watermarkElements.value = []
})
// 워터마크 이미지가 바뀌면(교체) 이전 이미지 기준으로 잡아둔 위치도 더 이상 유효하지 않다 — 새
// 이미지의 크기가 다르면 편집기가 새 우하단 근처 기본값을 다시 계산해 채운다.
watch(watermarkImageFile, (next, prev) => {
  if (next !== prev) imagePosition.value = null
})

const currentParams = computed<Record<string, string>>(() => {
  const params: Record<string, string> = {
    textElements: JSON.stringify(watermarkElements.value.map(e => ({
      text: e.text, xPercent: e.xPercent, yPercent: e.yPercent, color: e.color, fontSize: e.fontSize, page: e.page,
      fontWeight: e.fontWeight, tiled: e.tiled,
    }))),
    opacity: watermarkOpacity.value,
  }
  if (imagePosition.value) {
    params.imageXPercent = String(imagePosition.value.xPercent)
    params.imageYPercent = String(imagePosition.value.yPercent)
  }
  return params
})

const heavyJob = useHeavyJob()
const uploadError = ref<string | null>(null)

function onUploaded(r: UploadResult) {
  uploadError.value = ''
  if (isBatchResult(r)) return // 워터마크는 항상 단건 job으로만 라우팅된다
  heavyJob.track(r.jobId, 'pdf-watermark', '워터마크 삽입')
}

function onUploadError(message: string) {
  uploadError.value = message
}
</script>

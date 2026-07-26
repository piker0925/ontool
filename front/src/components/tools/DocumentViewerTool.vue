<template>
  <div class="flex flex-col gap-3 max-w-3xl mx-auto w-full">
    <UploadDropzone ref="dropzoneRef" :active="!docType" :icon="FileText" accept=".docx,.xlsx,.hwp,.hwpx,.pptx,.ppt,.doc,.xls"
                    label="DOCX 또는 XLSX 파일을 선택하세요" @select="onFilesSelected"/>

    <div v-show="!!docType" class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="truncate text-[12px] text-muted-foreground">{{ fileName }}</span>
        <button class="shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] text-foreground transition-colors hover:border-zone-accent-files/50"
                @click="dropzoneRef?.open()">다른 파일
        </button>
      </div>

      <p v-show="docType === 'docx'" class="rounded-lg border border-border bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
        레이아웃이 원본과 다를 수 있습니다.
      </p>

      <div v-show="docType === 'docx'" ref="docxContainer" class="overflow-auto rounded-xl border border-border bg-card p-4 max-h-[70vh]"></div>

      <div v-show="docType === 'xlsx'" class="flex flex-col gap-2">
        <div class="flex flex-wrap gap-1.5">
          <button v-for="sheet in sheetNames" :key="sheet"
                  :class="activeSheet === sheet ? 'bg-zone-accent-files/10 text-zone-accent-files shadow-sm border-zone-accent-files/40' : 'text-muted-foreground hover:text-foreground border-border'"
                  class="rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors"
                  @click="activeSheet = sheet">{{ sheet }}
          </button>
        </div>

        <div class="overflow-auto rounded-xl border border-border bg-card max-h-[70vh]">
          <table class="w-full border-collapse text-[12px]">
            <tbody>
            <tr v-for="(row, i) in activeSheetRows" :key="i">
              <td v-for="(cell, j) in row" :key="j" class="border-b border-border px-2 py-1 whitespace-nowrap">{{ cell }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="officeGuidanceLabel" class="flex flex-col gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
      <p class="text-[12px] text-foreground/80">
        이 뷰어는 DOCX/XLSX만 직접 봅니다. {{ officeGuidanceLabel }} 파일은 오피스 문서 변환기로 PDF 변환 후 확인하세요.
      </p>
      <router-link class="flex items-center gap-1 text-[11px] font-medium text-zone-accent-files hover:underline"
                   to="/tools/office-document-convert">
        오피스 문서 변환기로 이동
        <ArrowRight class="size-3"/>
      </router-link>
    </div>
    <p v-else-if="error" class="text-[11px] text-destructive/70">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {ArrowRight, FileText} from 'lucide-vue-next'
import {renderAsync} from 'docx-preview'
import {detectDocumentType, type DocumentType} from '../../utils/documentViewer'
import {detectOfficeFormat, officeFormatLabel} from '../../utils/officeDocumentFormat'
import {parseWorkbook} from '../../utils/xlsxViewer'
import UploadDropzone from '../UploadDropzone.vue'

const dropzoneRef = ref<InstanceType<typeof UploadDropzone> | null>(null)
const docxContainer = ref<HTMLDivElement | null>(null)
const docType = ref<DocumentType | null>(null)
const fileName = ref('')
const error = ref('')
const officeGuidanceLabel = ref<string | null>(null)

const sheetNames = ref<string[]>([])
const sheets = ref<Record<string, unknown[][]>>({})
const activeSheet = ref('')
const activeSheetRows = computed(() => sheets.value[activeSheet.value] ?? [])

async function onFilesSelected(files: File[]) {
  const file = files[0]
  if (!file) return

  error.value = ''
  officeGuidanceLabel.value = null
  const type = detectDocumentType(file.name)
  if (!type) {
    const officeFormat = detectOfficeFormat(file.name)
    if (officeFormat) {
      officeGuidanceLabel.value = officeFormatLabel(officeFormat)
    } else {
      error.value = '지원하지 않는 파일 형식입니다 (DOCX, XLSX만 지원)'
    }
    docType.value = null
    return
  }

  fileName.value = file.name

  try {
    const buffer = await file.arrayBuffer()

    if (type === 'xlsx') {
      const parsed = parseWorkbook(buffer)
      sheetNames.value = parsed.sheetNames
      sheets.value = parsed.sheets
      activeSheet.value = parsed.sheetNames[0]
      docType.value = 'xlsx'
      return
    }

    docType.value = 'docx'
    try {
      await renderDocx(buffer)
    } catch (e) {
      console.error('DOCX 렌더링 실패', e)
      throw new Error('DOCX 파일을 읽을 수 없습니다 (손상되었거나 지원하지 않는 형식)')
    }
  } catch (e) {
    docType.value = null
    error.value = e instanceof Error ? e.message : '파일을 읽는 중 오류가 발생했습니다'
  }
}

async function renderDocx(buffer: ArrayBuffer) {
  const container = docxContainer.value
  if (!container) return

  container.innerHTML = ''
  await renderAsync(buffer, container)
}
</script>

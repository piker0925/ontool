<template>
  <div class="flex flex-col gap-3 max-w-3xl mx-auto w-full">
    <input ref="fileInput" accept=".docx,.xlsx" class="hidden" type="file" @change="onFileChange"/>

    <button v-if="!docType"
            class="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-card text-[13px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            @click="fileInput?.click()">DOCX 또는 XLSX 파일을 선택하세요
    </button>

    <div v-show="!!docType" class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="truncate text-[12px] text-muted-foreground">{{ fileName }}</span>
        <button class="shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] text-foreground transition-colors hover:border-ring"
                @click="fileInput?.click()">다른 파일
        </button>
      </div>

      <p v-show="docType === 'docx'" class="rounded-lg border border-border bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
        레이아웃이 원본과 다를 수 있습니다.
      </p>

      <div v-show="docType === 'docx'" ref="docxContainer" class="overflow-auto rounded-xl border border-border bg-card p-4 max-h-[70vh]"></div>

      <div v-show="docType === 'xlsx'" class="flex flex-col gap-2">
        <div class="flex flex-wrap gap-1.5">
          <button v-for="sheet in sheetNames" :key="sheet"
                  :class="activeSheet === sheet ? 'bg-card text-foreground shadow-sm border-ring' : 'text-muted-foreground hover:text-foreground border-border'"
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

    <p v-if="error" class="text-[11px] text-destructive/70">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {renderAsync} from 'docx-preview'
import {detectDocumentType, type DocumentType} from '../../utils/documentViewer'
import {parseWorkbook} from '../../utils/xlsxViewer'

const fileInput = ref<HTMLInputElement | null>(null)
const docxContainer = ref<HTMLDivElement | null>(null)
const docType = ref<DocumentType | null>(null)
const fileName = ref('')
const error = ref('')

const sheetNames = ref<string[]>([])
const sheets = ref<Record<string, unknown[][]>>({})
const activeSheet = ref('')
const activeSheetRows = computed(() => sheets.value[activeSheet.value] ?? [])

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  error.value = ''
  const type = detectDocumentType(file.name)
  if (!type) {
    error.value = '지원하지 않는 파일 형식입니다 (DOCX, XLSX만 지원)'
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
    await renderDocx(buffer)
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

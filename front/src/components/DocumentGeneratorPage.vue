<template>
  <div
      class="grid min-h-[420px] grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-2 lg:divide-x lg:divide-y-0"
  >
    <!-- Left: 입력 -->
    <div class="flex flex-col overflow-hidden">
      <div class="flex h-10 shrink-0 items-center border-b border-border px-4">
        <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">청구서</span>
      </div>

      <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] text-muted-foreground">발행자 *</label>
            <input v-model="issuer" class="rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20" placeholder="발행자명" type="text"/>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] text-muted-foreground">발행자 주소</label>
            <input v-model="issuerAddress" class="rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20" type="text"/>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] text-muted-foreground">수신자 *</label>
            <input v-model="recipient" class="rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20" placeholder="수신자명" type="text"/>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] text-muted-foreground">수신자 주소</label>
            <input v-model="recipientAddress" class="rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20" type="text"/>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] text-muted-foreground">청구서 번호</label>
            <input v-model="invoiceNumber" class="rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20" type="text"/>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] text-muted-foreground">발행일</label>
            <input v-model="issueDate" class="rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20" placeholder="2026-07-18" type="text"/>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label class="text-[11px] font-medium text-muted-foreground">품목 *</label>
            <button class="text-[11px] text-primary hover:underline" type="button" @click="addItem">
              + 품목 추가
            </button>
          </div>
          <div v-for="(item, i) in items" :key="i" class="flex items-center gap-1.5">
            <input v-model="item.description" class="flex-[2] rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20" placeholder="품목명" type="text"/>
            <input v-model="item.quantity" class="w-16 rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20" placeholder="수량" type="text"/>
            <input v-model="item.unitPrice" class="w-20 rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20" placeholder="단가" type="text"/>
            <button
                :disabled="items.length <= 1"
                class="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                type="button"
                @click="items.splice(i, 1)"
            ><X class="size-3.5"/>
            </button>
          </div>
          <div class="flex items-center justify-between border-t border-border pt-2 text-[12px] text-muted-foreground">
            <span>합계</span>
            <span class="font-medium text-foreground" data-testid="invoice-total">{{ invoiceTotal.toLocaleString() }}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] text-muted-foreground">용지 크기</label>
            <select v-model="paperSize" class="rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20">
              <option v-for="s in PAPER_SIZES" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] text-muted-foreground">여백 (mm)</label>
            <input v-model="margin" class="rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20" placeholder="20" type="text"/>
          </div>
        </div>

        <Button :disabled="!invoiceValid" class="h-8 text-[12px]" @click="generateInvoice">청구서 PDF 생성</Button>
      </div>
    </div>

    <HeavyJobStatusPanel
        :job-id="heavyJob.jobId.value"
        :progress="heavyJob.progress.value"
        :reconnecting="heavyJob.reconnecting.value"
        :result="heavyJob.result.value"
        :sse-failed="heavyJob.sseFailed.value"
        :upload-error="uploadError"
        idle-prompt="입력 후 생성하면 처리가 시작됩니다"
    />
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {X} from 'lucide-vue-next'
import {Button} from '@/components/ui/button'
import HeavyJobStatusPanel from './HeavyJobStatusPanel.vue'
import {useHeavyJob} from '../composables/useHeavyJob'
import {apiClient} from '../api/client'
import {uploadErrorMessage} from '../utils/uploadError'
import {todayDateString} from '../utils/todayDateString'
import {isBatchResult, type UploadResult} from '../types'

const PAPER_SIZES = ['A4', 'LETTER', 'A5']

const issuer = ref('')
const issuerAddress = ref('')
const recipient = ref('')
const recipientAddress = ref('')
const invoiceNumber = ref('')
const issueDate = ref(todayDateString())
const items = ref([{description: '', quantity: '', unitPrice: ''}])
const paperSize = ref<typeof PAPER_SIZES[number]>('A4')
const margin = ref('20')

function isCompleteItem(i: {description: string, quantity: string, unitPrice: string}) {
  return i.description.trim() !== '' && i.quantity.trim() !== '' && i.unitPrice.trim() !== ''
}

const invoiceValid = computed(() =>
    issuer.value.trim() !== '' && recipient.value.trim() !== '' && items.value.some(isCompleteItem))

// 실제 제출 시 필터링되는 완전한 품목만 합산한다 — 그래야 여기 보이는 합계가 실제 생성될
// PDF의 합계와 항상 일치한다. 수량·단가가 숫자가 아니면(백엔드가 결국 막을 값) 그 행은 0으로
// 취급해 합계 전체가 NaN으로 오염되지 않게 한다.
const invoiceTotal = computed(() =>
    items.value.filter(isCompleteItem).reduce((sum, i) => {
      const qty = parseFloat(i.quantity)
      const unitPrice = parseFloat(i.unitPrice)
      return isNaN(qty) || isNaN(unitPrice) ? sum : sum + qty * unitPrice
    }, 0))

function addItem() {
  items.value.push({description: '', quantity: '', unitPrice: ''})
}

const heavyJob = useHeavyJob()
const uploadError = ref<string | null>(null)

async function generateInvoice() {
  if (!invoiceValid.value) return
  uploadError.value = ''
  const invoiceJson = JSON.stringify({
    issuer: issuer.value,
    issuerAddress: issuerAddress.value || undefined,
    recipient: recipient.value,
    recipientAddress: recipientAddress.value || undefined,
    invoiceNumber: invoiceNumber.value || undefined,
    issueDate: issueDate.value || undefined,
    items: items.value
        .filter(isCompleteItem)
        .map(i => ({description: i.description, quantity: i.quantity, unitPrice: i.unitPrice})),
  })
  const form = new FormData()
  form.append('invoiceJson', invoiceJson)
  form.append('paperSize', paperSize.value)
  form.append('margin', margin.value)
  try {
    const {data} = await apiClient.post<UploadResult>('/api/v1/tools/invoice-generator/upload', form)
    if (!isBatchResult(data)) heavyJob.track(data.jobId)
  } catch (e) {
    uploadError.value = uploadErrorMessage(e)
  }
}
</script>

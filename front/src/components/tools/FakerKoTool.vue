<template>
  <div class="flex flex-col gap-4 max-w-2xl mx-auto w-full">
    <div class="flex flex-wrap gap-2">
      <label v-for="field in FIELD_OPTIONS" :key="field.value"
             class="flex items-center gap-1.5 cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 transition-colors hover:bg-accent"
             :class="fields[field.value] ? 'border-primary/50 bg-primary/5' : ''">
        <input v-model="fields[field.value]" class="accent-primary" type="checkbox"/>
        <span class="text-[12px] text-foreground">{{ field.label }}</span>
      </label>
    </div>

    <div class="flex items-center gap-2">
      <label class="text-[11px] font-medium text-muted-foreground">생성 개수</label>
      <input v-model.number="count"
             class="w-24 rounded-lg border border-border bg-card px-2 py-1 text-[12px] text-foreground outline-none focus:border-ring"
             max="1000" min="1" type="number"
             @change="clampCount"/>
    </div>

    <button
        class="rounded-xl bg-primary py-2.5 text-[14px] font-semibold text-primary-foreground transition-colors hover:opacity-90"
        @click="generate">생성
    </button>

    <div v-if="records.length > 0" class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] text-muted-foreground">{{ records.length }}건 생성됨</span>
        <div class="flex gap-1.5">
          <button class="rounded-lg border border-border bg-card px-3 py-1 text-[12px] text-foreground/80 transition-colors hover:bg-accent"
                  @click="downloadJson">JSON 다운로드
          </button>
          <button class="rounded-lg border border-border bg-card px-3 py-1 text-[12px] text-foreground/80 transition-colors hover:bg-accent"
                  @click="downloadCsv">CSV 다운로드
          </button>
        </div>
      </div>
      <div class="max-h-72 overflow-auto rounded-xl border border-border bg-card">
        <table class="w-full text-[12px]">
          <thead>
          <tr class="border-b border-border">
            <th v-for="key in recordKeys" :key="key" class="px-3 py-1.5 text-left font-medium text-muted-foreground">{{ key }}</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(record, i) in records.slice(0, 50)" :key="i" class="border-b border-border/50 last:border-0">
            <td v-for="key in recordKeys" :key="key" class="px-3 py-1.5 font-mono text-foreground">{{ record[key] }}</td>
          </tr>
          </tbody>
        </table>
        <p v-if="records.length > 50" class="px-3 py-2 text-[11px] text-muted-foreground">미리보기는 상위 50건만 표시됩니다. 전체 데이터는 다운로드로 확인하세요.</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, reactive, ref} from 'vue'
import {fakerKoToCsv, generateFakerKoRecords, type FakerKoFieldSet, type FakerKoRecord} from '../../utils/fakerKo'

const FIELD_OPTIONS: { value: keyof FakerKoFieldSet; label: string }[] = [
  {value: 'name', label: '이름'},
  {value: 'phone', label: '전화번호'},
  {value: 'address', label: '주소'},
  {value: 'email', label: '이메일'},
  {value: 'company', label: '회사명'},
]

const fields = reactive<FakerKoFieldSet>({name: true, phone: true, address: true, email: true, company: true})
const count = ref(20)
const records = ref<FakerKoRecord[]>([])

const recordKeys = computed<(keyof FakerKoRecord)[]>(() =>
    records.value.length > 0 ? (Object.keys(records.value[0]) as (keyof FakerKoRecord)[]) : [],
)

function clampCount() {
  const n = Math.floor(Number(count.value))
  count.value = isNaN(n) ? 1 : Math.min(1000, Math.max(1, n))
}

function generate() {
  clampCount()
  records.value = generateFakerKoRecords(count.value, {...fields})
}

function downloadFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], {type}))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadJson() {
  downloadFile(JSON.stringify(records.value, null, 2), 'faker-ko.json', 'application/json')
}

function downloadCsv() {
  downloadFile(fakerKoToCsv(records.value), 'faker-ko.csv', 'text/csv')
}

generate()
</script>

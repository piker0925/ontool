<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <div class="flex flex-col gap-1.5">
      <label class="text-[11px] font-medium text-muted-foreground">Cron 표현식 (분 시 일 월 요일)</label>
      <input v-model="exprInput"
             class="rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-ring"
             placeholder="*/15 9 * * 1-5"
             spellcheck="false"
             type="text"/>
    </div>

    <div class="flex items-center gap-3">
      <label class="text-[11px] text-muted-foreground shrink-0">타임존</label>
      <input v-model="tz"
             class="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-[12px] text-foreground outline-none focus:border-ring"
             spellcheck="false"
             type="text"/>
      <label class="text-[11px] text-muted-foreground shrink-0">개수</label>
      <input v-model.number="count"
             class="w-16 rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-[12px] text-foreground outline-none focus:border-ring"
             max="20" min="1" type="number"/>
    </div>

    <div v-if="description" class="rounded-xl border border-border bg-card p-4">
      <span class="text-[11px] font-medium text-muted-foreground">설명</span>
      <p class="mt-1 text-[13px] text-foreground">{{ description }}</p>
    </div>

    <div v-if="runs.length" class="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4">
      <span class="text-[11px] font-medium text-muted-foreground">다음 실행 ({{ tz }})</span>
      <div v-for="(run, i) in runs" :key="i" class="font-mono text-[13px] text-foreground">{{ run }}</div>
    </div>

    <p v-if="error" class="text-[11px] text-destructive/70">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {describeCron, nextCronRuns} from '../../utils/cronExpr'

const exprInput = ref('*/15 9 * * 1-5')
const tz = ref('Asia/Seoul')
const count = ref(5)

const description = computed(() => {
  if (!exprInput.value.trim()) return ''
  try {
    return describeCron(exprInput.value)
  } catch {
    return ''
  }
})

const runs = computed(() => {
  if (!exprInput.value.trim()) return []
  try {
    return nextCronRuns(exprInput.value, Math.min(Math.max(count.value || 1, 1), 20), tz.value.trim() || 'Asia/Seoul')
  } catch {
    return []
  }
})

const error = computed(() => {
  if (!exprInput.value.trim()) return ''
  try {
    nextCronRuns(exprInput.value, 1, tz.value.trim() || 'Asia/Seoul')
    return ''
  } catch (e) {
    return e instanceof Error ? e.message : '올바른 Cron 표현식을 입력하세요.'
  }
})
</script>

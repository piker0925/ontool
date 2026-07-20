<template>
  <div class="flex flex-col gap-3 max-w-4xl mx-auto w-full">
    <div class="flex items-center gap-2">
      <label class="text-[11px] font-medium text-muted-foreground">루트 interface 이름</label>
      <input v-model="rootName"
             class="w-32 rounded-lg border border-border bg-card px-2 py-1 text-[12px] text-foreground outline-none focus:border-ring"
             placeholder="Root"/>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center justify-between border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">JSON 입력</span>
          <button v-if="input" class="rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                  @click="input = ''">
            <X class="size-3.5"/>
          </button>
        </div>
        <textarea v-model="input"
                  class="h-64 resize-none bg-muted/40 p-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
                  placeholder='{"key": "value"}'/>
      </div>
      <div class="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center justify-between border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">TypeScript interface</span>
          <button v-if="output"
                  :class="copied ? 'text-emerald-500' : 'text-muted-foreground/50 hover:text-foreground'"
                  class="rounded p-0.5 transition-colors"
                  @click="copyOutput">
            <Check v-if="copied" class="size-3.5"/>
            <Copy v-else class="size-3.5"/>
          </button>
        </div>
        <div class="h-64 overflow-auto">
          <div v-if="error" class="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle class="size-4 text-destructive/70"/>
            </div>
            <p class="text-[12px] text-destructive">{{ error }}</p>
          </div>
          <pre v-else-if="output" class="p-3 font-mono text-[13px] text-foreground whitespace-pre-wrap break-all">{{ output }}</pre>
          <div v-else class="flex h-full flex-col items-center justify-center gap-2 text-center">
            <ArrowRight class="size-4 text-muted-foreground/40"/>
            <p class="text-[11px] text-muted-foreground/50">JSON을 입력하면 interface가 생성됩니다</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {AlertCircle, ArrowRight, Check, Copy, X} from 'lucide-vue-next'
import {jsonToTs} from '../../utils/jsonToTs'

const input = ref('{"name":"홍길동","age":30,"tags":["vue","ts"]}')
const rootName = ref('Root')
const copied = ref(false)

const parseResult = computed<{ output: string; error: string }>(() => {
  if (!input.value.trim()) return {output: '', error: ''}
  try {
    const parsed = JSON.parse(input.value)
    return {output: jsonToTs(parsed, rootName.value || 'Root'), error: ''}
  } catch (e: unknown) {
    return {output: '', error: e instanceof Error ? e.message : '변환 중 오류가 발생했습니다.'}
  }
})

const output = computed(() => parseResult.value.output)
const error = computed(() => parseResult.value.error)

async function copyOutput() {
  if (!output.value) return
  await navigator.clipboard.writeText(output.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

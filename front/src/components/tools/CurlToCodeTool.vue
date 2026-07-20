<template>
  <div class="flex flex-col gap-3 max-w-4xl mx-auto w-full">
    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex gap-0.5 rounded-lg bg-muted p-0.5">
        <button v-for="opt in ([{ value: 'js', label: 'JavaScript (fetch)' }, { value: 'python', label: 'Python (requests)' }] as const)"
                :key="opt.value"
                :class="language === opt.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                class="rounded-md px-3 py-1 text-[12px] font-medium transition-colors"
                @click="language = opt.value">{{ opt.label }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center justify-between border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">curl 명령</span>
          <button v-if="input" class="rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                  @click="input = ''">
            <X class="size-3.5"/>
          </button>
        </div>
        <textarea v-model="input"
                  class="h-64 resize-none bg-muted/40 p-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
                  placeholder="curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{&quot;name&quot;:&quot;foo&quot;}'"/>
      </div>
      <div class="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center justify-between border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">생성된 코드</span>
          <button v-if="output"
                  :class="copied ? 'text-emerald-500' : 'text-muted-foreground/50 hover:text-foreground'"
                  class="rounded p-0.5 transition-colors"
                  @click="copyOutput">
            <Check v-if="copied" class="size-3.5"/>
            <Copy v-else class="size-3.5"/>
          </button>
        </div>
        <div class="h-64 overflow-auto">
          <pre v-if="output" class="p-3 font-mono text-[13px] text-foreground whitespace-pre-wrap break-all">{{ output }}</pre>
          <div v-else class="flex h-full flex-col items-center justify-center gap-2 text-center">
            <ArrowRight class="size-4 text-muted-foreground/40"/>
            <p class="text-[11px] text-muted-foreground/50">curl 명령을 입력하면 코드가 생성됩니다</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {ArrowRight, Check, Copy, X} from 'lucide-vue-next'
import {generateJsFetch, generatePythonRequests, parseCurl} from '../../utils/curlToCode'

const input = ref('curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d \'{"name":"foo"}\'')
const language = ref<'js' | 'python'>('js')
const copied = ref(false)

const output = computed(() => {
  if (!input.value.trim()) return ''
  const parsed = parseCurl(input.value)
  if (!parsed.url) return ''
  return language.value === 'js' ? generateJsFetch(parsed) : generatePythonRequests(parsed)
})

async function copyOutput() {
  if (!output.value) return
  await navigator.clipboard.writeText(output.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

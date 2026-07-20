<template>
  <div class="flex flex-col gap-3 max-w-4xl mx-auto w-full">
    <div class="flex flex-wrap gap-2">
      <label v-for="template in GITIGNORE_TEMPLATES" :key="template.id"
             class="flex items-center gap-1.5 cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 transition-colors hover:bg-accent"
             :class="selected.includes(template.id) ? 'border-primary/50 bg-primary/5' : ''">
        <input v-model="selected" :value="template.id" class="accent-primary" type="checkbox"/>
        <span class="text-[12px] text-foreground">{{ template.label }}</span>
      </label>
    </div>

    <div class="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
      <div class="flex h-9 items-center justify-between border-b border-border px-3">
        <span class="text-[11px] font-medium text-muted-foreground">.gitignore</span>
        <div class="flex items-center gap-1">
          <button v-if="output"
                  :class="copied ? 'text-emerald-500' : 'text-muted-foreground/50 hover:text-foreground'"
                  class="rounded p-0.5 transition-colors"
                  @click="copyOutput">
            <Check v-if="copied" class="size-3.5"/>
            <Copy v-else class="size-3.5"/>
          </button>
          <button v-if="output" class="rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                  @click="downloadOutput">
            <Download class="size-3.5"/>
          </button>
        </div>
      </div>
      <div class="h-72 overflow-auto">
        <pre v-if="output" class="p-3 font-mono text-[13px] text-foreground whitespace-pre-wrap break-all">{{ output }}</pre>
        <div v-else class="flex h-full flex-col items-center justify-center gap-2 text-center">
          <ArrowRight class="size-4 text-muted-foreground/40"/>
          <p class="text-[11px] text-muted-foreground/50">템플릿을 선택하면 .gitignore가 생성됩니다</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {ArrowRight, Check, Copy, Download} from 'lucide-vue-next'
import {GITIGNORE_TEMPLATES, mergeGitignoreTemplates} from '../../utils/gitignoreTemplates'

const selected = ref<string[]>(['node'])
const copied = ref(false)

const output = computed(() => selected.value.length > 0 ? mergeGitignoreTemplates(selected.value) : '')

async function copyOutput() {
  if (!output.value) return
  await navigator.clipboard.writeText(output.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

function downloadOutput() {
  if (!output.value) return
  const url = URL.createObjectURL(new Blob([output.value], {type: 'text/plain'}))
  const a = document.createElement('a')
  a.href = url
  a.download = '.gitignore'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

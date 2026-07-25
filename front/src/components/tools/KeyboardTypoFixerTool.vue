<template>
  <div class="flex flex-col gap-3 max-w-lg mx-auto w-full">
    <div class="flex items-center justify-between gap-2">
      <label class="text-[12px] font-medium text-muted-foreground">변환 방향</label>
      <div class="flex rounded-lg border border-border overflow-hidden">
        <button v-for="d in DIRECTIONS" :key="d.value"
                :class="direction === d.value ? 'bg-zone-accent-life text-white' : 'bg-card text-muted-foreground hover:text-foreground'"
                class="px-3 py-1 text-[12px] font-medium transition-colors"
                @click="manualDirection = d.value">{{ d.label }}
        </button>
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground">
      {{ manualDirection ? '수동 선택' : `자동 감지: ${directionLabel}` }}
      <button v-if="manualDirection" class="ml-1 text-zone-accent-life underline" @click="manualDirection = null">자동으로 되돌리기</button>
    </p>

    <label class="flex flex-col gap-1.5 text-[13px]">
      입력
      <textarea v-model="input"
                class="h-24 resize-none rounded-xl border border-border bg-card p-3 font-mono text-[13px] text-foreground outline-none focus:border-ring"
                placeholder="dkssud"/>
    </label>

    <div v-if="output" class="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-4">
      <span class="font-mono text-[13px] text-foreground break-all">{{ output }}</span>
      <button aria-label="결과 복사"
              :class="copied ? 'text-emerald-500' : 'text-muted-foreground/50 hover:text-foreground'"
              class="rounded p-0.5 transition-colors shrink-0"
              @click="copyOutput">
        <Check v-if="copied" class="size-3.5"/>
        <Copy v-else class="size-3.5"/>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {Check, Copy} from 'lucide-vue-next'
import {convertKeyboard, detectKeyboardDirection} from '../../utils/textUtils'

const DIRECTIONS: Array<{ value: 'en-ko' | 'ko-en'; label: string }> = [
  {value: 'en-ko', label: '영타 → 한글'},
  {value: 'ko-en', label: '한타 → 영문'},
]

const input = ref('')
const manualDirection = ref<'en-ko' | 'ko-en' | null>(null)
const copied = ref(false)

const detectedDirection = computed(() => detectKeyboardDirection(input.value))
const direction = computed(() => manualDirection.value ?? detectedDirection.value)
const directionLabel = computed(() => DIRECTIONS.find(d => d.value === detectedDirection.value)?.label ?? '')
const output = computed(() => input.value ? convertKeyboard(input.value, direction.value) : '')

async function copyOutput() {
  if (!output.value) return
  await navigator.clipboard.writeText(output.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

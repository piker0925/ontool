<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <label class="flex flex-col gap-1.5 text-[13px]">
      텍스트
      <textarea v-model="input"
                class="h-40 resize-y rounded-xl border border-border bg-card p-3 font-mono text-[13px] text-foreground outline-none focus:border-ring"
                placeholder="글자 수를 셀 텍스트를 입력하세요"/>
    </label>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div v-for="s in stats" :key="s.label"
           class="flex flex-col items-center gap-1 rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 py-4">
        <span class="font-mono text-xl font-semibold text-zone-accent-life">{{ s.value.toLocaleString() }}</span>
        <span class="text-[11px] text-muted-foreground">{{ s.label }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {countCharsDetailed} from '../../utils/textUtils'

const input = ref('')

const detailed = computed(() => countCharsDetailed(input.value))

const stats = computed(() => [
  {label: '공백 포함', value: detailed.value.charsWithSpace},
  {label: '공백 제외', value: detailed.value.charsWithoutSpace},
  {label: '바이트 (UTF-8)', value: detailed.value.bytes},
  {label: '단어', value: detailed.value.words},
  {label: '줄', value: detailed.value.lines},
])
</script>

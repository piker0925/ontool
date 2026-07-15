<template>
  <div class="flex flex-col gap-3 max-w-lg mx-auto w-full">
    <div class="flex flex-col gap-1.5">
      <label class="text-[11px] font-medium text-muted-foreground">메시지</label>
      <textarea v-model="text"
                class="h-24 resize-none rounded-xl border border-border bg-card p-3 font-mono text-[13px] text-foreground outline-none focus:border-ring"
                placeholder="서명할 텍스트"/>
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-[11px] font-medium text-muted-foreground">키</label>
      <div class="flex gap-2">
        <input v-model="keyValue"
               class="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-ring"
               placeholder="비밀 키" spellcheck="false" type="text"/>
        <select v-model="keyFormat" class="rounded-xl border border-border bg-card px-2 text-[12px] text-foreground outline-none">
          <option value="utf8">UTF-8</option>
          <option value="hex">HEX</option>
          <option value="base64">Base64</option>
        </select>
      </div>
    </div>

    <div class="flex gap-2">
      <select v-model="algorithm" class="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-[12px] text-foreground outline-none">
        <option value="HmacSHA256">HMAC-SHA256</option>
        <option value="HmacSHA1">HMAC-SHA1</option>
        <option value="HmacSHA512">HMAC-SHA512</option>
        <option value="HmacMD5">HMAC-MD5</option>
      </select>
      <select v-model="outputFormat" class="rounded-xl border border-border bg-card px-3 py-2 text-[12px] text-foreground outline-none">
        <option value="hex">HEX 출력</option>
        <option value="base64">Base64 출력</option>
      </select>
    </div>

    <div v-if="result" class="flex items-start justify-between gap-2 rounded-xl border border-border bg-card p-4">
      <span class="font-mono text-[13px] text-foreground break-all">{{ result }}</span>
      <button class="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground shrink-0"
              @click="copyText(result)">
        <Copy class="size-3.5"/>
      </button>
    </div>

    <p v-if="error" class="text-[11px] text-destructive/70">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import {ref, watchEffect} from 'vue'
import {Copy} from 'lucide-vue-next'
import {type HmacAlgorithm, type HmacOutputFormat, hmacSign, type KeyFormat} from '../../utils/hmac'

const text = ref('')
const keyValue = ref('')
const keyFormat = ref<KeyFormat>('utf8')
const algorithm = ref<HmacAlgorithm>('HmacSHA256')
const outputFormat = ref<HmacOutputFormat>('hex')
const result = ref('')
const error = ref('')

watchEffect(async () => {
  if (!keyValue.value) {
    result.value = ''
    error.value = ''
    return
  }
  try {
    result.value = await hmacSign(text.value, keyValue.value, algorithm.value, keyFormat.value, outputFormat.value)
    error.value = ''
  } catch (e) {
    result.value = ''
    error.value = e instanceof Error ? e.message : 'HMAC 생성 실패'
  }
})

async function copyText(t: string) {
  await navigator.clipboard.writeText(t)
}
</script>

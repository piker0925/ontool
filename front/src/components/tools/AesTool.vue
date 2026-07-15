<template>
  <div class="flex flex-col gap-3 max-w-lg mx-auto w-full">
    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex gap-0.5 rounded-lg bg-muted p-0.5">
        <button v-for="opt in [{v: 'encrypt', l: '암호화'}, {v: 'decrypt', l: '복호화'}]" :key="opt.v"
                :class="op === opt.v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                class="rounded-md px-3 py-1 text-[12px] font-medium transition-colors"
                @click="op = (opt.v as 'encrypt' | 'decrypt')">{{ opt.l }}
        </button>
      </div>
      <select v-model="cipherMode" class="rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] text-foreground outline-none">
        <option value="CBC">AES-CBC</option>
        <option value="GCM">AES-GCM</option>
        <option value="CTR">AES-CTR</option>
      </select>
      <select v-model="format" class="rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] text-foreground outline-none ml-auto">
        <option value="base64">Base64</option>
        <option value="hex">HEX</option>
      </select>
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-[11px] font-medium text-muted-foreground">{{ op === 'encrypt' ? '평문' : '암호문' }}</label>
      <textarea v-model="text"
                class="h-24 resize-none rounded-xl border border-border bg-card p-3 font-mono text-[13px] text-foreground outline-none focus:border-ring"/>
    </div>

    <div class="flex gap-2">
      <input v-model="keyValue"
             class="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-ring"
             placeholder="키 (16/24/32바이트로 자동 조정)" spellcheck="false" type="text"/>
      <input v-model="ivHex"
             class="w-40 rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-[12px] text-foreground outline-none focus:border-ring"
             placeholder="IV(hex, 선택)" spellcheck="false" type="text"/>
    </div>
    <p class="text-[10px] text-muted-foreground/70">IV를 비우면 암호화 시 임의 생성해 결과 앞에 붙이고, 복호화 시 앞에서 분리합니다.</p>

    <div v-if="result" class="flex items-start justify-between gap-2 rounded-xl border border-border bg-card p-4">
      <span class="font-mono text-[13px] text-foreground break-all whitespace-pre-wrap">{{ result }}</span>
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
import {aesDecrypt, aesEncrypt, type AesFormat, type AesMode} from '../../utils/aes'

const op = ref<'encrypt' | 'decrypt'>('encrypt')
const cipherMode = ref<AesMode>('CBC')
const format = ref<AesFormat>('base64')
const text = ref('')
const keyValue = ref('')
const ivHex = ref('')
const result = ref('')
const error = ref('')

watchEffect(async () => {
  if (!text.value || !keyValue.value) {
    result.value = ''
    error.value = ''
    return
  }
  try {
    result.value = op.value === 'encrypt'
        ? await aesEncrypt(text.value, keyValue.value, cipherMode.value, format.value, ivHex.value)
        : await aesDecrypt(text.value, keyValue.value, cipherMode.value, format.value, ivHex.value)
    error.value = ''
  } catch (e) {
    result.value = ''
    error.value = e instanceof Error ? e.message : 'AES 처리 실패'
  }
})

async function copyText(t: string) {
  await navigator.clipboard.writeText(t)
}
</script>

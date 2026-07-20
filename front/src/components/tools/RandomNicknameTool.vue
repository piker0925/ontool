<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <p class="text-[12px] text-muted-foreground">형용사 + 명사 조합으로 무작위 닉네임을 생성합니다.</p>
    <div class="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card py-10">
      <span class="text-[22px] font-bold text-foreground">{{ nickname || '생성 버튼을 클릭하세요' }}</span>
    </div>
    <div class="flex gap-2 items-center">
      <button
          class="flex-1 rounded-xl bg-primary py-2.5 text-[14px] font-semibold text-primary-foreground transition-colors hover:opacity-90"
          @click="generate">
        닉네임 생성
      </button>
      <button v-if="nickname"
              class="rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] text-foreground/80 transition-colors hover:bg-accent"
              @click="copy">
        {{ copied ? '복사됨!' : '복사' }}
      </button>
    </div>
    <div v-if="history.length > 0" class="flex flex-col gap-1.5">
      <p class="text-[11px] font-medium text-muted-foreground">최근 생성</p>
      <div class="flex flex-wrap gap-1.5">
        <span v-for="(h, i) in history" :key="i"
              class="rounded-full bg-accent px-3 py-1 text-[12px] text-foreground/80">{{ h }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {generateNickname} from '../../utils/randomNickname'

const nickname = ref('')
const history = ref<string[]>([])
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

function generate() {
  const next = generateNickname()
  nickname.value = next
  history.value = [next, ...history.value].slice(0, 8)
  copied.value = false
}

async function copy() {
  await navigator.clipboard.writeText(nickname.value)
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copied.value = false), 2000)
}
</script>

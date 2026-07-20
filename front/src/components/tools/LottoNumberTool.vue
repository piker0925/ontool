<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <p class="text-[12px] text-muted-foreground">1~45 중 중복 없는 번호 6개를 무작위로 뽑습니다.</p>
    <div class="flex items-center justify-center gap-2 flex-wrap py-4">
      <span v-for="(n, i) in numbers" :key="i"
            :class="ballColor(n)"
            class="flex size-11 items-center justify-center rounded-full text-[15px] font-bold text-white shadow-sm">
        {{ n }}
      </span>
      <p v-if="numbers.length === 0" class="text-[12px] text-muted-foreground py-2">생성 버튼을 클릭하세요</p>
    </div>
    <div class="flex gap-2 items-center">
      <button
          class="flex-1 rounded-xl bg-primary py-2.5 text-[14px] font-semibold text-primary-foreground transition-colors hover:opacity-90"
          @click="generate">
        번호 생성
      </button>
      <button v-if="numbers.length > 0"
              class="rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] text-foreground/80 transition-colors hover:bg-accent"
              @click="copy">
        {{ copied ? '복사됨!' : '복사' }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {generateLottoNumbers} from '../../utils/lotto'

const numbers = ref<number[]>([])
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

function generate() {
  numbers.value = generateLottoNumbers()
  copied.value = false
}

function ballColor(n: number): string {
  if (n <= 10) return 'bg-amber-500'
  if (n <= 20) return 'bg-blue-500'
  if (n <= 30) return 'bg-red-500'
  if (n <= 40) return 'bg-slate-500'
  return 'bg-emerald-500'
}

async function copy() {
  await navigator.clipboard.writeText(numbers.value.join(', '))
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copied.value = false), 2000)
}
</script>

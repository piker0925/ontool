<template>
  <div class="flex flex-col gap-5 max-w-lg mx-auto w-full">
    <div class="flex items-start gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zone-accent-fun/10 text-zone-accent-fun">
        <Scale class="size-4.5"/>
      </div>
      <div class="flex flex-col gap-0.5">
        <h2 class="text-[14px] font-semibold text-foreground">밸런스 게임</h2>
        <p class="text-[12px] text-muted-foreground">둘 중 하나만 고를 수 있다면? 양자택일 질문에 답해보세요.</p>
      </div>
    </div>

    <div class="flex items-center justify-between text-[11px] text-muted-foreground">
      <span>{{ round }}번째 질문</span>
      <span>A {{ countA }} · B {{ countB }}</span>
    </div>

    <div v-if="current" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
          :class="choiceClass('a')"
          class="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border-2 p-5 text-center transition-[background-color,border-color,transform] active:scale-[0.99]"
          @click="choose('a')">
        <span class="text-[13px] font-semibold leading-snug">{{ current.a }}</span>
      </button>
      <button
          :class="choiceClass('b')"
          class="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border-2 p-5 text-center transition-[background-color,border-color,transform] active:scale-[0.99]"
          @click="choose('b')">
        <span class="text-[13px] font-semibold leading-snug">{{ current.b }}</span>
      </button>
    </div>

    <p v-if="chosen" class="text-center text-[12px] text-muted-foreground">
      <span class="font-semibold text-zone-accent-fun">{{ chosen === 'a' ? current?.a : current?.b }}</span> 선택!
    </p>

    <button
        class="flex items-center justify-center gap-1.5 rounded-xl bg-zone-accent-fun py-2.5 text-[14px] font-semibold text-white transition-[opacity,scale] hover:opacity-90 active:scale-[0.99]"
        @click="nextQuestion">
      <RefreshCw class="size-4"/>
      다음 질문
    </button>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {RefreshCw, Scale} from 'lucide-vue-next'
import {pickRandomBalanceQuestion, type BalanceQuestion} from '../../utils/balanceGame'

const currentIndex = ref<number | null>(null)
const current = ref<BalanceQuestion | null>(null)
const chosen = ref<'a' | 'b' | null>(null)
const round = ref(0)
const countA = ref(0)
const countB = ref(0)

function choiceClass(side: 'a' | 'b'): string {
  if (!chosen.value) return 'border-border bg-card hover:border-zone-accent-fun/50 hover:bg-accent text-foreground'
  if (chosen.value === side) return 'border-zone-accent-fun bg-zone-accent-fun/10 text-zone-accent-fun'
  return 'border-border bg-card text-muted-foreground/50'
}

function choose(side: 'a' | 'b') {
  if (chosen.value) return
  chosen.value = side
  if (side === 'a') countA.value++
  else countB.value++
}

function nextQuestion() {
  const {index, question} = pickRandomBalanceQuestion(currentIndex.value ?? undefined)
  currentIndex.value = index
  current.value = question
  chosen.value = null
  round.value++
}

nextQuestion()
</script>

<template>
  <div class="flex flex-col gap-5 max-w-lg mx-auto w-full">
    <div class="flex items-start gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zone-accent-fun/10 text-zone-accent-fun">
        <MessageCircleQuestionMark class="size-4.5"/>
      </div>
      <div class="flex flex-col gap-0.5">
        <h2 class="text-[14px] font-semibold text-foreground">아이스브레이킹 질문</h2>
        <p class="text-[12px] text-muted-foreground">모임·MT·워크샵에서 쓸 자기소개·스몰토크 질문을 무작위로 뽑아보세요.</p>
      </div>
    </div>

    <TransitionGroup name="pop-in" tag="div">
      <div v-if="question" :key="questionIndex ?? 0"
           class="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
        <span class="rounded-full bg-zone-accent-fun/10 px-2.5 py-1 text-[11px] font-medium text-zone-accent-fun">Q{{ round }}</span>
        <p class="text-[16px] font-semibold leading-relaxed text-foreground">{{ question }}</p>
      </div>
    </TransitionGroup>

    <div class="flex gap-2">
      <button
          class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-zone-accent-fun py-2.5 text-[14px] font-semibold text-white transition-[opacity,scale] hover:opacity-90 active:scale-[0.99]"
          @click="draw">
        <RefreshCw class="size-4"/>
        다음 질문
      </button>
      <button v-if="question"
              class="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-accent"
              @click="copy">
        {{ copied ? '복사됨!' : '복사' }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {onBeforeUnmount, ref} from 'vue'
import {MessageCircleQuestionMark, RefreshCw} from 'lucide-vue-next'
import {pickRandomIcebreakerQuestion} from '../../utils/icebreakerQuestions'

const questionIndex = ref<number | null>(null)
const question = ref<string | null>(null)
const round = ref(0)
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

function draw() {
  const {index, question: q} = pickRandomIcebreakerQuestion(questionIndex.value ?? undefined)
  questionIndex.value = index
  question.value = q
  round.value++
  copied.value = false
}

async function copy() {
  if (!question.value) return
  await navigator.clipboard.writeText(question.value)
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copied.value = false), 2000)
}

draw()

onBeforeUnmount(() => clearTimeout(copyTimer))
</script>

<style scoped>
.pop-in-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.pop-in-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
</style>

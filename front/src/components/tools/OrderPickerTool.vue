<template>
  <div class="flex flex-col gap-5 max-w-lg mx-auto w-full">
    <div class="flex items-start gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zone-accent-fun/10 text-zone-accent-fun">
        <ListOrdered class="size-4.5"/>
      </div>
      <div class="flex flex-col gap-0.5">
        <h2 class="text-[14px] font-semibold text-foreground">순서 정하기</h2>
        <p class="text-[12px] text-muted-foreground">참가자를 입력하면 전원의 순서를 한 번에 무작위로 정합니다.</p>
      </div>
    </div>

    <!-- 참가자 입력 (칩 방식) -->
    <div class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div class="flex items-center justify-between">
        <label class="text-[11px] font-medium text-muted-foreground">참가자</label>
        <div class="flex items-center gap-2">
          <span class="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{{ participants.length }}명</span>
          <button v-if="participants.length > 0"
                  class="text-[11px] text-muted-foreground/70 transition-colors hover:text-destructive"
                  @click="clearParticipants">전체 삭제
          </button>
        </div>
      </div>

      <div v-if="participants.length > 0" class="flex flex-wrap gap-1.5">
        <span v-for="(name, i) in participants" :key="`${i}-${name}`"
              class="group flex items-center gap-1 rounded-full bg-accent py-1 pl-2.5 pr-1 text-[12px] font-medium text-foreground/80">
          {{ name }}
          <button class="rounded-full p-0.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  :title="`${name} 삭제`" @click="removeParticipant(i)">
            <X class="size-3"/>
          </button>
        </span>
      </div>

      <div class="flex items-center gap-2">
        <input v-model="pendingInput"
               class="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-zone-accent-fun focus:ring-2 focus:ring-zone-accent-fun/20"
               placeholder="이름 입력 후 Enter (쉼표로 여러 명 붙여넣기 가능)"
               @keydown="onPendingKeydown"
               @paste="onPendingPaste"/>
        <button
            class="flex items-center justify-center gap-1 rounded-lg bg-zone-accent-fun px-3 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 dark:text-background"
            :disabled="!pendingInput.trim()"
            @click="commitPending">
          <Plus class="size-3.5"/>
          추가
        </button>
      </div>
      <button v-if="participants.length === 0"
              class="flex w-fit items-center gap-1 text-[11px] text-zone-accent-fun transition-colors hover:opacity-80"
              @click="fillSample">
        <Wand2 class="size-3"/>
        예시로 채워보기
      </button>
    </div>

    <button
        :disabled="participants.length < 2"
        class="flex items-center justify-center gap-1.5 rounded-xl bg-zone-accent-fun py-2.5 text-[14px] font-semibold text-white transition-[opacity,scale] hover:opacity-90 active:scale-[0.99] disabled:opacity-40 dark:text-background"
        @click="draw">
      <Shuffle class="size-4"/>
      순서 정하기
    </button>

    <div v-if="order.length === 0" class="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border py-10 text-center">
      <div class="flex size-10 items-center justify-center rounded-full bg-muted">
        <ListOrdered class="size-4 text-muted-foreground/50"/>
      </div>
      <p class="text-[12px] text-muted-foreground">참가자를 2명 이상 입력하고 순서 정하기를 눌러보세요</p>
    </div>
    <TransitionGroup v-else class="flex flex-col gap-1.5" name="pop-in" tag="ol">
      <li v-for="(name, i) in order" :key="name + i"
          class="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
        <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-zone-accent-fun/10 text-[12px] font-bold text-zone-accent-fun">{{ i + 1 }}</span>
        <span class="text-[13px] font-medium text-foreground">{{ name }}</span>
      </li>
    </TransitionGroup>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {ListOrdered, Plus, Shuffle, Wand2, X} from 'lucide-vue-next'
import {generateRandomOrder} from '../../utils/orderPicker'

const participants = ref<string[]>([])
const pendingInput = ref('')
const order = ref<string[]>([])

function addParticipants(raw: string) {
  const names = raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
  participants.value.push(...names)
}

function commitPending() {
  if (!pendingInput.value.trim()) return
  addParticipants(pendingInput.value)
  pendingInput.value = ''
}

function onPendingKeydown(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    commitPending()
    return
  }
  if (e.key === 'Backspace' && pendingInput.value === '' && participants.value.length > 0) {
    participants.value.pop()
  }
}

function onPendingPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') ?? ''
  if (/[\n,]/.test(text)) {
    e.preventDefault()
    addParticipants(text)
  }
}

function removeParticipant(i: number) {
  participants.value.splice(i, 1)
  order.value = []
}

function clearParticipants() {
  participants.value = []
  order.value = []
}

function fillSample() {
  participants.value = ['철수', '영희', '민수', '지훈', '수아']
}

function draw() {
  order.value = generateRandomOrder(participants.value)
}
</script>

<style scoped>
.pop-in-move,
.pop-in-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.pop-in-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
</style>

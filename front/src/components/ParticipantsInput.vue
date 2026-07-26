<template>
  <div class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
    <div class="flex items-center justify-between">
      <label class="text-[12px] font-medium text-muted-foreground">참가자</label>
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
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {Plus, Wand2, X} from 'lucide-vue-next'

// 팀 나누기와 사다리타기가 공유하는 참가자 입력 UI. 두 도구 모두 "이름 칩 입력" 방식이
// 동일해서 (Enter/쉼표 커밋, 붙여넣기 분리, IME 조합 가드, Backspace 삭제) 컴포넌트로
// 추출했다 — 로직만 공유하는 composable로는 템플릿(칩 목록·삭제 버튼)까지는 공유되지 않는다.
const participants = defineModel<string[]>({required: true})
const pendingInput = ref('')

const SAMPLE_PARTICIPANTS = ['철수', '영희', '민수', '지훈', '수아', '예린']

function addParticipants(raw: string) {
  const names = raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
  if (names.length === 0) return
  participants.value = [...participants.value, ...names]
}

function commitPending() {
  if (!pendingInput.value.trim()) return
  addParticipants(pendingInput.value)
  pendingInput.value = ''
}

function onPendingKeydown(e: KeyboardEvent) {
  // 한글 등 IME 조합 중에 뜨는 Enter(조합 확정용)를 커밋으로 오인하지 않도록 건너뛴다.
  // 그대로 두면 여러 음절 이름을 다 치기 전 상태로 한 번, 조합이 끝난 뒤 완성된 상태로 또 한 번
  // 커밋되어 칩이 중복 생성된다. keyCode 229는 구형 Safari용 폴백.
  if (e.isComposing || e.keyCode === 229) return
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    commitPending()
    return
  }
  if (e.key === 'Backspace' && pendingInput.value === '' && participants.value.length > 0) {
    participants.value = participants.value.slice(0, -1)
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
  participants.value = participants.value.filter((_, idx) => idx !== i)
}

function clearParticipants() {
  participants.value = []
}

function fillSample() {
  participants.value = [...SAMPLE_PARTICIPANTS]
}
</script>

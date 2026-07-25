<template>
  <div class="flex flex-col gap-5 max-w-lg mx-auto w-full">
    <div class="flex items-start gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zone-accent-fun/10 text-zone-accent-fun">
        <CircleDot class="size-4.5"/>
      </div>
      <div class="flex flex-col gap-0.5">
        <h2 class="text-[14px] font-semibold text-foreground">핀볼 추첨기</h2>
        <p class="text-[12px] text-muted-foreground">항목을 입력하면 구슬이 핀에 부딪히며 떨어져 하나를 무작위로 뽑습니다.</p>
      </div>
    </div>

    <!-- 항목 입력 (칩 방식) -->
    <div class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div class="flex items-center justify-between">
        <label class="text-[11px] font-medium text-muted-foreground">항목 (슬롯 순서대로 왼쪽부터 배치됩니다)</label>
        <div class="flex items-center gap-2">
          <span class="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{{ items.length }}개</span>
          <button v-if="items.length > 0"
                  class="text-[11px] text-muted-foreground/70 transition-colors hover:text-destructive"
                  @click="clearItems">전체 삭제
          </button>
        </div>
      </div>

      <div v-if="items.length > 0" class="flex flex-wrap gap-1.5">
        <span v-for="(item, i) in items" :key="`${i}-${item}`"
              class="group flex items-center gap-1 rounded-full bg-accent py-1 pl-2.5 pr-1 text-[12px] font-medium text-foreground/80">
          {{ item }}
          <button class="rounded-full p-0.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  :title="`${item} 삭제`" @click="removeItem(i)">
            <X class="size-3"/>
          </button>
        </span>
      </div>

      <div class="flex items-center gap-2">
        <input v-model="pendingInput"
               class="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-zone-accent-fun focus:ring-2 focus:ring-zone-accent-fun/20"
               placeholder="항목 입력 후 Enter (쉼표로 여러 개 붙여넣기 가능)"
               @keydown="onPendingKeydown"
               @paste="onPendingPaste"/>
        <button
            class="flex items-center justify-center gap-1 rounded-lg bg-zone-accent-fun px-3 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            :disabled="!pendingInput.trim()"
            @click="commitPending">
          <Plus class="size-3.5"/>
          추가
        </button>
      </div>
      <button v-if="items.length === 0"
              class="flex w-fit items-center gap-1 text-[11px] text-zone-accent-fun transition-colors hover:opacity-80"
              @click="fillSample">
        <Wand2 class="size-3"/>
        예시로 채워보기
      </button>
    </div>

    <div v-if="items.length < 2" class="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border py-10 text-center">
      <CircleDot class="size-6 text-muted-foreground/40"/>
      <p class="px-6 text-[12px] text-muted-foreground">항목을 2개 이상 입력하세요</p>
    </div>

    <template v-else>
      <div class="relative mx-auto overflow-hidden rounded-xl border border-border bg-card"
           :style="{ width: `${BOARD_WIDTH}px`, height: `${BOARD_HEIGHT}px` }">
        <div v-for="row in rowCount" :key="`peg-${row}`"
             class="absolute left-0 flex w-full justify-between px-3"
             :style="{ top: `${((row - 1) / rowCount) * BOARD_HEIGHT}px` }">
          <span v-for="p in row + 1" :key="p" class="size-1.5 rounded-full bg-border"/>
        </div>
        <div class="ball bg-zone-accent-fun" :style="ballStyle"/>
      </div>

      <div class="mx-auto flex" :style="{ width: `${BOARD_WIDTH}px` }">
        <div v-for="(item, i) in items" :key="`${i}-${item}`"
             :class="showResult && dropResult?.finalSlot === i ? 'font-bold text-zone-accent-fun' : 'text-muted-foreground'"
             class="flex-1 truncate px-1 text-center text-[11px] transition-colors">
          {{ item }}
        </div>
      </div>

      <button
          :disabled="dropping"
          class="flex items-center justify-center gap-1.5 rounded-xl bg-zone-accent-fun py-2.5 text-[14px] font-semibold text-white transition-[opacity,scale] hover:opacity-90 active:scale-[0.99] disabled:opacity-40"
          @click="drop">
        <CircleDot class="size-4" :class="{ 'animate-bounce': dropping }"/>
        {{ dropping ? '떨어지는 중…' : '구슬 낙하 시작' }}
      </button>

      <div v-if="showResult && dropResult" class="flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-6 py-3 text-center">
        <p class="text-[11px] text-muted-foreground">당첨 결과</p>
        <p class="text-[18px] font-bold text-zone-accent-fun">{{ items[dropResult.finalSlot] }}</p>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {computed, onBeforeUnmount, ref} from 'vue'
import {CircleDot, Plus, Wand2, X} from 'lucide-vue-next'
import {simulatePinballDrop, type PinballResult} from '../../utils/pinballDrop'

const BOARD_WIDTH = 260
const BOARD_HEIGHT = 220
const STEP_MS = 220

const items = ref<string[]>([])
const pendingInput = ref('')
const dropping = ref(false)
const showResult = ref(false)
const dropResult = ref<PinballResult | null>(null)
const revealedSteps = ref(0)
let stepTimer: ReturnType<typeof setInterval> | undefined

const rowCount = computed(() => Math.max(1, items.value.length - 1))

function addItems(raw: string) {
  const names = raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
  items.value.push(...names)
}

function commitPending() {
  if (!pendingInput.value.trim()) return
  addItems(pendingInput.value)
  pendingInput.value = ''
}

function onPendingKeydown(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    commitPending()
    return
  }
  if (e.key === 'Backspace' && pendingInput.value === '' && items.value.length > 0) {
    items.value.pop()
  }
}

function onPendingPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') ?? ''
  if (/[\n,]/.test(text)) {
    e.preventDefault()
    addItems(text)
  }
}

function removeItem(i: number) {
  items.value.splice(i, 1)
  showResult.value = false
}

function clearItems() {
  items.value = []
  showResult.value = false
}

function fillSample() {
  items.value = ['1등', '2등', '3등', '4등', '꽝']
}

function drop() {
  if (dropping.value || items.value.length < 2) return

  const result = simulatePinballDrop(rowCount.value)
  dropResult.value = result
  dropping.value = true
  showResult.value = false
  revealedSteps.value = 0

  clearInterval(stepTimer)
  stepTimer = setInterval(() => {
    revealedSteps.value++
    if (revealedSteps.value >= result.path.length) {
      clearInterval(stepTimer)
      dropping.value = false
      showResult.value = true
    }
  }, STEP_MS)
}

const ballStyle = computed(() => {
  const slotSpacing = BOARD_WIDTH / rowCount.value
  let rightCount = 0
  if (dropResult.value) {
    for (let i = 0; i < revealedSteps.value; i++) {
      if (dropResult.value.path[i].direction === 'right') rightCount++
    }
  }
  const x = rightCount * slotSpacing
  const y = (revealedSteps.value / rowCount.value) * (BOARD_HEIGHT - 16)
  return {
    left: `${x}px`,
    top: `${y}px`,
  }
})

onBeforeUnmount(() => clearInterval(stepTimer))
</script>

<style scoped>
.ball {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transition: left 0.2s ease, top 0.2s ease;
}
</style>

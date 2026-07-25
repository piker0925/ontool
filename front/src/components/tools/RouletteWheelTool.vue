<template>
  <div class="flex flex-col gap-5 max-w-lg mx-auto w-full">
    <div class="flex items-start gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zone-accent-fun/10 text-zone-accent-fun">
        <Target class="size-4.5"/>
      </div>
      <div class="flex flex-col gap-0.5">
        <h2 class="text-[14px] font-semibold text-foreground">룰렛 돌림판</h2>
        <p class="text-[12px] text-muted-foreground">항목을 입력하고 돌림판을 돌려 하나를 무작위로 뽑으세요.</p>
      </div>
    </div>

    <!-- 항목 입력 (칩 방식) -->
    <div class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div class="flex items-center justify-between">
        <label class="text-[12px] font-medium text-muted-foreground">항목</label>
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

    <!-- 돌림판 -->
    <div class="flex flex-col items-center gap-4">
      <div class="relative" :style="{ width: `${WHEEL_SIZE}px`, height: `${WHEEL_SIZE}px` }">
        <div class="absolute -top-1 left-1/2 z-10 -translate-x-1/2 text-zone-accent-fun">
          <svg height="18" viewBox="0 0 20 18" width="20">
            <path d="M10 18 L0 0 L20 0 Z" fill="currentColor"/>
          </svg>
        </div>
        <div v-if="items.length < 2"
             class="flex size-full flex-col items-center justify-center gap-2 rounded-full border-2 border-dashed border-border text-center">
          <Target class="size-6 text-muted-foreground/40"/>
          <p class="px-6 text-[11px] text-muted-foreground">항목을 2개 이상 입력하세요</p>
        </div>
        <div v-else class="wheel size-full rounded-full border-4 border-card shadow-inner"
             :style="{ transform: `rotate(${rotationDeg}deg)`, background: wheelGradient }">
          <span v-for="(item, i) in items" :key="`${i}-${item}`" class="wheel-label" :style="labelStyle(i)">
            {{ item }}
          </span>
        </div>
      </div>

      <button
          :disabled="items.length < 2 || spinning"
          class="flex items-center justify-center gap-1.5 rounded-xl bg-zone-accent-fun px-6 py-2.5 text-[14px] font-semibold text-white transition-[opacity,scale] hover:opacity-90 active:scale-[0.99] disabled:opacity-40"
          @click="spin">
        <RotateCw class="size-4" :class="{ 'animate-spin': spinning }"/>
        {{ spinning ? '돌아가는 중…' : '돌림판 돌리기' }}
      </button>

      <div v-if="resultItem !== null" class="flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-6 py-3 text-center">
        <p class="text-[11px] text-muted-foreground">당첨 결과</p>
        <p class="text-[18px] font-bold text-zone-accent-fun">{{ resultItem }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onBeforeUnmount, ref} from 'vue'
import {Plus, RotateCw, Target, Wand2, X} from 'lucide-vue-next'
import {computeSpinRotationDeg, pickRouletteWinner} from '../../utils/roulettePicker'

const WHEEL_SIZE = 260
const LABEL_RADIUS = 95
const EXTRA_SPINS = 6
const SPIN_DURATION_MS = 4000

const WEDGE_COLORS = [
  '#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed',
  '#6d28d9', '#a855f7', '#d8b4fe', '#5b21b6',
]

const items = ref<string[]>([])
const pendingInput = ref('')
const rotationDeg = ref(0)
const spinning = ref(false)
const resultItem = ref<string | null>(null)
let spinTimer: ReturnType<typeof setTimeout> | undefined

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
  resultItem.value = null
}

function clearItems() {
  items.value = []
  resultItem.value = null
}

function fillSample() {
  items.value = ['짜장면', '짬뽕', '탕수육', '볶음밥']
}

const wheelGradient = computed(() => {
  const n = items.value.length
  if (n === 0) return undefined
  const sliceDeg = 360 / n
  const stops = items.value.map((_, i) => {
    const color = WEDGE_COLORS[i % WEDGE_COLORS.length]
    return `${color} ${i * sliceDeg}deg ${(i + 1) * sliceDeg}deg`
  })
  return `conic-gradient(from 0deg, ${stops.join(', ')})`
})

function labelStyle(i: number): Record<string, string> {
  const n = items.value.length
  const sliceDeg = 360 / n
  const centerDeg = i * sliceDeg + sliceDeg / 2
  const rad = (centerDeg * Math.PI) / 180
  const cx = WHEEL_SIZE / 2
  const cy = WHEEL_SIZE / 2
  const x = cx + LABEL_RADIUS * Math.sin(rad)
  const y = cy - LABEL_RADIUS * Math.cos(rad)
  return {
    left: `${x}px`,
    top: `${y}px`,
    transform: `translate(-50%, -50%) rotate(${centerDeg}deg)`,
  }
}

function spin() {
  if (spinning.value || items.value.length < 2) return

  const winnerIdx = pickRouletteWinner(items.value)
  const targetMod = ((computeSpinRotationDeg(winnerIdx, items.value.length, 0) % 360) + 360) % 360
  const currentMod = ((rotationDeg.value % 360) + 360) % 360
  let delta = targetMod - currentMod
  if (delta <= 0) delta += 360

  rotationDeg.value += delta + EXTRA_SPINS * 360
  spinning.value = true
  resultItem.value = null

  clearTimeout(spinTimer)
  spinTimer = setTimeout(() => {
    spinning.value = false
    resultItem.value = items.value[winnerIdx]
  }, SPIN_DURATION_MS)
}

onBeforeUnmount(() => clearTimeout(spinTimer))
</script>

<style scoped>
.wheel {
  position: relative;
  transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
}

.wheel-label {
  position: absolute;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}
</style>

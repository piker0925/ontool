<template>
  <div class="flex flex-col gap-5 max-w-2xl mx-auto w-full">
    <!-- 헤더 -->
    <div class="flex items-start gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zone-accent-fun/10 text-zone-accent-fun">
        <Rows3 class="size-4.5"/>
      </div>
      <div class="flex flex-col gap-0.5">
        <h2 class="text-[14px] font-semibold text-foreground">사다리타기</h2>
        <p class="text-[12px] text-muted-foreground">참가자를 입력하고 사다리를 타고 당첨을 확인하세요.</p>
      </div>
    </div>

    <ParticipantsInput v-model="participants"/>

    <div class="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div class="flex items-center gap-1 rounded-lg bg-muted p-1">
        <button v-for="m in (['ox', 'custom'] as const)" :key="m"
                :class="outcomeMode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                class="flex-1 rounded-md py-1.5 text-[12px] font-medium transition-[background-color,color,box-shadow]"
                @click="outcomeMode = m">{{ m === 'ox' ? 'O/X 당첨' : '직접 입력' }}
        </button>
      </div>

      <div v-if="outcomeMode === 'ox'" class="flex flex-wrap items-center gap-1.5">
        <span class="mr-1 text-[11px] font-medium text-muted-foreground">당첨 인원 수</span>
        <button v-for="n in winnerCountOptions" :key="n"
                :class="winnerCount === n ? 'bg-zone-accent-fun text-white dark:text-background' : 'bg-muted text-muted-foreground hover:text-foreground'"
                class="size-7 rounded-full text-[12px] font-medium transition-colors"
                @click="winnerCount = n">{{ n }}
        </button>
        <input v-model.number="winnerCount"
               class="w-16 rounded-lg border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-zone-accent-fun"
               min="1" type="number"/>
      </div>

      <div v-else class="flex flex-col gap-1.5">
        <label class="text-[12px] font-medium text-muted-foreground">당첨 항목 (참가자 수만큼 입력해야 항목명이 그대로 표시됩니다)</label>
        <textarea v-model="outcomesInput"
                  class="min-h-16 resize-y rounded-lg border border-border bg-background p-3 text-[13px] text-foreground outline-none transition-colors focus:border-zone-accent-fun focus:ring-2 focus:ring-zone-accent-fun/20"
                  placeholder="커피 쏘기, 청소당번, 지각비 면제..."/>
        <p v-if="outcomesMismatch" class="text-[11px] text-amber-500">
          입력한 항목 수({{ outcomesCount }}개)가 참가자 수({{ participants.length }}명)와 달라 O/X로 표시됩니다.
        </p>
      </div>
    </div>

    <div class="flex gap-2">
      <button
          :disabled="participants.length < 2"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-zone-accent-fun py-2.5 text-[14px] font-semibold text-white transition-[opacity,scale] hover:opacity-90 active:scale-[0.99] disabled:opacity-40 dark:text-background"
          @click="doLadder">
        <Rows3 class="size-4"/>
        사다리 타기
      </button>
      <button v-if="rungs.length > 0"
              class="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-accent"
              title="사다리를 다시 섞습니다"
              @click="doLadder">
        <RotateCw class="size-3.5"/>
      </button>
    </div>

    <div v-if="ladderResult.length === 0" class="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border py-10 text-center">
      <div class="flex size-10 items-center justify-center rounded-full bg-muted">
        <Rows3 class="size-4 text-muted-foreground/50"/>
      </div>
      <p class="text-[12px] text-muted-foreground">참가자를 2명 이상 입력하고 사다리 타기를 눌러보세요</p>
    </div>

    <div v-else class="flex flex-col gap-3">
      <p class="text-center text-[11px] text-muted-foreground">이름을 눌러 결과를 확인하세요</p>
      <div class="overflow-x-auto rounded-xl border border-border bg-card p-4">
        <div :style="{ width: `${svgWidth}px` }" class="flex">
          <button v-for="(name, i) in participants" :key="i"
                  :style="{ width: `${colGap}px` }"
                  :class="selectedStart === i ? 'bg-zone-accent-fun text-white shadow-sm dark:text-background' : 'bg-accent text-foreground/80 hover:opacity-80'"
                  class="shrink-0 truncate rounded-full px-1 py-1 text-[11px] font-medium transition-[background-color,color,box-shadow,opacity,translate] hover:-translate-y-0.5"
                  @click="selectPath(i)">
            {{ name }}
          </button>
        </div>

        <svg :height="svgHeight" :viewBox="`0 0 ${svgWidth} ${svgHeight}`" :width="svgWidth" class="text-zone-accent-fun">
          <line v-for="(_, col) in participants" :key="`v-${col}`"
                :x1="colX(col)" :x2="colX(col)" :y1="svgPad" :y2="rows * rowHeight + svgPad"
                class="stroke-border" stroke-linecap="round" stroke-width="2"/>
          <line v-for="(rung, i) in rungs" :key="`r-${i}`"
                :x1="colX(rung.leftIndex)" :x2="colX(rung.leftIndex + 1)"
                :y1="rowY(rung.row)" :y2="rowY(rung.row)"
                class="stroke-border" stroke-linecap="round" stroke-width="2"/>
          <polyline v-if="highlightPoints" :key="`path-${animationKey}`" :points="highlightPoints"
                    class="ladder-highlight" fill="none" stroke="currentColor" stroke-linecap="round"
                    stroke-width="3"/>
        </svg>

        <div :style="{ width: `${svgWidth}px` }" class="flex">
          <span v-for="(label, i) in outcomeLabels" :key="i"
                :style="{ width: `${colGap}px` }"
                :class="selectedEnd === i
                    ? 'bg-zone-accent-fun/15 text-zone-accent-fun font-bold'
                    : (outcomeMode === 'ox' ? (label === 'O' ? 'text-emerald-500 font-semibold' : 'text-muted-foreground') : 'text-muted-foreground')"
                class="shrink-0 truncate rounded-full px-1 py-1 text-center text-[12px] transition-colors">
            {{ label }}
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <div v-for="(end, start) in ladderResult" :key="start"
             :class="selectedStart === start ? 'bg-zone-accent-fun/10' : ''"
             class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors"
             data-testid="ladder-result-row">
          <span class="font-medium text-foreground">{{ participants[start] }}</span>
          <ArrowRight class="size-3 shrink-0 text-muted-foreground/50"/>
          <span :class="outcomeMode === 'ox' && outcomeLabels[end] === 'O' ? 'font-semibold text-emerald-500' : 'text-foreground/80'"
                data-testid="ladder-result-outcome">
            {{ outcomeLabels[end] }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {ArrowRight, RotateCw, Rows3} from 'lucide-vue-next'
import ParticipantsInput from '../ParticipantsInput.vue'
import {
  generateLadderRungs,
  groupRungsByRow,
  pickWinnerColumns,
  resolveOutcomeLabels,
  traceLadderPath,
  traceLadderPaths,
  type LadderRung,
} from '../../utils/teamSplit'

const participants = ref<string[]>([])

const rows = 10
const rowHeight = 28
const colGap = 56
const svgPad = 3
const svgHeight = rows * rowHeight + svgPad * 2

const rungs = ref<LadderRung[]>([])
const ladderResult = ref<number[]>([])
const selectedStart = ref<number | null>(null)
const animationKey = ref(0)

const outcomeMode = ref<'ox' | 'custom'>('ox')
const winnerCount = ref(1)
const winnerCountOptions = computed(() => {
  const max = Math.max(1, Math.min(5, participants.value.length || 1))
  return Array.from({length: max}, (_, i) => i + 1)
})
const winnerColumns = ref<Set<number>>(new Set())

const outcomesInput = ref('')
const parsedOutcomes = computed(() =>
    outcomesInput.value.split(/[\n,]/).map(s => s.trim()).filter(Boolean),
)
const outcomesCount = computed(() => parsedOutcomes.value.length)
const outcomesMismatch = computed(() => outcomesCount.value > 0 && outcomesCount.value !== participants.value.length)

const outcomeLabels = computed(() => {
  if (outcomeMode.value === 'custom' && outcomesCount.value === participants.value.length && participants.value.length > 0) {
    return resolveOutcomeLabels(parsedOutcomes.value, participants.value.length)
  }
  return Array.from({length: participants.value.length}, (_, i) => winnerColumns.value.has(i) ? 'O' : 'X')
})

const svgWidth = computed(() => Math.max(colGap, participants.value.length * colGap))

function colX(col: number): number {
  return colGap / 2 + col * colGap
}

function rowY(row: number): number {
  return row * rowHeight + rowHeight / 2 + svgPad
}

function doLadder() {
  const n = participants.value.length
  rungs.value = generateLadderRungs(n, rows)
  ladderResult.value = traceLadderPaths(n, rungs.value, rows)
  const requestedWinners = outcomeMode.value === 'ox' ? winnerCount.value : 1
  winnerColumns.value = pickWinnerColumns(n, requestedWinners)
  selectedStart.value = null
}

function selectPath(start: number) {
  selectedStart.value = start
  animationKey.value++
}

const selectedEnd = computed(() =>
    selectedStart.value !== null ? ladderResult.value[selectedStart.value] : null,
)

const highlightPoints = computed(() => {
  if (selectedStart.value === null) return ''
  const rungsByRow = groupRungsByRow(rungs.value)
  const {crossings, end} = traceLadderPath(selectedStart.value, rungsByRow, rows)

  const points: string[] = [`${colX(selectedStart.value)},${svgPad}`]
  for (const c of crossings) {
    points.push(`${colX(c.fromCol)},${rowY(c.row)}`)
    points.push(`${colX(c.toCol)},${rowY(c.row)}`)
  }
  points.push(`${colX(end)},${rows * rowHeight + svgPad}`)
  return points.join(' ')
})
</script>

<style scoped>
.ladder-highlight {
  stroke-dasharray: 2000;
  stroke-dashoffset: 2000;
  animation: draw-ladder-path 0.7s ease-out forwards;
}

@keyframes draw-ladder-path {
  to {
    stroke-dashoffset: 0;
  }
}
</style>

<template>
  <div class="flex flex-col gap-4 max-w-2xl mx-auto w-full">
    <div class="flex items-center gap-2">
      <div class="flex rounded-lg border border-border overflow-hidden">
        <button v-for="m in (['team', 'ladder'] as const)" :key="m"
                :class="mode === m ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'"
                class="px-3 py-1 text-[12px] font-medium transition-colors"
                @click="mode = m">{{ m === 'team' ? '팀 나누기' : '사다리타기' }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-[11px] font-medium text-muted-foreground">참가자 (줄바꿈 또는 쉼표로 구분)</label>
      <textarea v-model="participantsInput"
                class="min-h-24 rounded-xl border border-border bg-card p-3 text-[13px] text-foreground outline-none focus:border-ring resize-y"
                placeholder="철수, 영희, 민수..."/>
      <p class="text-[11px] text-muted-foreground">{{ participants.length }}명</p>
    </div>

    <template v-if="mode === 'team'">
      <div class="flex items-center gap-2">
        <label class="text-[11px] font-medium text-muted-foreground">팀 수</label>
        <input v-model.number="teamCount"
               class="w-16 rounded-lg border border-border bg-card px-2 py-1 text-[12px] text-foreground outline-none focus:border-ring"
               min="1" type="number"/>
      </div>
      <button
          :disabled="participants.length === 0 || teamCount < 1"
          class="rounded-xl bg-primary py-2.5 text-[14px] font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-40"
          @click="doSplit">
        팀 나누기
      </button>
      <div v-if="teams.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div v-for="(team, i) in teams" :key="i" class="rounded-xl border border-border bg-card p-3">
          <p class="text-[12px] font-semibold text-foreground mb-1.5">팀 {{ i + 1 }} ({{ team.length }}명)</p>
          <ul class="flex flex-col gap-1">
            <li v-for="(name, j) in team" :key="j" class="text-[13px] text-foreground/80">{{ name }}</li>
          </ul>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="flex flex-col gap-1.5">
        <label class="text-[11px] font-medium text-muted-foreground">당첨 항목 (선택 — 참가자 수만큼 입력하면 번호 대신 항목명이 표시됩니다)</label>
        <textarea v-model="outcomesInput"
                  class="min-h-16 rounded-xl border border-border bg-card p-3 text-[13px] text-foreground outline-none focus:border-ring resize-y"
                  placeholder="커피 쏘기, 청소당번, 지각비 면제..."/>
        <p v-if="outcomesMismatch" class="text-[11px] text-amber-500">
          입력한 항목 수({{ outcomesCount }}개)가 참가자 수({{ participants.length }}명)와 달라 번호로 표시됩니다.
        </p>
      </div>
      <button
          :disabled="participants.length < 2"
          class="rounded-xl bg-primary py-2.5 text-[14px] font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-40"
          @click="doLadder">
        사다리 타기
      </button>

      <div v-if="ladderResult.length > 0" class="flex flex-col gap-3">
        <div class="overflow-x-auto">
          <div :style="{ width: `${svgWidth}px` }" class="flex">
            <button v-for="(name, i) in participants" :key="i"
                    :style="{ width: `${colGap}px` }"
                    :class="selectedStart === i ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground/80 hover:opacity-80'"
                    class="shrink-0 rounded-full px-1 py-1 text-[11px] font-medium transition-colors truncate"
                    @click="selectPath(i)">
              {{ name }}
            </button>
          </div>

          <svg :height="rows * rowHeight" :viewBox="`0 0 ${svgWidth} ${rows * rowHeight}`" :width="svgWidth"
               class="text-primary">
            <line v-for="(_, col) in participants" :key="`v-${col}`"
                  :x1="colX(col)" :x2="colX(col)" :y1="0" :y2="rows * rowHeight"
                  class="stroke-border" stroke-width="2"/>
            <line v-for="(rung, i) in rungs" :key="`r-${i}`"
                  :x1="colX(rung.leftIndex)" :x2="colX(rung.leftIndex + 1)"
                  :y1="rowY(rung.row)" :y2="rowY(rung.row)"
                  class="stroke-border" stroke-width="2"/>
            <polyline v-if="highlightPoints" :key="`path-${animationKey}`" :points="highlightPoints"
                      class="ladder-highlight" fill="none" stroke="currentColor" stroke-linecap="round"
                      stroke-width="3"/>
          </svg>
        </div>

        <div class="flex flex-col gap-1">
          <p v-for="(end, start) in ladderResult" :key="start" class="text-[13px] text-foreground/80">
            {{ participants[start] }} → {{ outcomeLabels[end] }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {
  generateLadderRungs,
  groupRungsByRow,
  resolveOutcomeLabels,
  splitIntoTeams,
  traceLadderPath,
  traceLadderPaths,
  type LadderRung,
} from '../../utils/teamSplit'

const mode = ref<'team' | 'ladder'>('team')
const participantsInput = ref('')
const teamCount = ref(2)

const participants = computed(() =>
    participantsInput.value.split(/[\n,]/).map(s => s.trim()).filter(Boolean),
)

const teams = ref<string[][]>([])

function doSplit() {
  teams.value = splitIntoTeams(participants.value, teamCount.value)
}

const rows = 10
const rowHeight = 28
const colGap = 56
const rungs = ref<LadderRung[]>([])
const ladderResult = ref<number[]>([])
const selectedStart = ref<number | null>(null)
const animationKey = ref(0)
const outcomesInput = ref('')

const parsedOutcomes = computed(() =>
    outcomesInput.value.split(/[\n,]/).map(s => s.trim()).filter(Boolean),
)
const outcomesCount = computed(() => parsedOutcomes.value.length)
const outcomesMismatch = computed(() => outcomesCount.value > 0 && outcomesCount.value !== participants.value.length)
const outcomeLabels = computed(() => resolveOutcomeLabels(parsedOutcomes.value, participants.value.length))

const svgWidth = computed(() => Math.max(colGap, participants.value.length * colGap))

function colX(col: number): number {
  return colGap / 2 + col * colGap
}

function rowY(row: number): number {
  return row * rowHeight + rowHeight / 2
}

function doLadder() {
  rungs.value = generateLadderRungs(participants.value.length, rows)
  ladderResult.value = traceLadderPaths(participants.value.length, rungs.value, rows)
  selectedStart.value = null
}

function selectPath(start: number) {
  selectedStart.value = start
  animationKey.value++
}

const highlightPoints = computed(() => {
  if (selectedStart.value === null) return ''
  const rungsByRow = groupRungsByRow(rungs.value)
  const {crossings, end} = traceLadderPath(selectedStart.value, rungsByRow, rows)

  const points: string[] = [`${colX(selectedStart.value)},0`]
  for (const c of crossings) {
    points.push(`${colX(c.fromCol)},${rowY(c.row)}`)
    points.push(`${colX(c.toCol)},${rowY(c.row)}`)
  }
  points.push(`${colX(end)},${rows * rowHeight}`)
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

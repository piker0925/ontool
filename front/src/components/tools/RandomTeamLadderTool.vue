<template>
  <div class="flex flex-col gap-5 max-w-2xl mx-auto w-full">
    <!-- 헤더 -->
    <div class="flex items-start gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zone-accent-fun/10 text-zone-accent-fun">
        <Dices class="size-4.5"/>
      </div>
      <div class="flex flex-col gap-0.5">
        <h2 class="text-[14px] font-semibold text-foreground">팀 나누기 · 사다리타기</h2>
        <p class="text-[12px] text-muted-foreground">참가자를 입력하고 무작위로 팀을 나누거나, 사다리를 타고 당첨을 확인하세요.</p>
      </div>
    </div>

    <!-- 모드 전환 -->
    <div class="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
      <button
          :class="mode === 'team' ? 'bg-zone-accent-fun text-white shadow-sm dark:text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
          class="flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium transition-[background-color,color,box-shadow]"
          @click="mode = 'team'">
        <Users class="size-3.5"/>
        팀 나누기
      </button>
      <button
          :class="mode === 'ladder' ? 'bg-zone-accent-fun text-white shadow-sm dark:text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
          class="flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium transition-[background-color,color,box-shadow]"
          @click="mode = 'ladder'">
        <Rows3 class="size-3.5"/>
        사다리타기
      </button>
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

    <!-- 팀 나누기 -->
    <template v-if="mode === 'team'">
      <div class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <label class="text-[11px] font-medium text-muted-foreground">팀 수</label>
        <div class="flex flex-wrap items-center gap-1.5">
          <button v-for="n in [2, 3, 4, 5, 6]" :key="n"
                  :class="teamCount === n ? 'bg-zone-accent-fun text-white dark:text-background' : 'bg-muted text-muted-foreground hover:text-foreground'"
                  class="size-7 rounded-full text-[12px] font-medium transition-colors"
                  @click="teamCount = n">{{ n }}
          </button>
          <input v-model.number="teamCount"
                 class="w-16 rounded-lg border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-zone-accent-fun"
                 min="1" type="number"/>
        </div>
      </div>

      <button
          :disabled="participants.length === 0 || teamCount < 1"
          class="flex items-center justify-center gap-1.5 rounded-xl bg-zone-accent-fun py-2.5 text-[14px] font-semibold text-white transition-[opacity,scale] hover:opacity-90 active:scale-[0.99] disabled:opacity-40 dark:text-background"
          @click="doSplit">
        <Shuffle class="size-4"/>
        팀 나누기
      </button>

      <div v-if="teams.length === 0" class="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border py-10 text-center">
        <div class="flex size-10 items-center justify-center rounded-full bg-muted">
          <Users class="size-4 text-muted-foreground/50"/>
        </div>
        <p class="text-[12px] text-muted-foreground">참가자를 입력하고 팀 나누기를 눌러보세요</p>
      </div>
      <TransitionGroup v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2" name="pop-in" tag="div">
        <div v-for="(team, i) in teams" :key="i"
             :class="teamColor(i).border"
             class="rounded-xl border bg-card p-3">
          <div class="mb-2 flex items-center gap-2">
            <span :class="[teamColor(i).bg, teamColor(i).text]"
                  class="flex size-6 items-center justify-center rounded-full text-[11px] font-bold">{{ i + 1 }}</span>
            <p class="text-[12px] font-semibold text-foreground">팀 {{ i + 1 }}</p>
            <span class="ml-auto font-mono text-[11px] text-muted-foreground">{{ team.length }}명</span>
          </div>
          <ul class="flex flex-wrap gap-1.5">
            <li v-for="(name, j) in team" :key="j"
                :class="[teamColor(i).bg, teamColor(i).text]"
                class="rounded-full px-2 py-0.5 text-[12px] font-medium">{{ name }}</li>
          </ul>
        </div>
      </TransitionGroup>
    </template>

    <!-- 사다리타기 -->
    <template v-else>
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
          <label class="text-[11px] font-medium text-muted-foreground">당첨 항목 (참가자 수만큼 입력해야 항목명이 그대로 표시됩니다)</label>
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
               class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors">
            <span class="font-medium text-foreground">{{ participants[start] }}</span>
            <ArrowRight class="size-3 shrink-0 text-muted-foreground/50"/>
            <span :class="outcomeMode === 'ox' && outcomeLabels[end] === 'O' ? 'font-semibold text-emerald-500' : 'text-foreground/80'">
              {{ outcomeLabels[end] }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {ArrowRight, Dices, Plus, RotateCw, Rows3, Shuffle, Users, Wand2, X} from 'lucide-vue-next'
import {
  generateLadderRungs,
  groupRungsByRow,
  pickWinnerColumns,
  resolveOutcomeLabels,
  splitIntoTeams,
  traceLadderPath,
  traceLadderPaths,
  type LadderRung,
} from '../../utils/teamSplit'

const mode = ref<'team' | 'ladder'>('team')

// ── 참가자 (칩 입력) ─────────────────────────────────────────────────────
const participants = ref<string[]>([])
const pendingInput = ref('')

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
}

function clearParticipants() {
  participants.value = []
}

function fillSample() {
  participants.value = ['철수', '영희', '민수', '지훈', '수아', '예린']
}

// ── 팀 나누기 ────────────────────────────────────────────────────────────
const teamCount = ref(2)
const teams = ref<string[][]>([])

function doSplit() {
  teams.value = splitIntoTeams(participants.value, teamCount.value)
}

const TEAM_COLORS = [
  {bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20'},
  {bg: 'bg-teal-500/10', text: 'text-teal-600', border: 'border-teal-500/20'},
  {bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20'},
  {bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/20'},
]

function teamColor(i: number) {
  return TEAM_COLORS[i % TEAM_COLORS.length]
}

// ── 사다리타기 ───────────────────────────────────────────────────────────
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

.pop-in-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.pop-in-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
</style>

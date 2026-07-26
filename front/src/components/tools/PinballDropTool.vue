<template>
  <div class="flex flex-col gap-5 max-w-lg mx-auto w-full">
    <div class="flex items-start gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zone-accent-fun/10 text-zone-accent-fun">
        <CircleDot class="size-4.5"/>
      </div>
      <div class="flex flex-col gap-0.5">
        <h2 class="text-[14px] font-semibold text-foreground">핀볼 추첨기</h2>
        <p class="text-[12px] text-muted-foreground">참가자마다 구슬 하나씩 동시에 코스에 투입해, 완주 순서로 전체 순위를 정합니다.</p>
      </div>
    </div>

    <!-- 참가자 입력 (칩 방식) -->
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
                  :title="`${name} 삭제`" :aria-label="`${name} 삭제`" @click="removeParticipant(i)">
            <X class="size-3"/>
          </button>
        </span>
      </div>

      <div class="flex items-center gap-2">
        <input v-model="pendingInput"
               class="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-zone-accent-fun focus:ring-2 focus:ring-zone-accent-fun/20"
               placeholder="이름 입력 후 Enter (쉼표로 여러 명 붙여넣기 가능)"
               aria-label="참가자 이름"
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

    <div v-if="participants.length < 2" class="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border py-10 text-center">
      <CircleDot class="size-6 text-muted-foreground/40"/>
      <p class="px-6 text-[12px] text-muted-foreground">참가자를 2명 이상 입력하세요</p>
    </div>

    <template v-else>
      <!-- 코스: viewBox로 물리 좌표를 그대로 화면 폭에 맞춰 스케일링(참가자 수가 많아 코스가 길어져도
           항상 컨테이너 폭 안에 들어온다 — 반응형·모바일 대응). 컨테이너 높이는 코스의 실제 가로세로
           비율(aspect-ratio)을 그대로 따라간다 — 고정 높이를 쓰면 참가자가 많아 코스가 길쭉해질수록
           레터박싱(위아래 빈 여백)이 커져 구슬·핀이 작은 띠 안에 몰려 잘 안 보이게 된다. -->
      <div class="overflow-hidden rounded-xl border border-border bg-card">
        <svg :viewBox="`${viewBoxX} 0 ${viewBoxWidth} ${courseConfig.width}`"
             class="w-full min-h-[130px] max-h-[300px]" :style="{aspectRatio: `${viewBoxWidth} / ${courseConfig.width}`}"
             preserveAspectRatio="xMidYMid meet" role="img"
             aria-label="구슬이 장애물을 지나 결승선까지 굴러가는 레이스 코스">
          <line :x1="courseConfig.length" :x2="courseConfig.length" y1="0" :y2="courseConfig.width"
                stroke="currentColor" class="text-zone-accent-fun" stroke-width="3" stroke-dasharray="6 5"/>
          <circle v-for="(peg, i) in courseConfig.pegs" :key="`peg-${i}`"
                  :cx="peg.x" :cy="peg.y" :r="peg.radius" class="fill-muted-foreground/50"/>
          <circle v-for="(pos, i) in displayFrame" :key="`ball-${i}`"
                  :cx="pos.x" :cy="pos.y" :r="courseConfig.ballRadius"
                  :class="finished && rankOf(i) === 0 ? 'fill-zone-accent-fun' : 'fill-zone-accent-fun/60'">
            <title>{{ participants[i] }}</title>
          </circle>
        </svg>
      </div>

      <button
          :disabled="racing"
          class="flex items-center justify-center gap-1.5 rounded-xl bg-zone-accent-fun py-2.5 text-[14px] font-semibold text-white transition-[opacity,scale] hover:opacity-90 active:scale-[0.99] disabled:opacity-40 dark:text-background"
          @click="startRace">
        <component :is="racing ? CircleDot : (finished ? RotateCcw : Play)" class="size-4" :class="{ 'animate-spin': racing }"/>
        {{ racing ? '레이스 진행 중…' : (finished ? '다시 레이스' : '레이스 시작') }}
      </button>

      <div v-if="finished && raceResult" aria-live="polite" role="status" class="flex flex-col gap-3">
        <div class="flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-6 py-3 text-center">
          <p class="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Trophy class="size-3.5 text-zone-accent-fun"/>
            1등
          </p>
          <p class="text-[18px] font-bold text-zone-accent-fun">{{ winnerName }}</p>
        </div>

        <ol class="flex flex-col gap-1.5">
          <li v-for="(name, rank) in rankedNames" :key="`${rank}-${name}`"
              class="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 transition-colors"
              :class="rank === 0 ? 'border-zone-accent-fun/40' : ''">
            <span class="flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                  :class="rank === 0 ? 'bg-zone-accent-fun/15 text-zone-accent-fun' : 'bg-muted text-muted-foreground'">
              {{ rank + 1 }}
            </span>
            <span class="truncate text-[13px] font-medium text-foreground">{{ name }}</span>
          </li>
        </ol>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {computed, onBeforeUnmount, ref} from 'vue'
import {CircleDot, Play, Plus, RotateCcw, Trophy, Wand2, X} from 'lucide-vue-next'
import {buildCourseConfig, generatePegs, simulateRace, type RaceResult} from '../../utils/pinballDrop'

const participants = ref<string[]>([])
const pendingInput = ref('')
const racing = ref(false)
const finished = ref(false)
const raceResult = ref<RaceResult | null>(null)
const displayFrame = ref<{x: number; y: number}[]>([])
let rafId: number | undefined
let startTime = 0

// 참가자를 입력하는 동안에도 빈 코스를 미리 보여줄 수 있게, 레이스 시작 전에는 현재 참가자 수
// 기준으로 코스 설정만 미리 계산해 둔다(핀 배치는 seed와 무관해 참가자 수만 있으면 고정된다).
const courseConfig = computed(() => {
  if (raceResult.value) {
    return {...raceResult.value.config, pegs: raceResult.value.pegs}
  }
  const config = buildCourseConfig(participants.value.length)
  return {...config, pegs: generatePegs(config)}
})

// 뷰박스 좌우로 여유를 둔다 — 구슬은 결승선 이전(x<0) 대기 구간에서 출발하는데(pinballDrop.ts
// createInitialBalls) 뷰박스가 x=0부터 시작하면 구슬이 코스에 진입하는 순간 갑자기 "툭" 나타나
// 보인다. 오른쪽도 여유가 없으면 결승선·완주한 구슬이 테두리에 걸려 절반만 그려진다.
const viewBoxX = computed(() => -Math.max(90, courseConfig.value.ballRadius * 12))
const viewBoxWidth = computed(() => courseConfig.value.length - viewBoxX.value + courseConfig.value.ballRadius * 4)

const rankedNames = computed(() => {
  if (!raceResult.value) return []
  return raceResult.value.ranking.map(i => raceResult.value!.names[i])
})

const winnerName = computed(() => rankedNames.value[0] ?? '')

function rankOf(participantIndex: number): number {
  if (!raceResult.value) return -1
  return raceResult.value.ranking.indexOf(participantIndex)
}

function addParticipants(raw: string) {
  const names = raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
  if (names.length === 0) return
  participants.value.push(...names)
  // 참가자 구성이 바뀌면 이전 레이스 결과(구슬 개수·순위)는 더 이상 유효하지 않다.
  // (Enter로 하나씩 추가하든, 쉼표로 여러 명을 붙여넣든 이 함수를 거치므로 여기서 한 번만 처리한다.)
  resetRace()
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

function resetRace() {
  if (rafId !== undefined) cancelAnimationFrame(rafId)
  racing.value = false
  finished.value = false
  raceResult.value = null
  displayFrame.value = []
}

function removeParticipant(i: number) {
  participants.value.splice(i, 1)
  resetRace()
}

function clearParticipants() {
  participants.value = []
  resetRace()
}

function fillSample() {
  participants.value = ['철수', '영희', '민수', '지훈', '수아']
}

function startRace() {
  if (racing.value || participants.value.length < 2) return

  // 참가자 배열을 복제해서 넘긴다 — 원본을 그대로 넘기면 레이스 종료 후 참가자 칩을 추가/삭제할 때
  // 이미 끝난 레이스의 result.names까지 함께 바뀌어 순위 목록이 어긋난다.
  const result = simulateRace([...participants.value])
  raceResult.value = result
  finished.value = false
  displayFrame.value = result.frames[0]

  const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion) {
    displayFrame.value = result.frames[result.frames.length - 1]
    finished.value = true
    return
  }

  racing.value = true
  startTime = performance.now()
  if (rafId !== undefined) cancelAnimationFrame(rafId)

  const tick = (now: number) => {
    const elapsedSeconds = (now - startTime) / 1000
    const frameIndex = Math.floor(elapsedSeconds / result.config.dt)

    if (frameIndex >= result.frames.length - 1) {
      displayFrame.value = result.frames[result.frames.length - 1]
      racing.value = false
      finished.value = true
      return
    }

    displayFrame.value = result.frames[frameIndex]
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

onBeforeUnmount(() => {
  if (rafId !== undefined) cancelAnimationFrame(rafId)
})
</script>

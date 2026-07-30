<template>
  <div class="flex flex-col items-center gap-6 py-4 select-none w-full max-w-xl mx-auto">
    <!-- 멀티플레이 전용 상단 턴/타이머 안내 헤더 -->
    <div v-if="isMulti" class="w-full flex flex-col gap-2 rounded-2xl bg-card border border-border p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="relative flex size-3">
            <span :class="isMyTurn ? 'animate-ping bg-emerald-400' : 'bg-amber-400'" class="absolute inline-flex h-full w-full rounded-full opacity-75"></span>
            <span :class="isMyTurn ? 'bg-emerald-500' : 'bg-amber-500'" class="relative inline-flex rounded-full size-3"></span>
          </span>
          <span class="font-bold text-sm">
            {{ isMyTurn ? '🎯 당신의 턴입니다! 주사위를 굴리고 족보를 선택하세요' : `⏳ [${currentTurnNickname}] 님이 주사위를 조작 중입니다...` }}
          </span>
        </div>

        <div class="flex items-center gap-1.5 font-mono font-black text-sm px-3 py-1 rounded-xl bg-muted" :class="turnTimeLeft <= 10 ? 'text-destructive animate-pulse' : 'text-foreground'">
          <span>⏱️</span>
          <span>{{ turnTimeLeft }}초</span>
        </div>
      </div>

      <!-- 참가자 턴 순서 & 점수 보드 탭 -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-border/50">
        <div
            v-for="(p, idx) in participantsList"
            :key="p.id"
            :class="[
              idx === currentTurnIndex ? 'border-primary bg-primary/10 shadow-sm' : 'border-border/50 bg-background/50 opacity-80',
              p.id === participantId ? 'ring-2 ring-primary/40' : ''
            ]"
            class="flex flex-col p-2 rounded-xl border text-xs"
        >
          <div class="flex items-center justify-between">
            <span class="font-bold truncate text-[11px] max-w-[80px]">
              {{ p.nickname }} {{ p.id === participantId ? '(나)' : '' }}
            </span>
            <span v-if="idx === currentTurnIndex" class="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md font-extrabold">TURN</span>
          </div>
          <span class="font-mono font-extrabold text-sm text-primary mt-1">
            {{ playerScores[p.id] ?? 0 }}점
          </span>
        </div>
      </div>
    </div>

    <!-- 헤더 통계 (싱글 또는 공통) -->
    <div class="flex items-center justify-between gap-3 w-full px-2">
      <GameStat label="내 총점" testid="yacht-score" :value="`${state.totalScore}점`"/>
      <GameStat label="남은 굴리기" testid="yacht-rerolls" :value="`${state.rerollsLeft} / 3`"/>
    </div>

    <!-- 5개 주사위 판 영역 (오버레이 없이 조작만 제어하여 다른 사람 관전 가능) -->
    <div class="relative w-full rounded-3xl border border-primary/20 bg-card p-6 shadow-xl flex flex-col items-center gap-4">
      <div class="flex items-center justify-center gap-3 sm:gap-4 py-2" data-testid="yacht-board">
        <!-- 굴리기 전 안내 메세지 또는 5개 주사위 박스 -->
        <template v-if="displayDice.length === 0">
          <div class="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
            <span class="text-3xl">🎲</span>
            <p class="text-xs font-semibold">
              {{ isMyTurn ? "아래 버튼을 눌러 주사위를 굴리세요!" : `[${currentTurnNickname}] 님이 아직 주사위를 굴리지 않았습니다.` }}
            </p>
          </div>
        </template>

        <template v-else>
          <button
              v-for="(val, i) in displayDice"
              :key="i"
              :disabled="isMulti && !isMyTurn"
              :class="[
                displayKept[i]
                  ? 'ring-4 ring-primary bg-primary/20 border-primary text-primary scale-105 shadow-md'
                  : 'bg-background border-2 border-border text-foreground hover:border-primary/60 shadow-sm',
                isRolling ? 'animate-bounce' : ''
              ]"
              class="group relative flex size-14 sm:size-16 items-center justify-center rounded-2xl transition-[transform,background-color,border-color] duration-200 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-90"
              type="button"
              @click="onKeep(i)"
          >
            <!-- 주사위 눈금 렌더링 -->
            <div class="relative size-10 sm:size-11 grid grid-cols-3 grid-rows-3 p-1.5 pointer-events-none">
              <span v-if="[2, 3, 4, 5, 6].includes(val)" class="size-2 rounded-full bg-current col-start-1 row-start-1 place-self-center"/>
              <span v-if="[4, 5, 6].includes(val)" class="size-2 rounded-full bg-current col-start-3 row-start-1 place-self-center"/>
              <span v-if="[6].includes(val)" class="size-2 rounded-full bg-current col-start-1 row-start-2 place-self-center"/>
              <span v-if="[1, 3, 5].includes(val)" :class="val === 1 ? 'size-3.5 bg-red-500' : 'size-2 bg-current'" class="rounded-full col-start-2 row-start-2 place-self-center"/>
              <span v-if="[6].includes(val)" class="size-2 rounded-full bg-current col-start-3 row-start-2 place-self-center"/>
              <span v-if="[4, 5, 6].includes(val)" class="size-2 rounded-full bg-current col-start-1 row-start-3 place-self-center"/>
              <span v-if="[2, 3, 4, 5, 6].includes(val)" class="size-2 rounded-full bg-current col-start-3 row-start-3 place-self-center"/>
            </div>

            <!-- 고정(KEEP) 뱃지 -->
            <span
                v-if="displayKept[i]"
                class="absolute -top-2.5 rounded-full bg-primary px-2 py-0.5 font-mono text-[9px] font-bold text-primary-foreground shadow-sm"
            >
              고정
            </span>
          </button>
        </template>
      </div>

      <!-- 주사위 굴리기 컨트롤 버튼 -->
      <div class="flex items-center gap-3 w-full max-w-xs mt-1">
        <button
            :disabled="displayRerollsLeft <= 0 || state.status === 'over' || isRolling || (isMulti && !isMyTurn)"
            class="flex-1 py-3.5 px-5 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm shadow-md transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-98 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            type="button"
            @click="onReroll"
        >
          <span class="text-base">🎲</span>
          <span>{{ displayDice.length === 0 ? '첫 주사위 굴리기' : '주사위 재굴리기' }}</span>
          <span class="font-mono text-xs opacity-85">({{ displayRerollsLeft }}회 남음)</span>
        </button>
      </div>
    </div>

    <!-- 12개 족보 점수판 카테고리 Grid (상단/하단 구분) -->
    <div class="w-full flex flex-col gap-5 mt-1 relative">
      <div class="flex flex-col gap-4">
        <!-- 1. 상단 항목 섹션 -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-end px-1.5 pb-0.5">
            <span class="text-xs font-mono font-bold" :class="upperSum >= 63 ? 'text-emerald-500' : 'text-primary'">
              상단 합계: {{ upperSum }} / 63점 {{ upperSum >= 63 ? '(보너스 +35점 완료!)' : '(63점 이상 시 +35점 보너스)' }}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
            <button
                v-for="cat in UPPER_CATEGORIES"
                :key="cat.id"
                :disabled="state.scores[cat.id] !== undefined || state.status === 'over' || isRolling || displayDice.length === 0 || (isMulti && !isMyTurn)"
                :class="[
                  state.scores[cat.id] !== undefined
                    ? 'bg-muted/40 border-border/40 text-muted-foreground/60 cursor-not-allowed'
                    : displayDice.length === 0 || (isMulti && !isMyTurn)
                    ? 'bg-card/50 border-border/40 text-muted-foreground/40 cursor-not-allowed'
                    : 'bg-card border-border hover:border-primary hover:bg-primary/5 text-foreground hover:shadow-sm cursor-pointer'
                ]"
                class="flex items-center justify-between px-3.5 py-3 rounded-2xl border text-xs transition-[background-color,border-color,box-shadow] duration-200"
                type="button"
                @click="onSelectCategory(cat.id)"
            >
              <div class="flex flex-col items-start gap-0.5">
                <span class="font-bold text-[13px] text-foreground">{{ cat.label }}</span>
                <span class="text-[11px] text-muted-foreground">{{ cat.desc }}</span>
              </div>

              <div class="flex items-center gap-1 font-bold font-mono text-sm">
                <span v-if="state.scores[cat.id] !== undefined" class="text-foreground">
                  {{ state.scores[cat.id] }}점
                </span>
                <span v-else-if="displayDice.length > 0" class="text-primary font-extrabold">
                  +{{ calculateCategoryScore(cat.id, displayDice) }}
                </span>
                <span v-else class="text-muted-foreground/30">-</span>
              </div>
            </button>
          </div>
        </div>

        <!-- 2. 하단 항목 섹션 (상단 구분을 위한 은은한 구분선) -->
        <div class="flex flex-col gap-2 pt-3 border-t border-border/50">
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
            <button
                v-for="cat in LOWER_CATEGORIES"
                :key="cat.id"
                :disabled="state.scores[cat.id] !== undefined || state.status === 'over' || isRolling || displayDice.length === 0 || (isMulti && !isMyTurn)"
                :class="[
                  state.scores[cat.id] !== undefined
                    ? 'bg-muted/40 border-border/40 text-muted-foreground/60 cursor-not-allowed'
                    : displayDice.length === 0 || (isMulti && !isMyTurn)
                    ? 'bg-card/50 border-border/40 text-muted-foreground/40 cursor-not-allowed'
                    : 'bg-card border-border hover:border-primary hover:bg-primary/5 text-foreground hover:shadow-sm cursor-pointer'
                ]"
                class="flex items-center justify-between px-3.5 py-3 rounded-2xl border text-xs transition-[background-color,border-color,box-shadow] duration-200"
                type="button"
                @click="onSelectCategory(cat.id)"
            >
              <div class="flex flex-col items-start gap-0.5">
                <span class="font-bold text-[13px] text-foreground">{{ cat.label }}</span>
                <span class="text-[11px] text-muted-foreground">{{ cat.desc }}</span>
              </div>

              <div class="flex items-center gap-1 font-bold font-mono text-sm">
                <span v-if="state.scores[cat.id] !== undefined" class="text-foreground">
                  {{ state.scores[cat.id] }}점
                </span>
                <span v-else-if="displayDice.length > 0" class="text-primary font-extrabold">
                  +{{ calculateCategoryScore(cat.id, displayDice) }}
                </span>
                <span v-else class="text-muted-foreground/30">-</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <GameResultOverlay :restart="resetGame" :show="state.status === 'over'" testid="yacht-over" title="🎉 요트 다이스 완료!" tone="win">
      <div class="flex flex-col items-center gap-2">
        <span class="text-2xl font-black text-primary" data-testid="final-score">최종 점수: {{ state.totalScore }}점</span>
        <span v-if="subtotalBonus > 0" class="text-xs text-muted-foreground">상단 항목 63점 달성 (+35점 보너스 포함)</span>
      </div>
    </GameResultOverlay>
  </div>
</template>

<script lang="ts" setup>
import {computed, onUnmounted, ref, watch} from 'vue'
import {calculateCategoryScore, createYachtState, recordScore, rerollDice, toggleKeepDice, type YachtCategory} from '../../utils/yachtDice'
import {useGameSound} from '../../composables/useGameSound'
import {reportDinoProgressApi, submitRoomClick, type RoomParticipant} from '../../api/games'
import type {DinoParticipantProgress} from '../../composables/useRoomLobby'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

const props = defineProps<{
  submitScore?: (score: number) => void
  restart?: () => void
  onGameEnd?: () => void
  isMulti?: boolean
  code?: string
  participantId?: string
  participants?: RoomParticipant[]
  roomSessionToken?: string
  dinoProgressMap?: Record<string, DinoParticipantProgress>
}>()

const UPPER_CATEGORIES: { id: YachtCategory; label: string; desc: string }[] = [
  { id: 'aces', label: '1 (에이스)', desc: '1의 눈금 합계' },
  { id: 'twos', label: '2 (듀스)', desc: '2의 눈금 합계' },
  { id: 'threes', label: '3 (트레이)', desc: '3의 눈금 합계' },
  { id: 'fours', label: '4 (포)', desc: '4의 눈금 합계' },
  { id: 'fives', label: '5 (파이브)', desc: '5의 눈금 합계' },
  { id: 'sixes', label: '6 (식스)', desc: '6의 눈금 합계' }
]

const LOWER_CATEGORIES: { id: YachtCategory; label: string; desc: string }[] = [
  { id: 'choice', label: '초이스', desc: '모든 주사위 눈금 합' },
  { id: 'fourOfAKind', label: '포카인드', desc: '동일 눈금 4개 이상' },
  { id: 'fullHouse', label: '풀하우스', desc: '동일 눈 3개 + 2개' },
  { id: 'smallStraight', label: '스몰 스트레이트', desc: '연속 4개 눈 (15점)' },
  { id: 'largeStraight', label: '라지 스트레이트', desc: '연속 5개 눈 (30점)' },
  { id: 'yacht', label: '요트 (Yacht)', desc: '5개 모두 동일 (50점)' }
]

const state = ref(createYachtState())
const isRolling = ref(false)
const {playSuccess} = useGameSound()

// 턴 및 타이머 상태 (1분 / 60초 제한)
const currentTurnIndex = ref(0)
const turnTimeLeft = ref(60)
let timerId: ReturnType<typeof setInterval> | null = null

const playerScores = ref<Record<string, number>>({})

const participantsList = computed(() => props.participants ?? [])
const currentTurnParticipant = computed(() => participantsList.value[currentTurnIndex.value] ?? null)
const currentTurnNickname = computed(() => currentTurnParticipant.value?.nickname ?? '상대방')
const isMyTurn = computed(() => {
  if (!props.isMulti) return true
  if (!props.participantId) return true
  if (participantsList.value.length === 0) return true
  return currentTurnParticipant.value?.id === props.participantId
})

// 실시간 멀티 동기화 (현재 턴 수행 플레이어의 주사위 및 턴 상태 수신)
const remoteTurnParticipantId = ref<string | null>(null)
const remoteDice = ref<number[]>([])
const remoteKept = ref<boolean[]>([false, false, false, false, false])
const remoteRerollsLeft = ref<number>(3)

const displayDice = computed(() => {
  if (props.isMulti && !isMyTurn.value) {
    return remoteDice.value
  }
  return state.value.dice
})

const displayKept = computed(() => {
  if (props.isMulti && !isMyTurn.value) {
    return [false, false, false, false, false]
  }
  return state.value.kept
})

const displayRerollsLeft = computed(() => {
  if (props.isMulti && !isMyTurn.value) {
    return remoteRerollsLeft.value
  }
  return state.value.rerollsLeft
})

function startTurnTimer() {
  stopTurnTimer()
  turnTimeLeft.value = 60
  timerId = setInterval(() => {
    turnTimeLeft.value--
    if (turnTimeLeft.value <= 0) {
      handleTurnTimeout()
    }
  }, 1000)
}

function handleTurnTimeout() {
  if (isMyTurn.value && state.value.status === 'playing') {
    // 굴린 적 없으면 자동 1회 굴림
    if (state.value.dice.length === 0) {
      state.value = rerollDice(state.value)
    }

    // 남아있는 첫 번째 미선택 카테고리 자동 선택 (0점 처리되어도 패널티 선택)
    const availableCategory = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES].find(c => state.value.scores[c.id] === undefined)
    if (availableCategory) {
      onSelectCategory(availableCategory.id)
      return
    }
  }
  nextTurn()
}

function stopTurnTimer() {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

function nextTurn() {
  if (participantsList.value.length === 0) return
  currentTurnIndex.value = (currentTurnIndex.value + 1) % participantsList.value.length
  startTurnTimer()
  broadcastTurnState()
}

// 내 턴일 때 상태 실시간 전송 (SSE)
async function broadcastTurnState() {
  if (!props.isMulti || !props.code || !props.participantId || !props.roomSessionToken) return
  try {
    const totalScoreNow = state.value.totalScore + subtotalBonus.value
    const encodedDinoY = encodeDiceToDinoY(state.value.dice, currentTurnIndex.value)
    
    await reportDinoProgressApi(
        'game-yacht-dice',
        props.code,
        props.participantId,
        props.roomSessionToken,
        totalScoreNow,
        true,
        encodedDinoY,
        false,
        false
    )
  } catch {
    // ignore
  }
}

// 주사위 5개 배열 -> 정수로 인코딩 (dinoY = turnIdx * 1000000 + diceNum)
function encodeDiceToDinoY(dice: number[], turnIdx: number): number {
  const diceNum = (!dice || dice.length < 5) ? 0 : dice.reduce((acc, d) => acc * 10 + d, 0)
  return turnIdx * 1000000 + diceNum
}

// 정수 -> { turnIdx, dice } 로 디코딩
function decodeDinoY(dinoY: number): { turnIdx: number; dice: number[]; kept: boolean[] } {
  const turnIdx = Math.floor(dinoY / 1000000)
  const diceNum = dinoY % 1000000

  const kept = [false, false, false, false, false]
  if (diceNum === 0) return { turnIdx, dice: [], kept }

  const str = String(diceNum).padStart(5, '0')
  const dice = str.split('').map(Number)
  return { turnIdx, dice, kept }
}

// 다른 참가자들의 전송 메시지(SSE progressMap) 수신 및 관전 화면 동기화
watch(() => props.dinoProgressMap, (map) => {
  if (!props.isMulti || !map) return
  Object.values(map).forEach(prog => {
    if (prog.participantId) {
      playerScores.value[prog.participantId] = prog.score
    }
    if (prog.dinoY !== undefined && prog.dinoY >= 0) {
      const { turnIdx, dice, kept } = decodeDinoY(prog.dinoY)
      
      // 방 전체 플레이어의 공통 턴 인덱스 업데이트 (턴 넘김 발생 시)
      if (turnIdx !== currentTurnIndex.value) {
        currentTurnIndex.value = turnIdx
        startTurnTimer()
        // 내 턴이 시작되었을 땐 내 주사위 보드 초기화
        if (isMyTurn.value) {
          state.value = {
            ...state.value,
            dice: [],
            kept: [false, false, false, false, false],
            rerollsLeft: 3
          }
        }
      }
      
      // 상대방 턴일 때 상대의 실시간 주사위/고정 상태 렌더링
      if (prog.participantId !== props.participantId) {
        remoteDice.value = dice
        remoteKept.value = kept
      }
    }
  })
}, { deep: true })

watch(() => props.isMulti, (val) => {
  if (val) startTurnTimer()
}, { immediate: true })

onUnmounted(() => {
  stopTurnTimer()
})

const upperCategories: YachtCategory[] = ['aces', 'twos', 'threes', 'fours', 'fives', 'sixes']
const upperSum = computed(() => {
  return upperCategories.reduce((acc, cat) => acc + (state.value.scores[cat] ?? 0), 0)
})
const subtotalBonus = computed(() => (upperSum.value >= 63 ? 35 : 0))

function onKeep(i: number) {
  if (isRolling.value || (props.isMulti && !isMyTurn.value)) return
  state.value = toggleKeepDice(state.value, i)
}

function onReroll() {
  if (isRolling.value || state.value.rerollsLeft <= 0 || (props.isMulti && !isMyTurn.value)) return
  isRolling.value = true
  playSuccess()
  setTimeout(() => {
    state.value = rerollDice(state.value)
    isRolling.value = false
    broadcastTurnState()
  }, 200)
}

async function onSelectCategory(cat: YachtCategory) {
  if (isRolling.value || state.value.scores[cat] !== undefined || (props.isMulti && !isMyTurn.value)) return
  state.value = recordScore(state.value, cat)
  playSuccess()

  if (props.isMulti && props.participantId) {
    playerScores.value[props.participantId] = state.value.totalScore + subtotalBonus.value
  }

  if (state.value.status === 'over') {
    const finalScore = state.value.totalScore + subtotalBonus.value
    state.value.totalScore = finalScore

    if (props.isMulti && props.code && props.participantId && props.roomSessionToken) {
      try {
        await submitRoomClick('game-yacht-dice', props.code, props.participantId, props.roomSessionToken)
      } catch {
        // ignore
      }
    }
  } else if (props.isMulti) {
    nextTurn()
  }
}

function resetGame() {
  state.value = createYachtState()
  if (props.isMulti) startTurnTimer()
}

watch(() => state.value.status, status => {
  if (status === 'over') {
    stopTurnTimer()
    props.submitScore?.(state.value.totalScore)
    props.onGameEnd?.()
  }
})
</script>

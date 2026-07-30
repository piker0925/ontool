<template>
  <div class="flex flex-col items-center gap-5 py-4 w-full max-w-md mx-auto select-none">
    <!-- 턴제 멀티플레이 상단 안내 헤더 -->
    <div v-if="isMulti" class="w-full flex flex-col gap-2 rounded-2xl bg-card border border-border p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="relative flex size-3">
            <span :class="isMyTurn ? 'animate-ping bg-emerald-400' : 'bg-amber-400'" class="absolute inline-flex h-full w-full rounded-full opacity-75"></span>
            <span :class="isMyTurn ? 'bg-emerald-500' : 'bg-amber-500'" class="relative inline-flex rounded-full size-3"></span>
          </span>
          <span class="font-bold text-sm">
            <template v-if="!allSecretsReady">
              🔒 상대방이 맞힐 내 비밀 숫자를 설정하세요
            </template>
            <template v-else>
              {{ isMyTurn ? '🎯 당신의 턴입니다! 상대의 비밀 숫자를 추리하세요' : `⏳ [${currentTurnNickname}] 님이 추리 중입니다...` }}
            </template>
          </span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/50">
        <div
            v-for="(p, idx) in participantsList"
            :key="p.id"
            :class="[
              idx === currentTurnIndex ? 'border-primary bg-primary/10 shadow-sm' : 'border-border/50 bg-background/50 opacity-80',
              p.id === participantId ? 'ring-2 ring-primary/40' : ''
            ]"
            class="flex items-center justify-between p-2 rounded-xl border text-xs"
        >
          <span class="font-bold truncate text-xs">
            {{ p.nickname }} {{ p.id === participantId ? '(나)' : '' }}
          </span>
          <span v-if="playerSecretMap[p.id]" class="text-[10px] text-emerald-500 font-bold">준비완료</span>
          <span v-else class="text-[10px] text-amber-500 font-bold">설정중</span>
        </div>
      </div>
    </div>

    <!-- 1v1 비밀 숫자 설정 단계 (게임 시작 직후) -->
    <template v-if="isMulti && !allSecretsReady">
      <div class="w-full flex flex-col items-center gap-4 p-6 rounded-3xl bg-card border border-primary/30 shadow-xl text-center">
        <span class="text-4xl">🔐</span>
        <div class="flex flex-col gap-1">
          <h3 class="font-extrabold text-base text-foreground">내 비밀 숫자 3자리 설정</h3>
          <p class="text-xs text-muted-foreground">상대방이 맞춰야 할 나만의 정답 숫자를 정해주세요</p>
        </div>

        <form class="flex flex-col items-center gap-3 w-full max-w-xs" @submit.prevent="confirmMySecret">
          <input
              v-model="mySecretInput"
              :disabled="mySecretConfirmed"
              :maxlength="SECRET_LENGTH"
              class="w-36 rounded-2xl border-2 border-primary/40 bg-background px-3 py-2.5 text-center font-mono text-xl font-black tracking-widest text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:opacity-50"
              inputmode="numeric"
              placeholder="123"
              type="password"
          />

          <button
              :disabled="!isValidMySecretInput || mySecretConfirmed"
              class="w-full py-3 px-5 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm shadow-md transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-98 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              type="submit"
          >
            {{ mySecretConfirmed ? '⏳ 상대방의 설정을 기다리는 중...' : '비밀 숫자 결정' }}
          </button>
        </form>
        <p v-if="mySecretInput && !isValidMySecretInput" class="text-[11px] text-destructive">서로 다른 숫자 {{ SECRET_LENGTH }}개를 입력하세요</p>
      </div>
    </template>

    <!-- 추리 대결 진행 단계 -->
    <template v-else>
      <GameStat :text="isMulti ? `상대방이 정한 ${SECRET_LENGTH}자리 비밀 숫자를 맞혀보세요` : `컴퓨터가 정한 ${SECRET_LENGTH}자리 숫자를 맞혀보세요`" tone="neutral"/>

      <!-- 추리 입력 폼 -->
      <form class="flex items-center gap-2" @submit.prevent="submitGuess">
        <input
            v-model="guessInput"
            :disabled="won || (isMulti && !isMyTurn)"
            :maxlength="SECRET_LENGTH"
            class="w-32 rounded-xl border border-input bg-background px-3 py-2 text-center font-mono text-lg font-bold tracking-widest text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
            data-testid="guess-input"
            inputmode="numeric"
            placeholder="123"
            type="text"
        />
        <button
            class="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-opacity duration-200 hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            :disabled="!isValidGuess || won || (isMulti && !isMyTurn)"
            data-testid="guess-submit"
            type="submit"
        >입력
        </button>
      </form>
      <p v-if="guessInput && !isValidGuess" class="text-[11px] text-destructive">서로 다른 숫자 {{ SECRET_LENGTH }}개를 입력하세요</p>

      <!-- 승리 / 라운드 종료 메시지 & 다시 하기 버튼 -->
      <Transition name="win-pop">
        <div v-if="won" class="flex flex-col items-center gap-3 py-2">
          <GameStat
              testid="win-message"
              :text="winnerNickname ? `🎉 [${winnerNickname}] 님이 정답을 맞히고 승리했습니다!` : `${history.length}번 만에 맞혔습니다! 정답: ${singleSecret.join('')}`"
              tone="win"
          />

          <div class="flex items-center gap-2 mt-1">
            <button
                class="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-extrabold text-primary-foreground shadow-md transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-95 cursor-pointer"
                data-testid="game-result-restart"
                type="button"
                @click="resetLocalGame"
            >
              <RotateCcw aria-hidden="true" class="size-4"/>
              다시 게임하기
            </button>
          </div>
        </div>
      </Transition>

      <!-- 기록 리스트 (내 추리 & 상대 추리 피드) -->
      <TransitionGroup class="flex w-full flex-col gap-1.5 mt-2" data-testid="history" name="history-pop" tag="ul">
        <li
            v-for="(entry, i) in history"
            :key="i"
            :class="[
              entry.nickname === '나' || entry.participantId === participantId
                ? 'bg-primary/10 border-primary/20'
                : 'bg-muted/50 border-border/40'
            ]"
            class="flex items-center justify-between rounded-xl border px-3.5 py-2 font-mono text-xs shadow-xs"
        >
          <div class="flex items-center gap-2">
            <span class="font-bold text-[11px] text-muted-foreground">[{{ entry.nickname }}]</span>
            <span class="font-extrabold text-sm text-foreground tracking-wider">{{ entry.guess.join('') }}</span>
          </div>
          <span :class="entry.result.isOut ? 'text-destructive font-bold' : 'text-primary font-bold'">
            {{ entry.result.isOut ? 'OUT (아웃)' : `${entry.result.strikes}S ${entry.result.balls}B` }}
          </span>
        </li>
      </TransitionGroup>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {RotateCcw} from 'lucide-vue-next'
import {generateSecret, type GuessResult, isWin, judgeGuess} from '../../utils/numberBaseball'
import {useGameSound} from '../../composables/useGameSound'
import {reportDinoProgressApi, submitRoomClick, type RoomParticipant} from '../../api/games'
import type {DinoParticipantProgress} from '../../composables/useRoomLobby'
import GameStat from '../GameStat.vue'

const SECRET_LENGTH = 3

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

// 싱글플레이 전용 컴퓨터 비밀 정답
const singleSecret = ref(generateSecret(SECRET_LENGTH))

// 멀티플레이 플레이어별 비밀 숫자 설정 (playerSecretMap: participantId -> secretArray)
const playerSecretMap = ref<Record<string, number[]>>({})
const mySecretInput = ref('')
const mySecretConfirmed = ref(false)

const guessInput = ref('')
const history = ref<Array<{ nickname: string; participantId?: string; guess: number[]; result: GuessResult }>>([])
const won = ref(false)
const winnerNickname = ref<string | null>(null)

const currentTurnIndex = ref(0)
const participantsList = computed(() => props.participants ?? [])
const currentTurnParticipant = computed(() => participantsList.value[currentTurnIndex.value] ?? null)
const currentTurnNickname = computed(() => currentTurnParticipant.value?.nickname ?? '상대방')
const isMyTurn = computed(() => {
  if (!props.isMulti) return true
  if (!props.participantId) return true
  if (participantsList.value.length === 0) return true
  return currentTurnParticipant.value?.id === props.participantId
})

// 방 안의 두 명 모두 비밀 숫자를 설정했는지 여부
const allSecretsReady = computed(() => {
  if (!props.isMulti) return true
  if (participantsList.value.length < 2) return false
  return participantsList.value.every(p => playerSecretMap.value[p.id] !== undefined)
})

const {playClick, playSuccess} = useGameSound()

const isValidMySecretInput = computed(() => {
  if (mySecretInput.value.length !== SECRET_LENGTH) return false
  if (!/^\d+$/.test(mySecretInput.value)) return false
  return new Set(mySecretInput.value.split('')).size === SECRET_LENGTH
})

const isValidGuess = computed(() => {
  if (guessInput.value.length !== SECRET_LENGTH) return false
  if (!/^\d+$/.test(guessInput.value)) return false
  return new Set(guessInput.value.split('')).size === SECRET_LENGTH
})

function doResetState() {
  singleSecret.value = generateSecret(SECRET_LENGTH)
  playerSecretMap.value = {}
  mySecretInput.value = ''
  mySecretConfirmed.value = false
  guessInput.value = ''
  history.value = []
  won.value = false
  winnerNickname.value = null
  currentTurnIndex.value = 0

  if (props.restart) {
    props.restart()
  }
}

async function resetLocalGame() {
  doResetState()
  if (props.isMulti && props.code && props.participantId && props.roomSessionToken) {
    try {
      await reportDinoProgressApi(
          'game-baseball',
          props.code,
          props.participantId,
          props.roomSessionToken,
          0,
          true,
          999999, // 999999: 다시 시작 신호
          false,
          false
      )
    } catch {}
  }
}

function nextTurn() {
  if (participantsList.value.length === 0) return
  currentTurnIndex.value = (currentTurnIndex.value + 1) % participantsList.value.length
}

// dinoY 인코딩: 
// 다시 시작 신호: 999999
// 비밀 설정 단계: 500000 + secretNum(123)
// 추리 진행 단계: turnIdx * 100000 + guessNum(123) (turnIdx는 0 또는 1)
function encodeSecretDinoY(secretNum: number): number {
  return 500000 + secretNum
}

function encodeGuessDinoY(turnIdx: number, guessNum: number): number {
  return turnIdx * 100000 + guessNum
}

function decodeDinoY(dinoY: number) {
  if (dinoY === 999999) {
    return { isRestart: true, isSecret: false, secretNum: 0, turnIdx: 0, guessNum: 0 }
  }
  if (dinoY >= 500000) {
    const secretNum = dinoY - 500000
    return { isRestart: false, isSecret: true, secretNum, turnIdx: 0, guessNum: 0 }
  }
  const turnIdx = Math.floor(dinoY / 100000)
  const guessNum = dinoY % 100000
  return { isRestart: false, isSecret: false, secretNum: 0, turnIdx, guessNum }
}

// 내 비밀 숫자 확정 및 방송
async function confirmMySecret() {
  if (!isValidMySecretInput.value || mySecretConfirmed.value || !props.participantId) return
  const secretDigits = mySecretInput.value.split('').map(Number)
  playerSecretMap.value[props.participantId] = secretDigits
  mySecretConfirmed.value = true
  playSuccess()

  if (props.isMulti && props.code && props.participantId && props.roomSessionToken) {
    try {
      const secretNum = Number(mySecretInput.value)
      const encoded = encodeSecretDinoY(secretNum)
      await reportDinoProgressApi(
          'game-baseball',
          props.code,
          props.participantId,
          props.roomSessionToken,
          0,
          true,
          encoded,
          false,
          false
      )
    } catch {}
  }
}

async function broadcastGuess(guessNum: number) {
  if (!props.isMulti || !props.code || !props.participantId || !props.roomSessionToken) return
  try {
    const encoded = encodeGuessDinoY(currentTurnIndex.value, guessNum)
    await reportDinoProgressApi(
        'game-baseball',
        props.code,
        props.participantId,
        props.roomSessionToken,
        history.value.length,
        !won.value,
        encoded,
        won.value,
        false
    )
  } catch {}
}

// 실시간 상대방 메시지 수신 (비밀 설정, 다시 시작 신호, 또는 추리 제출)
watch(() => props.dinoProgressMap, (map) => {
  if (!props.isMulti || !map) return
  Object.values(map).forEach(prog => {
    if (!prog.participantId || prog.dinoY === undefined || prog.dinoY === 0) return

    const { isRestart, isSecret, secretNum, turnIdx, guessNum } = decodeDinoY(prog.dinoY)

    // 0. 상대방의 다시 시작 신호 수신 시 양쪽 모두 보드 초기화
    if (isRestart) {
      if (prog.participantId !== props.participantId && won.value) {
        doResetState()
      }
      return
    }

    // 1. 상대방 비밀 숫자 수신 (내가 보낸 내 비밀 숫자는 내 맵에 저장 이미 완료됨)
    if (isSecret) {
      if (prog.participantId !== props.participantId) {
        const digits = String(secretNum).padStart(SECRET_LENGTH, '0').split('').map(Number)
        if (digits.length === SECRET_LENGTH) {
          playerSecretMap.value[prog.participantId] = digits
        }
      }
      return
    }

    // 2. 상대방 추리 진행 수신
    if (prog.participantId !== props.participantId && guessNum > 0) {
      const digits = String(guessNum).padStart(SECRET_LENGTH, '0').split('').map(Number)
      
      const alreadyInHistory = history.value.some(
          h => h.participantId === prog.participantId && h.guess.join('') === digits.join('')
      )

      if (!alreadyInHistory && digits.length === SECRET_LENGTH) {
        // 상대방이 추리하는 것은 나의 비밀 숫자
        const targetSecret = playerSecretMap.value[props.participantId || ''] ?? singleSecret.value
        const result = judgeGuess(targetSecret, digits)
        
        history.value = [{ nickname: prog.nickname, participantId: prog.participantId, guess: digits, result }, ...history.value]
        
        if (isWin(result, SECRET_LENGTH)) {
          won.value = true
          winnerNickname.value = prog.nickname
        }
      }

      if (turnIdx !== currentTurnIndex.value) {
        currentTurnIndex.value = turnIdx
      }
    }
  })
}, { deep: true })

async function submitGuess() {
  if (!isValidGuess.value || won.value || (props.isMulti && !isMyTurn.value)) return
  const digits = guessInput.value.split('').map(Number)

  // 내가 추리하는 대상: 상대방의 비밀 숫자 (상대방 ID 구하기)
  const opponent = participantsList.value.find(p => p.id !== props.participantId)
  const opponentSecret = (props.isMulti && opponent) ? playerSecretMap.value[opponent.id] : singleSecret.value
  
  if (!opponentSecret) return
  const result = judgeGuess(opponentSecret, digits)
  const myNick = '나'
  
  history.value = [{ nickname: myNick, participantId: props.participantId, guess: digits, result }, ...history.value]
  const guessNum = Number(guessInput.value)
  
  if (isWin(result, SECRET_LENGTH)) {
    won.value = true
    winnerNickname.value = myNick
    playSuccess()
    props.submitScore?.(history.value.length)
    props.onGameEnd?.()

    if (props.isMulti && props.code && props.participantId && props.roomSessionToken) {
      try {
        await submitRoomClick('game-baseball', props.code, props.participantId, props.roomSessionToken)
      } catch {}
    }
  } else {
    playClick()
  }

  if (props.isMulti) {
    nextTurn()
    await broadcastGuess(guessNum)
  }

  guessInput.value = ''
}
</script>

<style scoped>
.history-pop-enter-active,
.win-pop-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.history-pop-enter-from,
.win-pop-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

@media (prefers-reduced-motion: reduce) {
  .history-pop-enter-active,
  .win-pop-enter-active {
    transition: opacity 0.2s ease;
  }

  .history-pop-enter-from,
  .win-pop-enter-from {
    transform: none;
  }
}
</style>

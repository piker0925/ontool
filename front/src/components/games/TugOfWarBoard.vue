<template>
  <div class="flex flex-col items-center gap-4 py-4 select-none w-full max-w-4xl mx-auto">
    <!-- 상단 게임 통계 바 -->
    <div class="flex flex-wrap items-center justify-between gap-3 w-full max-w-md px-2">
      <div class="flex items-center gap-3">
        <GameStat label="남은 시간" testid="tug-timer" :value="`${(state.timeLeftMs / 1000).toFixed(1)}초`"/>
        <GameStat label="내 연타 횟수" testid="tug-score" :value="`${state.teamAPulls}회`"/>
        <GameStat label="초당 연타(CPS)" testid="tug-cps" :value="`${state.cps.toFixed(1)}`"/>
      </div>

      <div v-if="isMulti" class="flex items-center gap-2">
        <span class="px-3 py-1 rounded-full border border-zone-accent/40 bg-zone-accent/10 text-xs font-bold font-mono text-zone-accent flex items-center gap-1.5 shadow-sm">
          <span class="size-2 rounded-full bg-zone-accent animate-ping"/>
          ⚡ 5인 동시 연타
        </span>
        <span class="px-3 py-1 rounded-full border border-border/60 bg-muted/30 text-xs font-mono font-semibold">
          {{ participants?.length ?? 1 }}명 참가 중
        </span>
      </div>
    </div>

    <!-- 메인 10초 연타 배틀 스테이지 (클릭 및 키보드 연타 수용) -->
    <div
        ref="boardRef"
        class="relative border-4 border-amber-900 bg-neutral-950 rounded-2xl overflow-hidden shadow-2xl p-6 flex flex-col justify-center gap-4 cursor-pointer focus:outline-none w-full max-w-md transition-transform duration-75"
        :class="state.cps > 8 ? 'scale-[1.02] border-amber-500 shadow-amber-500/20' : ''"
        style="min-height: 220px;"
        tabindex="0"
        data-testid="tug-board"
        @click="onPull"
    >
      <!-- Ready 대기 오버레이 (싱글 플레이 전용) -->
      <div v-if="state.status === 'ready'" class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm p-4 text-center">
        <div class="space-y-1">
          <h3 class="text-base font-bold">10초 연타 배틀</h3>
          <p class="text-xs text-muted-foreground">스페이스바 / 마우스 클릭으로 10초간 미친듯이 연타하세요!</p>
        </div>
        <button
            class="rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition-transform duration-200 hover:scale-105 active:scale-95 shadow-md"
            data-testid="start-tug-button"
            type="button"
            @click="handleStart"
        >
          🔥 연타 시작
        </button>
      </div>

      <!-- 내 CPS 파워 임팩트 게이지 -->
      <div class="flex flex-col gap-1.5">
        <div class="flex justify-between items-center text-xs font-mono font-bold">
          <span class="text-amber-400 flex items-center gap-1.5 text-sm">
            🔥 내 연타 파워: <span class="text-white font-black text-base">{{ state.teamAPulls }}회</span>
          </span>
          <span class="text-emerald-400 font-mono text-xs">{{ state.cps.toFixed(1) }} CPS</span>
        </div>

        <div class="w-full bg-muted/40 h-3 rounded-full overflow-hidden border border-white/10 p-0.5">
          <div
              class="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-red-500 rounded-full transition-[width] duration-100 shadow-md"
              :style="{ width: `${Math.min(100, state.cps * 8)}%` }"
          />
        </div>
      </div>

      <div class="text-center text-xs text-muted-foreground font-mono">
        💡 스페이스바 또는 화면 아무 곳이나 폭풍 연타하세요!
      </div>

      <!-- 싱글 결과 오버레이 -->
      <GameResultOverlay v-if="!isMulti" :restart="resetGame" :show="state.status === 'over'" testid="tug-over" title="10초 연타 배틀 종료!" tone="win">
        <span data-testid="final-score">총 {{ state.teamAPulls }}회 연타 달성! (최대 {{ state.cps.toFixed(1) }} CPS)</span>
      </GameResultOverlay>

      <!-- 멀티 대결 최종 순위 결과 & 방장 재대결 오버레이 -->
      <div v-if="isMulti && isMultiRoundFinished" class="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-md p-4 text-center">
        <div class="space-y-1">
          <h3 class="text-xl font-black text-amber-400 flex items-center justify-center gap-2">
            🏆 10초 연타 배틀 최종 순위!
          </h3>
          <p class="text-xs text-muted-foreground">10초간 가장 많은 연타수를 기록한 플레이어가 승리했습니다!</p>
        </div>

        <!-- 순위 목록 스코어보드 -->
        <div class="flex flex-col gap-1.5 w-full max-w-xs my-1">
          <div
              v-for="(r, idx) in multiRankings"
              :key="r.participantId"
              class="flex items-center justify-between px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold"
              :class="idx === 0 ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-muted/30 border-border/40 text-foreground'"
          >
            <div class="flex items-center gap-2">
              <span class="w-5 text-left font-black" :class="idx === 0 ? 'text-amber-400' : 'text-muted-foreground'">{{ idx + 1 }}위</span>
              <span class="truncate max-w-[110px]">{{ r.nickname }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span>{{ r.score }}회</span>
              <span class="text-[10px] text-emerald-400">({{ r.cps.toFixed(1) }} CPS)</span>
            </div>
          </div>
        </div>

        <!-- 방장 전용 재대결 버튼 / 대기자 메시지 -->
        <button
            v-if="isHost"
            class="mt-1 flex items-center gap-2 rounded-full bg-zone-accent px-6 py-2.5 text-xs font-extrabold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            type="button"
            @click="$emit('next-round')"
        >
          🔄 재대결 시작 (Next Round)
        </button>
        <p v-else class="text-xs font-mono text-muted-foreground animate-pulse">
          ⏳ 방장이 다음 라운드 재대결을 준비 중입니다...
        </p>
      </div>
    </div>

    <!-- 멀티 참가자 5인 실시간 라이브 연타 순위 리더보드 -->
    <div v-if="isMulti" class="flex flex-col gap-3 w-full max-w-md mt-2">
      <div class="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between px-2 border-b border-border/40 pb-2">
        <span class="flex items-center gap-2">
          <span>🔥</span> 5인 참가자 실시간 연타 현황
        </span>
        <span class="text-amber-400 font-mono text-[11px] flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-amber-400 animate-ping"/>
          LIVE MASH
        </span>
      </div>

      <div class="flex flex-col gap-2 w-full">
        <div
            v-for="(r, idx) in multiRankings"
            :key="r.participantId"
            class="flex items-center justify-between px-4 py-2.5 rounded-2xl border transition-[background-color,border-color,box-shadow] duration-200 shadow-sm"
            :class="r.participantId === (participantId || 'me') ? 'bg-amber-500/10 border-amber-500/50 text-foreground' : 'bg-card/80 border-border/80'"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span
                class="size-6 rounded-full flex items-center justify-center text-xs font-extrabold text-white shadow-sm shrink-0"
                :class="PLAYER_COLORS[idx % PLAYER_COLORS.length]"
            >{{ r.nickname.charAt(0).toUpperCase() }}</span>
            <span class="text-xs font-bold truncate max-w-[120px]">{{ r.nickname }}</span>
          </div>

          <div class="flex items-center gap-3 font-mono text-xs font-bold">
            <span class="text-emerald-400 text-[11px]">{{ r.cps.toFixed(1) }} CPS</span>
            <span class="text-foreground text-sm font-black">{{ r.score }}회</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {createTugState, pullRope, startTugGame, tickTug} from '../../utils/tugOfWar'
import {consumeGameRetry, requestGameRetry} from '../../utils/gameRetryState'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'
import GameStat from '../GameStat.vue'

import type {RoomParticipant} from '../../api/games'
import {reportDinoProgressApi} from '../../api/games'
import type {DinoParticipantProgress} from '../../composables/useRoomLobby'

const props = defineProps<{
  submitScore?: (score: number) => void
  restart?: () => void
  onGameEnd?: () => void
  isMulti?: boolean
  code?: string
  participantId?: string
  roomSessionToken?: string
  participants?: RoomParticipant[]
  dinoProgressMap?: Record<string, DinoParticipantProgress>
  isHost?: boolean
}>()

const emit = defineEmits<{
  (e: 'next-round'): void
}>()

const PLAYER_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500']

const initialStatus = props.isMulti || consumeGameRetry('game-tug-of-war') ? 'playing' : 'ready'
const state = ref(createTugState(initialStatus))
const boardRef = ref<HTMLDivElement | null>(null)
const {playSuccess, playFail} = useGameSound()
let intervalId: ReturnType<typeof setInterval> | null = null

const otherParticipants = computed(() => {
  if (!props.participants) return []
  return props.participants.filter(p => p.id !== props.participantId)
})

function getParticipantProgress(pid: string): DinoParticipantProgress {
  const raw: any = props.dinoProgressMap?.[pid]
  if (!raw) {
    return {
      participantId: pid,
      nickname: '',
      score: 0,
      isAlive: true,
      dinoY: 0,
      isJumping: false,
      isDucking: false
    }
  }
  return {
    participantId: raw.participantId ?? pid,
    nickname: raw.nickname ?? '',
    score: raw.score ?? 0,
    isAlive: raw.isAlive ?? true,
    dinoY: raw.dinoY ?? 0,
    isJumping: raw.isJumping ?? false,
    isDucking: raw.isDucking ?? false,
  }
}

const isMultiRoundFinished = computed(() => {
  if (!props.isMulti) return false
  return state.value.status === 'over'
})

const multiRankings = computed(() => {
  const list = []
  list.push({
    participantId: props.participantId || 'me',
    nickname: '나 (Me)',
    score: state.value.teamAPulls,
    cps: state.value.cps
  })

  for (const p of otherParticipants.value) {
    const prog = getParticipantProgress(p.id)
    list.push({
      participantId: p.id,
      nickname: p.nickname,
      score: prog.score,
      cps: (prog.dinoY || 0) / 10
    })
  }

  return list.sort((a, b) => b.score - a.score)
})

function sendProgressReport() {
  if (!props.isMulti || !props.code || !props.participantId || !props.roomSessionToken) return
  reportDinoProgressApi(
      'game-tug-of-war',
      props.code,
      props.participantId,
      props.roomSessionToken,
      state.value.teamAPulls,
      state.value.status !== 'over',
      Math.round(state.value.cps * 10),
      false,
      false
  ).catch(() => {})
}

function handleStart() {
  state.value = startTugGame(state.value)
  if (!intervalId) {
    intervalId = setInterval(step, 100)
  }
  nextTick(() => {
    boardRef.value?.focus()
  })
}

function onPull() {
  if (state.value.status === 'ready') {
    handleStart()
    return
  }
  if (state.value.status !== 'playing') return
  state.value = pullRope(state.value, 'A')
  playSuccess()
  sendProgressReport()
}

function handleGlobalKey(e: KeyboardEvent) {
  if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
    e.preventDefault()
    onPull()
  }
}

function resetGame() {
  requestGameRetry('game-tug-of-war')
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  props.restart?.()
}

let stepCount = 0

function step() {
  if (state.value.status !== 'playing') return
  const {nextState} = tickTug(state.value, 100)
  state.value = nextState
  stepCount++
  if (props.isMulti && stepCount % 2 === 0) {
    sendProgressReport()
  }
}

if (props.isMulti || initialStatus === 'playing') {
  intervalId = setInterval(step, 100)
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKey)
})

watch(() => state.value.status, status => {
  if (status === 'over') {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    playSuccess()
    sendProgressReport()
    props.submitScore?.(state.value.teamAPulls)
    props.onGameEnd?.()
  }
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  window.removeEventListener('keydown', handleGlobalKey)
})
</script>

<template>
  <div class="flex flex-col items-center gap-4 py-4 select-none w-full max-w-4xl mx-auto">
    <!-- 상단 대결 현황 바 -->
    <div class="flex flex-wrap items-center justify-between gap-3 w-full max-w-md px-2">
      <div class="flex items-center gap-3">
        <GameStat label="남은 시간" testid="turf-time" :value="`${Math.ceil(state.timeLeftMs / 1000)}초`"/>
        <GameStat label="내 영토" testid="turf-score" :value="`${myPlayer?.score || 0}칸`"/>
      </div>

      <div v-if="isMulti" class="flex items-center gap-2">
        <span class="px-3 py-1 rounded-full border border-zone-accent/40 bg-zone-accent/10 text-xs font-bold font-mono text-zone-accent flex items-center gap-1.5 shadow-sm">
          <span class="size-2 rounded-full bg-zone-accent animate-ping"/>
          ⚡ 5인 땅따먹기 배틀
        </span>
        <span class="px-3 py-1 rounded-full border border-border/60 bg-muted/30 text-xs font-mono font-semibold">
          생존 {{ aliveCount }}명
        </span>
      </div>
    </div>

    <!-- 킬 알림 킬패드 바 -->
    <div v-if="state.lastKillMsg" class="w-full max-w-md px-4 py-2 rounded-xl bg-destructive/20 border border-destructive/40 text-destructive text-xs font-mono font-bold text-center animate-bounce">
      {{ state.lastKillMsg }}
    </div>

    <!-- 2D 격자 영토 보드 (16x16 Paper.io 스타일) -->
    <div
        ref="boardRef"
        class="relative border-4 border-amber-950 bg-neutral-950 rounded-2xl p-3 shadow-2xl overflow-hidden focus:outline-none"
        tabindex="0"
        data-testid="turf-board"
    >
      <!-- Ready 대기 오버레이 (싱글 플레이 전용) -->
      <div v-if="state.status === 'ready'" class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm p-4 text-center">
        <div class="space-y-1">
          <h3 class="text-base font-bold">Paper.io 땅따먹기</h3>
          <p class="text-xs text-muted-foreground">바깥으로 나가 꼬리를 그린 후 내 영토로 돌아와 땅을 점유하세요!</p>
          <p class="text-[11px] text-amber-400 font-mono">⚠️ 꼬리를 그리는 도중 상대가 내 꼬리를 끊으면 즉시 탈락합니다!</p>
        </div>
        <button
            class="rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition-transform duration-200 hover:scale-105 active:scale-95 shadow-md"
            data-testid="start-turf-button"
            type="button"
            @click="handleStart"
        >
          🎮 영토전 시작
        </button>
      </div>

      <!-- 30x30 대형 격자 (표준 2D 벡터 테두리 적용) -->
      <div class="grid gap-0.5 w-[540px] h-[540px] max-w-full" style="grid-template-columns: repeat(30, minmax(0, 1fr)); grid-template-rows: repeat(30, minmax(0, 1fr));">
        <template v-for="(row, r) in state.grid" :key="r">
          <div
              v-for="(cell, c) in row"
              :key="c"
              :style="getCellStyle(r, c, cell)"
              class="relative size-full rounded-[1px] transition-colors duration-150 flex items-center justify-center border border-black/30 overflow-hidden"
          >
            <!-- 꼬리(Trail) 선 렌더링 -->
            <template v-for="(p, pIdx) in state.players" :key="`trail-${p.id}`">
              <div
                  v-if="p.isAlive && p.trail.some(pt => pt.x === c && pt.y === r)"
                  class="absolute inset-0.5 rounded-sm border-2 border-white animate-pulse"
                  :style="{ backgroundColor: PLAYER_COLORS[pIdx % PLAYER_COLORS.length] }"
              />
            </template>

            <!-- 플레이어 머리 본체 위치 표시 -->
            <template v-for="(p, pIdx) in state.players" :key="`head-${p.id}`">
              <div
                  v-if="p.isAlive && p.x === c && p.y === r"
                  class="absolute inset-0 rounded-full border-2 border-white shadow-[0_0_8px_rgba(255,255,255,0.9)] z-20 flex items-center justify-center text-[10px] font-black text-white"
                  :style="{ backgroundColor: PLAYER_COLORS[pIdx % PLAYER_COLORS.length] }"
              >
                {{ p.id === (participantId || 'p1') ? '👑' : '🤖' }}
              </div>
            </template>
          </div>
        </template>
      </div>

      <!-- 싱글 게임 오버 결과 오버레이 -->
      <GameResultOverlay v-if="!isMulti" :restart="resetGame" :show="state.status === 'over'" testid="turf-over" title="영토전 종료!" tone="win">
        <div class="flex flex-col items-center gap-1" data-testid="final-score">
          <span class="font-bold text-amber-400 text-lg">{{ leaderPlayer?.nickname }} 승리!</span>
          <span class="text-xs text-muted-foreground">{{ leaderPlayer?.score }}칸 점유 (전체 {{ Math.round((leaderPlayer?.score || 0) / 900 * 100) }}%)</span>
        </div>
      </GameResultOverlay>

      <!-- 멀티 대결 최종 순위 결과 & 방장 재대결 오버레이 -->
      <div v-if="isMulti && isMultiRoundFinished" class="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-md p-4 text-center">
        <div class="space-y-1">
          <h3 class="text-xl font-black text-amber-400 flex items-center justify-center gap-2">
            🏆 땅따먹기 최종 영토 순위!
          </h3>
          <p class="text-xs text-muted-foreground">가장 넓은 영토를 점유하고 생존한 플레이어가 승리했습니다!</p>
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
              <span>{{ r.score }}칸</span>
              <span class="text-[10px] text-emerald-400">({{ Math.round(r.score / 900 * 100) }}%)</span>
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

    <!-- 방향키 조작 안내 -->
    <div class="flex flex-col items-center gap-1 mt-1">
      <div class="flex items-center gap-2">
        <button class="px-3 py-1.5 rounded-lg border border-border bg-muted/60 text-xs font-medium" type="button" @click="onDir('up')">▲ (W / ↑)</button>
      </div>
      <div class="flex gap-2">
        <button class="px-3 py-1.5 rounded-lg border border-border bg-muted/60 text-xs font-medium" type="button" @click="onDir('left')">◀ (A / ←)</button>
        <button class="px-3 py-1.5 rounded-lg border border-border bg-muted/60 text-xs font-medium" type="button" @click="onDir('down')">▼ (S / ↓)</button>
        <button class="px-3 py-1.5 rounded-lg border border-border bg-muted/60 text-xs font-medium" type="button" @click="onDir('right')">▶ (D / →)</button>
      </div>
    </div>

    <!-- 하단 라이브 순위 리더보드 -->
    <div class="flex flex-col gap-2 w-full max-w-md mt-1">
      <div class="flex items-center justify-between px-2 text-xs font-mono font-bold text-muted-foreground">
        <span>🚩 실시간 영토 점유 현황</span>
        <span>총 900칸 (30x30)</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
        <div
            v-for="(r, idx) in multiRankings"
            :key="r.participantId"
            class="flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-mono"
            :class="r.participantId === (participantId || 'p1') ? 'bg-amber-500/10 border-amber-500/50 text-foreground font-bold' : 'bg-card/70 border-border/60'"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="size-2.5 rounded-full shrink-0" :style="{ backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }"/>
            <div class="flex flex-col truncate">
              <span class="truncate max-w-[70px] text-[11px]">{{ r.nickname }}</span>
              <span v-if="getPersonalityBadge(r.participantId)" class="text-[9px] font-semibold text-amber-400 font-mono">{{ getPersonalityBadge(r.participantId) }}</span>
            </div>
          </div>
          <span class="font-black text-xs shrink-0">{{ r.score }}칸</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {
  createGridTurfState,
  PLAYER_COLORS,
  setPlayerDirection,
  startGridTurfGame,
  tickGridTurf
} from '../../utils/gridTurfWar'
import type { Dir } from '../../utils/gridTurfWar'
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

const initialStatus = props.isMulti || consumeGameRetry('game-grid-turf-war') ? 'playing' : 'ready'
const state = ref(createGridTurfState(initialStatus))
const boardRef = ref<HTMLDivElement | null>(null)
const {playClick, playSuccess, playFail} = useGameSound()
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

const myPlayer = computed(() => {
  const myId = props.participantId || 'p1'
  return state.value.players.find(p => p.id === myId) || state.value.players[0]
})

function getPersonalityBadge(id: string) {
  const p = state.value.players.find(pl => pl.id === id)
  if (!p || p.id === 'p1') return ''
  if (p.personality === 'aggressive') return '🔥공격형'
  if (p.personality === 'cautious') return '🛡️안전형'
  return '🎲변칙형'
}

const aliveCount = computed(() => {
  return state.value.players.filter(p => p.isAlive).length
})

const leaderPlayer = computed(() => {
  return [...state.value.players].sort((a, b) => b.score - a.score)[0]
})

const isMultiRoundFinished = computed(() => {
  if (!props.isMulti) return false
  return state.value.status === 'over'
})

const multiRankings = computed(() => {
  if (!props.isMulti || !props.participants) {
    return state.value.players.map(p => ({
      participantId: p.id,
      nickname: p.nickname,
      score: p.score
    })).sort((a, b) => b.score - a.score)
  }

  const list = []
  const myId = props.participantId || 'p1'
  list.push({
    participantId: myId,
    nickname: '나 (Me)',
    score: myPlayer.value.score
  })

  for (const p of otherParticipants.value) {
    const prog = getParticipantProgress(p.id)
    list.push({
      participantId: p.id,
      nickname: p.nickname,
      score: prog.score
    })
  }

  return list.sort((a, b) => b.score - a.score)
})

function sendProgressReport() {
  if (!props.isMulti || !props.code || !props.participantId || !props.roomSessionToken) return
  const encodedPos = myPlayer.value.y * 30 + myPlayer.value.x
  reportDinoProgressApi(
      'game-grid-turf-war',
      props.code,
      props.participantId,
      props.roomSessionToken,
      myPlayer.value.score,
      myPlayer.value.isAlive,
      encodedPos,
      false,
      false
  ).catch(() => {})
}

function getCellStyle(r: number, c: number, cell: number) {
  if (cell === 0) {
    return { backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.03)' }
  }
  const color = PLAYER_COLORS[(cell - 1) % PLAYER_COLORS.length]
  return {
    backgroundColor: `${color}80`,
    border: `1px solid ${color}`,
    boxShadow: `inset 0 0 6px ${color}A0`
  }
}

function handleStart() {
  state.value = startGridTurfGame(state.value)
  if (!intervalId) {
    intervalId = setInterval(step, 120)
  }
  nextTick(() => {
    boardRef.value?.focus()
  })
}

function onDir(dir: Dir) {
  if (state.value.status !== 'playing') return
  const myId = props.participantId || 'p1'
  state.value = setPlayerDirection(state.value, myId, dir)
  playClick()
  sendProgressReport()
}

function handleGlobalKey(e: KeyboardEvent) {
  if (state.value.status === 'ready') {
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      e.preventDefault()
      handleStart()
    }
    return
  }
  if (state.value.status !== 'playing') return
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { onDir('up'); e.preventDefault() }
  else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { onDir('down'); e.preventDefault() }
  else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { onDir('left'); e.preventDefault() }
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { onDir('right'); e.preventDefault() }
}

function resetGame() {
  requestGameRetry('game-grid-turf-war')
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  props.restart?.()
}

let stepCount = 0

function step() {
  if (state.value.status !== 'playing') return
  const beforeScore = myPlayer.value.score
  state.value = tickGridTurf(state.value, 120)
  if (myPlayer.value.score > beforeScore) {
    playSuccess()
  }
  stepCount++
  if (props.isMulti && stepCount % 2 === 0) {
    sendProgressReport()
  }
}

if (props.isMulti || initialStatus === 'playing') {
  intervalId = setInterval(step, 120)
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
    if (myPlayer.value.isAlive && leaderPlayer.value.id === (props.participantId || 'p1')) {
      playSuccess()
    } else {
      playFail()
    }
    sendProgressReport()
    props.submitScore?.(myPlayer.value.score)
    props.onGameEnd?.()
  }
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  window.removeEventListener('keydown', handleGlobalKey)
})
</script>

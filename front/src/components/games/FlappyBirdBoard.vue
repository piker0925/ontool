<template>
  <div class="flex flex-col items-center gap-4 py-4 select-none w-full max-w-5xl mx-auto">
    <!-- 상단 대결 현황 바 -->
    <div class="flex flex-wrap items-center justify-between gap-3 w-full max-w-md px-2">
      <div class="flex items-center gap-3">
        <GameStat label="통과 파이프" testid="flappy-score" :value="state.score"/>
      </div>

      <div v-if="isMulti" class="flex items-center gap-2">
        <span class="px-3 py-1 rounded-full border border-zone-accent/40 bg-zone-accent/10 text-xs font-bold font-mono text-zone-accent flex items-center gap-1.5 shadow-sm">
          <span class="size-2 rounded-full bg-zone-accent animate-ping"/>
          ⚡ 5인 동시 비행
        </span>
        <span class="px-3 py-1 rounded-full border border-border/60 bg-muted/30 text-xs font-mono font-semibold">
          생존 {{ aliveCount }} / {{ participants?.length ?? 1 }}
        </span>
      </div>
    </div>

    <!-- 메인 대결 그리드 (중앙: 내 메인 화면, 하단: 상대방 미니 화면 1~4개) -->
    <div class="flex flex-col items-center justify-center gap-5 w-full">
      <!-- 내 메인 비행 캔버스 (400x500) -->
      <div class="flex flex-col items-center gap-3">
        <div
            ref="boardRef"
            class="relative border-4 border-emerald-800/80 bg-gradient-to-b from-sky-400 via-sky-200 to-emerald-200 dark:from-sky-950 dark:via-sky-900 dark:to-emerald-950 rounded-2xl overflow-hidden shadow-2xl cursor-pointer focus:outline-none"
            :style="{ width: `${FLAPPY_WIDTH}px`, height: `${FLAPPY_HEIGHT}px` }"
            tabindex="0"
            data-testid="flappy-board"
            @click="onFlap"
        >
          <!-- Ready 대기 오버레이 (싱글 플레이 전용) -->
          <div v-if="state.status === 'ready'" class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm p-4 text-center">
            <div class="space-y-1">
              <h3 class="text-base font-bold">플래비 버드</h3>
              <p class="text-xs text-muted-foreground">스페이스바 / ↑ / 클릭으로 날개짓하여 파이프를 통과하세요</p>
            </div>
            <button
                class="rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition-transform duration-200 hover:scale-105 active:scale-95 shadow-md"
                data-testid="start-flappy-button"
                type="button"
                @click="handleStart"
            >
              🎮 비행 시작
            </button>
          </div>

          <!-- 멀티 개별 탈락 관전 오버레이 (비차단형 상단 뱃지) -->
          <div v-if="isMulti && state.status === 'over' && !isMultiRoundFinished" class="absolute top-3 inset-x-3 z-30 flex items-center justify-between rounded-xl bg-destructive/90 text-destructive-foreground px-4 py-2 text-xs font-bold shadow-lg backdrop-blur-md animate-pulse">
            <span class="flex items-center gap-1.5">💀 탈락하셨습니다! (남은 유저 생존 비행 관전 중...)</span>
            <span class="font-mono text-[11px] opacity-90">내 기록: {{ state.score }}개</span>
          </div>

          <!-- 패럴랙스 구름 배경층 -->
          <div class="absolute inset-0 opacity-40 pointer-events-none overflow-hidden">
            <div class="absolute top-12 left-4 size-16 rounded-full bg-white/50 blur-sm animate-pulse"/>
            <div class="absolute top-24 right-8 size-20 rounded-full bg-white/40 blur-sm"/>
            <div class="absolute top-64 left-1/3 size-24 rounded-full bg-white/30 blur-md"/>
          </div>

          <!-- 2D 벡터 새 (깔끔한 2D 아케이드 스타일) -->
          <div
              :style="{
                left: `${BIRD_X - BIRD_RADIUS}px`,
                top: `${state.birdY - BIRD_RADIUS}px`,
                width: `${BIRD_RADIUS * 2}px`,
                height: `${BIRD_RADIUS * 2}px`,
                transform: `rotate(${Math.min(45, Math.max(-30, state.vy * 0.15))}deg)`
              }"
              class="absolute rounded-full bg-amber-400 border-2 border-amber-950 shadow-sm z-20 transition-transform duration-75 flex items-center justify-center select-none overflow-visible"
          >
            <!-- 2D 눈 -->
            <span class="absolute top-1 right-1.5 size-2.5 rounded-full bg-white border border-amber-950 flex items-center justify-center">
              <span class="size-1 rounded-full bg-amber-950"/>
            </span>
            <!-- 2D 부리 -->
            <span class="absolute -right-1.5 top-2.5 w-2.5 h-2 bg-orange-500 rounded-sm border border-amber-950 transform rotate-12"/>
            <!-- 2D 날개 펄럭임 -->
            <div class="absolute left-0.5 bottom-1 w-3 h-2 bg-amber-100 rounded-full border border-amber-950 transition-transform duration-75" :class="state.vy < 0 ? '-rotate-45 -translate-y-0.5' : 'rotate-12'"/>
          </div>

          <!-- 상하 파이프 장애물 (깔끔한 2D 벡터 파이프) -->
          <template v-for="p in state.pipes" :key="p.id">
            <!-- 상단 파이프 (천장에서 아래로 내려옴) -->
            <div
                :style="{
                  left: `${p.x}px`,
                  top: '0px',
                  width: `${PIPE_WIDTH}px`,
                  height: `${p.gapTop}px`
                }"
                class="absolute z-10 flex flex-col justify-end"
            >
              <!-- 파이프 기둥 -->
              <div class="relative w-full h-full bg-emerald-500 border-x-2 border-emerald-950 shadow-md overflow-hidden">
                <div class="absolute left-2 top-0 bottom-0 w-3 bg-emerald-400/40 pointer-events-none"/>
              </div>

              <!-- 돌출 림 캡 (Rim Cap) -->
              <div class="relative -left-[4px] w-[60px] h-[22px] bg-emerald-400 border-2 border-emerald-950 rounded-sm shadow-sm z-20 shrink-0">
                <div class="absolute left-2 top-0 bottom-0 w-3 bg-emerald-200/50"/>
              </div>
            </div>

            <!-- 하단 파이프 (바닥에서 위로 올라옴) -->
            <div
                :style="{
                  left: `${p.x}px`,
                  top: `${p.gapBottom}px`,
                  width: `${PIPE_WIDTH}px`,
                  height: `${FLAPPY_HEIGHT - p.gapBottom}px`
                }"
                class="absolute z-10 flex flex-col justify-start"
            >
              <!-- 돌출 림 캡 (Rim Cap) -->
              <div class="relative -left-[4px] w-[60px] h-[22px] bg-emerald-400 border-2 border-emerald-950 rounded-sm shadow-sm z-20 shrink-0">
                <div class="absolute left-2 top-0 bottom-0 w-3 bg-emerald-200/50"/>
              </div>

              <!-- 파이프 기둥 -->
              <div class="relative w-full h-full bg-emerald-500 border-x-2 border-emerald-950 shadow-md overflow-hidden">
                <div class="absolute left-2 top-0 bottom-0 w-3 bg-emerald-400/40 pointer-events-none"/>
              </div>
            </div>
          </template>

          <!-- 싱글 게임 오버 결과 오버레이 -->
          <GameResultOverlay v-if="!isMulti" :restart="resetGame" :show="state.status === 'over'" testid="flappy-over" title="게임 오버!" tone="lose">
            <span data-testid="final-score">{{ state.score }}개 파이프 통과!</span>
          </GameResultOverlay>

          <!-- 멀티 대결 최종 생존 결과 & 방장 재대결 오버레이 -->
          <div v-if="isMulti && isMultiRoundFinished" class="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-md p-4 text-center">
            <div class="space-y-1">
              <h3 class="text-xl font-black text-amber-400 flex items-center justify-center gap-2">
                🏆 대결 종료! 최종 순위 결과
              </h3>
              <p class="text-xs text-muted-foreground">가장 멀리 생존한 플레이어가 승리했습니다!</p>
            </div>

            <!-- 순위 목록 스코어보드 -->
            <div class="flex flex-col gap-1.5 w-full max-w-xs my-1">
              <div
                  v-for="(r, idx) in survivalRankings"
                  :key="r.participantId"
                  class="flex items-center justify-between px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold"
                  :class="idx === 0 ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-muted/30 border-border/40 text-foreground'"
              >
                <div class="flex items-center gap-2">
                  <span class="w-5 text-left font-black" :class="idx === 0 ? 'text-amber-400' : 'text-muted-foreground'">{{ idx + 1 }}위</span>
                  <span class="truncate max-w-[110px]">{{ r.nickname }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span>{{ r.score }}개</span>
                  <span v-if="r.isAlive" class="text-[10px] text-emerald-400">생존</span>
                  <span v-else class="text-[10px] text-muted-foreground">탈락</span>
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

        <p class="text-xs text-muted-foreground">스페이스바 / ↑ / 클릭으로 날개짓하여 파이프 사이를 통과하세요!</p>
      </div>

      <!-- 하단: 상대방 플레이어 실시간 미니 관전 보드 1~4개 (하단 전면 배치) -->
      <div v-if="isMulti" class="flex flex-col gap-3 w-full max-w-4xl mt-2">
        <div class="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between px-2 border-b border-border/40 pb-2">
          <span class="flex items-center gap-2">
            <span>👥</span> 상대 플레이어 현황 ({{ otherParticipants.length }}명)
          </span>
          <span class="text-emerald-400 font-mono text-[11px] flex items-center gap-1.5">
            <span class="size-2 rounded-full bg-emerald-400 animate-ping"/>
            LIVE STREAM
          </span>
        </div>

        <div v-if="otherParticipants.length === 0" class="text-center py-6 text-xs text-muted-foreground font-mono bg-muted/20 rounded-2xl border border-dashed border-border/40">
          상대 참가자를 기다리는 중입니다...
        </div>

        <!-- 1~4개 미니 보드 하단 그리드 (반응형 1~4컬럼) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full">
          <div
              v-for="(p, i) in otherParticipants"
              :key="p.id"
              class="flex flex-col gap-2 p-3.5 rounded-2xl border transition-[background-color,border-color,box-shadow] duration-300 shadow-sm"
              :class="getParticipantProgress(p.id).isAlive !== false
                ? 'bg-card/80 border-border/80 shadow-md backdrop-blur-sm'
                : 'bg-slate-950/70 border-destructive/40 opacity-75 grayscale-[20%]'"
          >
            <div class="flex items-center justify-between gap-1">
              <div class="flex items-center gap-2 min-w-0">
                <span
                    class="size-6 rounded-full flex items-center justify-center text-xs font-extrabold text-white shadow-sm shrink-0"
                    :class="PLAYER_COLORS[i % PLAYER_COLORS.length]"
                >{{ p.nickname.charAt(0).toUpperCase() }}</span>
                <span class="text-xs font-bold truncate max-w-[90px]">{{ p.nickname }}</span>
              </div>

              <span
                  class="px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0"
                  :class="getParticipantProgress(p.id).isAlive !== false
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-destructive/20 text-destructive border border-destructive/30'"
              >
                {{ getParticipantProgress(p.id).isAlive !== false ? '🏃 FLYING' : '💀 OUT' }}
              </span>
            </div>

            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-muted-foreground">기록</span>
              <span class="font-black text-foreground text-sm">{{ getParticipantProgress(p.id).score }}개</span>
            </div>

            <!-- 1:1 비율 축소 미니 캔버스 트랙 (400x500 캔버스를 0.38x 비율로 축소) -->
            <div class="relative w-full h-[190px] bg-slate-950 rounded-xl overflow-hidden border border-white/10 shadow-inner">
              <div class="absolute top-0 left-0 origin-top-left scale-[0.38] pointer-events-none" style="width: 400px; height: 500px;">
                <!-- 미니 트랙 배경 -->
                <div class="absolute inset-0 bg-gradient-to-b from-sky-900 via-sky-950 to-emerald-950" />

                <!-- 1:1 동일 파이프 (상대방 전용 점수 기준 시뮬레이션) -->
                <template v-for="pipe in getOpponentSimulatedPipes(p.id)" :key="pipe.id">
                  <div
                      :style="{
                        left: `${pipe.x}px`,
                        top: '0px',
                        width: `${PIPE_WIDTH}px`,
                        height: `${pipe.gapTop}px`
                      }"
                      class="absolute z-10 flex flex-col justify-end"
                  >
                    <div class="relative w-full h-full bg-emerald-500 border-x-2 border-emerald-950 overflow-hidden">
                      <div class="absolute left-2 top-0 bottom-0 w-3 bg-emerald-400/40"/>
                    </div>
                    <div class="relative -left-[4px] w-[60px] h-[22px] bg-emerald-400 border-2 border-emerald-950 rounded-sm shadow-sm z-20 shrink-0">
                      <div class="absolute left-2 top-0 bottom-0 w-3 bg-emerald-200/50"/>
                    </div>
                  </div>
                  <div
                      :style="{
                        left: `${pipe.x}px`,
                        top: `${pipe.gapBottom}px`,
                        width: `${PIPE_WIDTH}px`,
                        height: `${FLAPPY_HEIGHT - pipe.gapBottom}px`
                      }"
                      class="absolute z-10 flex flex-col justify-start"
                  >
                    <div class="relative -left-[4px] w-[60px] h-[22px] bg-emerald-400 border-2 border-emerald-950 rounded-sm shadow-sm z-20 shrink-0">
                      <div class="absolute left-2 top-0 bottom-0 w-3 bg-emerald-200/50"/>
                    </div>
                    <div class="relative w-full h-full bg-emerald-500 border-x-2 border-emerald-950 overflow-hidden">
                      <div class="absolute left-2 top-0 bottom-0 w-3 bg-emerald-400/40"/>
                    </div>
                  </div>
                </template>

                <!-- 상대방 2D 새 캐릭터 (1:1 궤적 사상) -->
                <div
                    v-if="getParticipantProgress(p.id).isAlive !== false"
                    :style="{
                      left: `${BIRD_X - BIRD_RADIUS}px`,
                      top: `${getParticipantProgress(p.id).dinoY - BIRD_RADIUS}px`,
                      width: `${BIRD_RADIUS * 2}px`,
                      height: `${BIRD_RADIUS * 2}px`
                    }"
                    class="absolute rounded-full border-2 border-slate-950 shadow-sm z-20 flex items-center justify-center select-none overflow-visible"
                    :class="PLAYER_COLORS[i % PLAYER_COLORS.length]"
                >
                  <span class="absolute top-1 right-1.5 size-2.5 rounded-full bg-white border border-slate-950 flex items-center justify-center">
                    <span class="size-1 rounded-full bg-slate-950"/>
                  </span>
                  <span class="absolute -right-1.5 top-2.5 w-2.5 h-2 bg-orange-500 rounded-sm border border-slate-950 transform rotate-12"/>
                </div>
                <div v-else class="absolute left-28 top-56 font-bold text-destructive text-2xl flex items-center gap-1 z-30 font-mono">
                  💀 OUT
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {
  BIRD_RADIUS,
  BIRD_X,
  createFlappyState,
  flapBird,
  FLAPPY_HEIGHT,
  FLAPPY_WIDTH,
  PIPE_WIDTH,
  type Pipe,
  startFlappyGame,
  tickFlappy
} from '../../utils/flappyBird'
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

const initialStatus = props.isMulti || consumeGameRetry('game-flappy-bird') ? 'playing' : 'ready'
const state = ref(createFlappyState(initialStatus))
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
      dinoY: FLAPPY_HEIGHT / 2,
      isJumping: false,
      isDucking: false
    }
  }
  return {
    participantId: raw.participantId ?? pid,
    nickname: raw.nickname ?? '',
    score: raw.score ?? 0,
    isAlive: raw.isAlive ?? raw.alive ?? true,
    dinoY: raw.dinoY ?? FLAPPY_HEIGHT / 2,
    isJumping: raw.isJumping ?? raw.jumping ?? false,
    isDucking: raw.isDucking ?? raw.ducking ?? false,
  }
}

function createSeededRandom(seedStr: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619)
  }
  return function() {
    h += h << 13
    h ^= h >>> 7
    h += h << 3
    h ^= h >>> 17
    return (h >>> 0) / 4294967296
  }
}

const prng = computed(() => props.code ? createSeededRandom(props.code) : Math.random)

const opponentSimCache: Record<string, { lastScore: number; pipes: Pipe[] }> = {}

function getOpponentSimulatedPipes(pid: string): Pipe[] {
  const prog = getParticipantProgress(pid)
  const targetScore = prog.score

  const cached = opponentSimCache[pid]
  if (cached && cached.lastScore === targetScore) {
    return cached.pipes
  }

  const rand = props.code ? createSeededRandom(props.code) : Math.random
  let sim = createFlappyState('playing')
  const totalSteps = Math.max(1, Math.floor((targetScore * 1.6 * 1000) / 30))
  for (let i = 0; i < totalSteps; i++) {
    const dt = 0.03
    const dx = 150 * dt
    sim.pipes = sim.pipes.map(p => ({ ...p, x: p.x - dx })).filter(p => p.x + PIPE_WIDTH > 0)
    sim.spawnRemainingMs -= 30
    if (sim.spawnRemainingMs <= 0) {
      const minGapTop = 60
      const maxGapTop = FLAPPY_HEIGHT - 60 - 125
      const gapTop = minGapTop + Math.floor(rand() * (maxGapTop - minGapTop))
      sim.pipes.push({
        id: sim.nextId++,
        x: FLAPPY_WIDTH,
        gapTop,
        gapBottom: gapTop + 125,
        passed: false
      })
      sim.spawnRemainingMs = 1600
    }
  }

  opponentSimCache[pid] = {
    lastScore: targetScore,
    pipes: sim.pipes
  }

  return sim.pipes
}

const aliveCount = computed(() => {
  let count = state.value.status !== 'over' ? 1 : 0
  for (const p of otherParticipants.value) {
    if (getParticipantProgress(p.id).isAlive !== false) {
      count++
    }
  }
  return count
})

const isMultiRoundFinished = computed(() => {
  if (!props.isMulti) return false
  if (state.value.status !== 'over') return false
  if (otherParticipants.value.length === 0) return true
  return otherParticipants.value.every(p => {
    const prog = getParticipantProgress(p.id)
    return prog.isAlive === false
  })
})

const survivalRankings = computed(() => {
  const list = []
  list.push({
    participantId: props.participantId || 'me',
    nickname: '나 (Me)',
    score: state.value.score,
    isAlive: state.value.status !== 'over'
  })

  for (const p of otherParticipants.value) {
    const prog = getParticipantProgress(p.id)
    list.push({
      participantId: p.id,
      nickname: p.nickname,
      score: prog.score,
      isAlive: prog.isAlive !== false
    })
  }

  return list.sort((a, b) => b.score - a.score)
})

function sendProgressReport() {
  if (!props.isMulti || !props.code || !props.participantId || !props.roomSessionToken) return
  reportDinoProgressApi(
      'game-flappy-bird',
      props.code,
      props.participantId,
      props.roomSessionToken,
      state.value.score,
      state.value.status !== 'over',
      Math.floor(state.value.birdY),
      state.value.vy < 0,
      false
  ).catch(() => {})
}

function handleStart() {
  state.value = startFlappyGame(state.value)
  if (!intervalId) {
    intervalId = setInterval(step, 30)
  }
  nextTick(() => {
    boardRef.value?.focus()
  })
}

function onFlap() {
  if (state.value.status !== 'playing') return
  state.value = flapBird(state.value)
  playSuccess()
  sendProgressReport()
}

function resetGame() {
  requestGameRetry('game-flappy-bird')
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  props.restart?.()
}

let stepCount = 0

function step() {
  if (state.value.status !== 'playing') return
  const {nextState} = tickFlappy(state.value, 30, prng.value)
  state.value = nextState
  stepCount++
  if (props.isMulti && stepCount % 3 === 0) {
    sendProgressReport()
  }
}

if (props.isMulti || initialStatus === 'playing') {
  intervalId = setInterval(step, 30)
  nextTick(() => {
    boardRef.value?.focus()
  })
}

watch(() => state.value.status, status => {
  if (status === 'over') {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    playFail()
    sendProgressReport()
    props.submitScore?.(state.value.score)
    props.onGameEnd?.()
  }
})

function handleGlobalKey(e: KeyboardEvent) {
  if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    e.preventDefault()
    if (state.value.status === 'ready') {
      handleStart()
    } else if (state.value.status === 'playing') {
      onFlap()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKey)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  window.removeEventListener('keydown', handleGlobalKey)
})
</script>

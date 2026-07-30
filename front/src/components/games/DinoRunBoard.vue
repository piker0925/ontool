<template>
  <div class="flex flex-col items-center gap-4 py-4 select-none w-full max-w-5xl mx-auto">
    <!-- 상단 대결 현황 바 -->
    <div class="flex flex-wrap items-center justify-between gap-3 w-full max-w-3xl px-2">
      <div class="flex items-center gap-3">
        <GameStat label="점수" testid="dino-score" :value="state.score"/>
        <GameStat label="속도" testid="dino-speed" :value="Math.floor(state.speed)"/>
      </div>

      <div v-if="isMulti" class="flex items-center gap-2">
        <span class="px-3 py-1 rounded-full border border-zone-accent/40 bg-zone-accent/10 text-xs font-bold font-mono text-zone-accent flex items-center gap-1.5 shadow-sm">
          <span class="size-2 rounded-full bg-zone-accent animate-ping"/>
          ⚡ 5인 동시 질주
        </span>
        <span class="px-3 py-1 rounded-full border border-border/60 bg-muted/30 text-xs font-mono font-semibold">
          생존 {{ aliveCount }} / {{ participants?.length ?? 1 }}
        </span>
      </div>
    </div>

    <!-- 메인 대결 그리드 (중앙: 내 메인 화면, 하단: 상대방 미니 화면 1~4개) -->
    <div class="flex flex-col items-center justify-center gap-5 w-full">
      <!-- 내 메인 공룡 트랙 (600x200) -->
      <div class="flex flex-col items-center gap-3">
        <div
            ref="boardRef"
            :class="isNightMode ? 'bg-slate-950 text-slate-100 border-indigo-900/60 shadow-[0_0_30px_rgba(99,102,241,0.3)]' : 'bg-amber-500/5 text-foreground border-border/60 shadow-[0_0_30px_rgba(0,0,0,0.4)]'"
            :style="{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }"
            class="relative border rounded-2xl overflow-hidden backdrop-blur-sm ring-1 ring-border/20 cursor-pointer focus:outline-none transition-colors duration-700 shrink-0"
            data-testid="dino-board"
            tabindex="0"
        >
          <!-- Ready 대기 오버레이 (싱글 플레이 전용) -->
          <div v-if="state.status === 'ready'" class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm p-4 text-center">
            <div class="space-y-1">
              <h3 class="text-base font-bold">구글 공룡 게임</h3>
              <p class="text-xs text-muted-foreground">스페이스바 / ↑ 점프 (길게 누르면 높은 점프) | ↓ 숙이기</p>
            </div>
            <button
                class="rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition-transform duration-200 hover:scale-105 active:scale-95 shadow-md"
                data-testid="start-dino-button"
                type="button"
                @click="handleStart"
            >
              🎮 게임 시작
            </button>
          </div>

          <!-- 멀티 개별 탈락 관전 오버레이 (비차단형 상단 뱃지) -->
          <div v-if="isMulti && state.status === 'over' && !isMultiRoundFinished" class="absolute top-3 inset-x-3 z-30 flex items-center justify-between rounded-xl bg-destructive/90 text-destructive-foreground px-4 py-2 text-xs font-bold shadow-lg backdrop-blur-md animate-pulse">
            <span class="flex items-center gap-1.5">💀 탈락하셨습니다! (남은 유저 생존 경주 관전 중...)</span>
            <span class="font-mono text-[11px] opacity-90">내 점수: {{ state.score }}점</span>
          </div>

          <!-- 야간 모드 별 & 달 장식 -->
          <template v-if="isNightMode">
            <div class="absolute top-4 right-12 text-sm">🌙</div>
            <div class="absolute top-6 left-20 text-[10px] opacity-70">✨</div>
            <div class="absolute top-3 left-1/2 text-[8px] opacity-50">⭐</div>
          </template>

          <!-- 트랙 트레일선 & 지면 (DINO_GROUND_Y) -->
          <div
              :class="isNightMode ? 'border-indigo-400/40' : 'border-muted-foreground/60'"
              :style="{ top: `${DINO_GROUND_Y}px` }"
              class="absolute inset-x-0 border-b-2"
          />

          <!-- 내 2D 공룡 캐릭터 (T-Rex 벡터 그래픽 + 런닝/숙이기 상태) -->
          <div
              :style="{
                left: '40px',
                top: `${DINO_GROUND_Y - state.dinoY - (state.isDucking ? DINO_DUCK_HEIGHT : DINO_HEIGHT)}px`,
                width: `${state.isDucking ? DINO_DUCK_WIDTH : DINO_WIDTH}px`,
                height: `${state.isDucking ? DINO_DUCK_HEIGHT : DINO_HEIGHT}px`
              }"
              class="absolute z-20 flex items-center justify-center transition-[left,bottom,transform] duration-75"
          >
            <!-- 서있기 / 점프 / 런닝 T-Rex SVG -->
            <svg v-if="!state.isDucking" viewBox="0 0 34 40" class="size-full fill-emerald-500 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">
              <rect x="14" y="0" width="18" height="14" rx="2" />
              <circle cx="26" cy="4" r="2" fill="#09090b" />
              <rect x="22" y="10" width="8" height="2" fill="#ffffff" />
              <rect x="8" y="12" width="20" height="18" rx="3" />
              <path d="M 8 18 L 0 24 L 8 28 Z" />
              <rect x="24" y="18" width="6" height="3" rx="1" />
              <rect :y="Math.floor(state.score / 4) % 2 === 0 ? 30 : 32" x="12" width="4" height="8" rx="1" fill="#047857" />
              <rect :y="Math.floor(state.score / 4) % 2 === 1 ? 30 : 32" x="20" width="4" height="8" rx="1" fill="#047857" />
            </svg>

            <!-- 숙이기 (Duck) T-Rex SVG -->
            <svg v-else viewBox="0 0 44 24" class="size-full fill-emerald-500 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">
              <rect x="4" y="6" width="36" height="14" rx="3" />
              <circle cx="36" cy="10" r="2" fill="#09090b" />
              <path d="M 4 10 L 0 16 L 4 18 Z" />
              <rect :y="Math.floor(state.score / 4) % 2 === 0 ? 18 : 20" x="12" width="4" height="5" rx="1" fill="#047857" />
              <rect :y="Math.floor(state.score / 4) % 2 === 1 ? 18 : 20" x="24" width="4" height="5" rx="1" fill="#047857" />
            </svg>
          </div>

          <!-- 2D 장애물 (선인장 / 날아다니는 익룡) -->
          <div
              v-for="o in state.obstacles"
              :key="o.id"
              :style="{
                left: `${o.x}px`,
                top: `${DINO_GROUND_Y - (o.y || 0) - o.height}px`,
                width: `${o.width}px`,
                height: `${o.height}px`
              }"
              class="absolute z-10 flex items-center justify-center select-none"
          >
            <!-- 익룡 -->
            <svg v-if="o.type === 'bird'" viewBox="0 0 32 24" class="size-full fill-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]">
              <path d="M 22 8 L 32 10 L 22 12 Z" />
              <circle cx="20" cy="9" r="1.5" fill="#09090b" />
              <path :d="Math.floor(state.score / 5) % 2 === 0 ? 'M 10 12 L 20 0 L 24 12 Z' : 'M 10 12 L 20 22 L 24 12 Z'" />
              <ellipse cx="14" cy="12" rx="8" ry="4" />
              <path d="M 6 12 L 0 10 L 6 14 Z" />
            </svg>

            <!-- 선인장 -->
            <svg v-else viewBox="0 0 24 38" class="size-full fill-emerald-700 drop-shadow-md">
              <rect x="9" y="0" width="6" height="38" rx="2" fill="#047857" />
              <path d="M 3 12 L 9 12 L 9 16 L 3 16 L 3 8 Z" fill="#059669" />
              <path d="M 15 18 L 21 18 L 21 22 L 15 22 L 21 14 Z" fill="#059669" />
            </svg>
          </div>

          <!-- 싱글 게임 오버 결과 오버레이 -->
          <GameResultOverlay v-if="!isMulti" :restart="resetGame" :show="state.status === 'over'" testid="dino-over" title="게임 오버!" tone="lose">
            <span data-testid="final-score">{{ state.score }}점 달성!</span>
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
                  <span>{{ r.score }}점</span>
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

        <!-- 터치/모바일 조작 패드 -->
        <div class="flex items-center gap-3">
          <button class="px-5 py-2 rounded-xl border border-border bg-muted/60 text-xs font-bold hover:bg-muted active:scale-95" type="button" @click="onJump">🚀 점프 (↑/Space)</button>
          <button class="px-5 py-2 rounded-xl border border-border bg-muted/60 text-xs font-bold hover:bg-muted active:scale-95" type="button" @mousedown="onDuckStart" @mouseleave="onDuckEnd" @mouseup="onDuckEnd">🔻 숙이기 (↓/S)</button>
        </div>
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
                {{ getParticipantProgress(p.id).isAlive !== false ? '🏃 RUNNING' : '💀 OUT' }}
              </span>
            </div>

            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-muted-foreground">기록</span>
              <span class="font-black text-foreground text-sm">{{ getParticipantProgress(p.id).score }}점</span>
            </div>

            <!-- 1:1 비율 축소 미니 캔버스 트랙 (600x200 캔버스를 0.38x 비율로 축소) -->
            <div class="relative w-full h-[76px] bg-slate-950 rounded-xl overflow-hidden border border-white/10 shadow-inner">
              <div class="absolute top-0 left-0 origin-top-left scale-[0.38] pointer-events-none" style="width: 600px; height: 200px;">
                <!-- 미니 트랙 배경 & 지면 -->
                <div class="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />
                <div class="absolute inset-x-0 border-b-2 border-slate-700" style="top: 160px;" />

                <!-- 1:1 동일 장애물 (상대방 전용 점수 기준 시계열 시뮤레이션 렌더링) -->
                <div
                    v-for="o in getOpponentSimulatedObstacles(p.id)"
                    :key="o.id"
                    :style="{
                      left: `${o.x}px`,
                      top: `${DINO_GROUND_Y - (o.y || 0) - o.height}px`,
                      width: `${o.width}px`,
                      height: `${o.height}px`
                    }"
                    class="absolute z-10 flex items-center justify-center select-none"
                >
                  <!-- 익룡 -->
                  <svg v-if="o.type === 'bird'" viewBox="0 0 32 24" class="size-full fill-amber-400 drop-shadow-sm">
                    <path d="M 22 8 L 32 10 L 22 12 Z" />
                    <circle cx="20" cy="9" r="1.5" fill="#09090b" />
                    <path :d="Math.floor(getParticipantProgress(p.id).score / 5) % 2 === 0 ? 'M 10 12 L 20 0 L 24 12 Z' : 'M 10 12 L 20 22 L 24 12 Z'" />
                    <ellipse cx="14" cy="12" rx="8" ry="4" />
                    <path d="M 6 12 L 0 10 L 6 14 Z" />
                  </svg>

                  <!-- 선인장 -->
                  <svg v-else viewBox="0 0 24 38" class="size-full fill-emerald-700 drop-shadow-sm">
                    <rect x="9" y="0" width="6" height="38" rx="2" fill="#047857" />
                    <path d="M 3 12 L 9 12 L 9 16 L 3 16 L 3 8 Z" fill="#059669" />
                    <path d="M 15 18 L 21 18 L 21 22 L 15 22 L 21 14 Z" fill="#059669" />
                  </svg>
                </div>

                <!-- 상대방 2D 공룡 캐릭터 (1:1 궤적 사상) -->
                <div
                    v-if="getParticipantProgress(p.id).isAlive !== false"
                    :style="{
                      left: '40px',
                      top: `${DINO_GROUND_Y - getParticipantProgress(p.id).dinoY - (getParticipantProgress(p.id).isDucking ? DINO_DUCK_HEIGHT : DINO_HEIGHT)}px`,
                      width: `${getParticipantProgress(p.id).isDucking ? DINO_DUCK_WIDTH : DINO_WIDTH}px`,
                      height: `${getParticipantProgress(p.id).isDucking ? DINO_DUCK_HEIGHT : DINO_HEIGHT}px`
                    }"
                    class="absolute z-20 transition-[left,bottom,transform] duration-75"
                >
                  <svg
                      v-if="!getParticipantProgress(p.id).isDucking"
                      viewBox="0 0 34 40"
                      class="size-full fill-current drop-shadow-md"
                      :class="PLAYER_TEXT_COLORS[i % PLAYER_TEXT_COLORS.length]"
                  >
                    <rect x="14" y="0" width="18" height="14" rx="2" />
                    <circle cx="26" cy="4" r="2" fill="#09090b" />
                    <rect x="8" y="12" width="20" height="18" rx="3" />
                    <rect :y="Math.floor(getParticipantProgress(p.id).score / 4) % 2 === 0 ? 30 : 32" x="12" width="4" height="8" rx="1" />
                    <rect :y="Math.floor(getParticipantProgress(p.id).score / 4) % 2 === 1 ? 30 : 32" x="20" width="4" height="8" rx="1" />
                  </svg>
                  <svg
                      v-else
                      viewBox="0 0 44 24"
                      class="size-full fill-current drop-shadow-md"
                      :class="PLAYER_TEXT_COLORS[i % PLAYER_TEXT_COLORS.length]"
                  >
                    <rect x="4" y="6" width="36" height="14" rx="3" />
                    <circle cx="36" cy="10" r="2" fill="#09090b" />
                  </svg>
                </div>
                <div v-else class="absolute left-10 top-24 font-bold text-destructive text-xl flex items-center gap-1 z-30 font-mono">
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
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  createDinoState,
  DINO_DUCK_HEIGHT,
  DINO_DUCK_WIDTH,
  DINO_GROUND_Y,
  DINO_HEIGHT,
  DINO_WIDTH,
  duckDino,
  jumpDino,
  releaseJumpDino,
  startDinoGame,
  tickDino,
  type Obstacle
} from '../../utils/dinoRun'
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
const PLAYER_TEXT_COLORS = ['text-blue-400', 'text-emerald-400', 'text-purple-400', 'text-amber-400', 'text-rose-400']

const initialStatus = props.isMulti || consumeGameRetry('game-dino-run') ? 'playing' : 'ready'
const state = ref(createDinoState(initialStatus))
const boardRef = ref<HTMLDivElement | null>(null)
const {playSuccess, playFail} = useGameSound()
let intervalId: ReturnType<typeof setInterval> | null = null
let progressReportTimer: ReturnType<typeof setInterval> | null = null

const isNightMode = computed(() => Math.floor(state.value.score / 500) % 2 === 1)

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
    isAlive: raw.isAlive ?? raw.alive ?? true,
    dinoY: raw.dinoY ?? 0,
    isJumping: raw.isJumping ?? raw.jumping ?? false,
    isDucking: raw.isDucking ?? raw.ducking ?? false,
  }
}

const opponentSimCache: Record<string, { lastScore: number; obstacles: Obstacle[] }> = {}

function getOpponentSimulatedObstacles(pid: string): Obstacle[] {
  const prog = getParticipantProgress(pid)
  const targetScore = prog.score
  if (targetScore <= 0) return []

  const cached = opponentSimCache[pid]
  if (cached && cached.lastScore === targetScore) {
    return cached.obstacles
  }

  const rand = props.code ? createSeededRandom(props.code) : Math.random
  let sim = createDinoState('playing')
  while (sim.status === 'playing' && sim.score < targetScore) {
    const { nextState } = tickDino(sim, 30, rand)
    sim = nextState
  }

  opponentSimCache[pid] = {
    lastScore: targetScore,
    obstacles: sim.obstacles
  }

  return sim.obstacles
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
      'game-dino-run',
      props.code,
      props.participantId,
      props.roomSessionToken,
      state.value.score,
      state.value.status !== 'over',
      state.value.dinoY,
      state.value.isJumping,
      state.value.isDucking
  ).catch(() => {})
}

function handleStart() {
  state.value = startDinoGame(state.value)
  if (!intervalId) {
    intervalId = setInterval(step, 30)
  }
  nextTick(() => {
    boardRef.value?.focus()
  })
}

function onJump() {
  if (state.value.status !== 'playing') return
  const beforeJumping = state.value.isJumping
  state.value = jumpDino(state.value)
  if (!beforeJumping && state.value.isJumping) {
    playSuccess()
  }
  sendProgressReport()
}

function onJumpRelease() {
  if (state.value.status !== 'playing') return
  state.value = releaseJumpDino(state.value)
  sendProgressReport()
}

function onDuckStart() {
  if (state.value.status !== 'playing') return
  state.value = duckDino(state.value, true)
  sendProgressReport()
}

function onDuckEnd() {
  if (state.value.status !== 'playing') return
  state.value = duckDino(state.value, false)
  sendProgressReport()
}

function handleKeyDown(e: KeyboardEvent) {
  if (state.value.status !== 'playing') return
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    onJump()
    e.preventDefault()
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    onDuckStart()
    e.preventDefault()
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (state.value.status !== 'playing') return
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    onJumpRelease()
    e.preventDefault()
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    onDuckEnd()
    e.preventDefault()
  }
}

function resetGame() {
  requestGameRetry('game-dino-run')
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  props.restart?.()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})

let stepCount = 0

function step() {
  if (state.value.status !== 'playing') return
  const {nextState} = tickDino(state.value, 30, prng.value)
  state.value = nextState
  stepCount++
  // 멀티 모드일 때 3프레임(약 90ms)마다 실시간 공룡 위치(dinoY, 점프, 숙이기)를 전송
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

function handleGlobalKeyDown(e: KeyboardEvent) {
  if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    e.preventDefault()
    if (state.value.status === 'ready') {
      handleStart()
    } else if (state.value.status === 'playing') {
      onJump()
    }
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    e.preventDefault()
    if (state.value.status === 'playing') {
      state.value = duckDino(state.value, true)
    }
  }
}

function handleGlobalKeyUp(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    if (state.value.status === 'playing') {
      state.value = duckDino(state.value, false)
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown)
  window.addEventListener('keyup', handleGlobalKeyUp)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  if (progressReportTimer) clearInterval(progressReportTimer)
  window.removeEventListener('keydown', handleGlobalKeyDown)
  window.removeEventListener('keyup', handleGlobalKeyUp)
})
</script>


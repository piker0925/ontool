<template>
  <div class="flex flex-col items-center gap-4 py-4 select-none">
    <div class="flex items-center justify-between gap-2 w-full max-w-md px-2">
      <div class="flex items-center gap-2 text-sm font-medium">
        <span>현재 턴:</span>
        <span :class="currentStone === 1 ? 'text-foreground font-bold' : 'text-primary font-bold'" class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border/60 bg-muted/40">
          <span :class="currentStone === 1 ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-300'" class="size-3.5 rounded-full border shadow-sm"/>
          {{ isMulti ? (currentStone === myStone ? `나 (${myStone === 1 ? '흑돌' : '백돌'})` : `상대방 (${myStone === 1 ? '백돌' : '흑돌'})`) : (currentStone === 1 ? '흑돌' : '백돌') }}
        </span>
      </div>
      <div v-if="isMulti" class="text-xs font-bold px-2 py-1 rounded-md" :class="isMyTurn ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'">
        {{ isMyTurn ? '🎯 내 차례입니다' : '⏳ 상대방 착수 대기 중...' }}
      </div>
      <div v-else class="text-xs font-mono text-muted-foreground border border-border/40 px-2 py-0.5 rounded-md bg-muted/20">15 × 15 정통 오목판</div>
    </div>

    <!-- 15x15 오목 바둑판 렌더링 (교차점 1:1 완벽 정렬) -->
    <div
        class="relative border-2 border-amber-900/90 bg-amber-200/95 dark:bg-[#2c1d11] p-3 rounded-2xl shadow-2xl"
        data-testid="omok-board"
    >
      <div class="grid w-[450px] h-[450px] max-w-full relative" style="grid-template-columns: repeat(15, minmax(0, 1fr)); grid-template-rows: repeat(15, minmax(0, 1fr));">
        <template v-for="(row, r) in board" :key="r">
          <div
              v-for="(cell, c) in row"
              :key="c"
              class="relative size-[30px] flex items-center justify-center cursor-pointer group"
              :data-testid="`cell-${r}-${c}`"
              @click="onCellClick(r, c)"
          >
            <!-- 15x15 교차점 십자선 (Cell 중앙 100% 정합) -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div :class="c === 0 ? 'left-1/2 w-1/2' : c === 14 ? 'right-1/2 w-1/2' : 'w-full'" class="h-[1px] bg-amber-950/70 dark:bg-amber-700/60 absolute"/>
              <div :class="r === 0 ? 'top-1/2 h-1/2' : r === 14 ? 'bottom-1/2 h-1/2' : 'h-full'" class="w-[1px] bg-amber-950/70 dark:bg-amber-700/60 absolute"/>
            </div>

            <!-- 화점 (Star Points: (3,3), (3,11), (7,7), (11,3), (11,11)) -->
            <div
                v-if="(r === 3 || r === 7 || r === 11) && (c === 3 || c === 7 || c === 11)"
                class="size-2 rounded-full bg-amber-950 dark:bg-amber-500 z-0 pointer-events-none absolute"
            />

            <!-- 빈 교차점 마우스 호버 가이드 닷 -->
            <div
                v-if="cell === 0 && winner === null && (!isMulti || isMyTurn)"
                class="size-2.5 rounded-full bg-amber-900/30 dark:bg-amber-400/30 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            />

            <!-- 입체 바둑돌 (Cell 대비 1:1 완벽 정렬 비율 26px) -->
            <div
                v-if="cell !== 0"
                :class="cell === 1 ? 'bg-gradient-to-br from-neutral-700 via-neutral-900 to-black text-white border-neutral-900 shadow-[0_2px_4px_rgba(0,0,0,0.6)]' : 'bg-gradient-to-br from-white via-neutral-100 to-neutral-300 text-black border-neutral-300 shadow-[0_2px_4px_rgba(0,0,0,0.3)]'"
                class="size-[26px] rounded-full z-20 flex items-center justify-center border shadow-md transition-transform duration-100 active:scale-95"
            >
              <!-- 최근 착수한 돌 표시 레드 점 -->
              <span v-if="lastMove && lastMove.r === r && lastMove.c === c" class="size-1.5 rounded-full bg-red-500 shadow-sm animate-pulse"/>
            </div>
          </div>
        </template>
      </div>

      <!-- z-50 오버레이: 보드 컨테이너 내부에서 absolute inset-0으로 덮어 바둑돌 위에 표시 -->
      <GameResultOverlay :restart="resetGame" :show="winner !== null" testid="omok-over" title="대국 종료!" tone="win">
        <span data-testid="winner-text">
          {{ isMulti ? (winner === myStone ? '🎉 축하합니다! 대국에서 승리했습니다!' : '상대방이 승리했습니다.') : (winner === 1 ? '흑돌 승리!' : '백돌 승리!') }}
        </span>
      </GameResultOverlay>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {checkOmokWin, createEmptyOmokBoard} from '../../utils/omok'
import {reportDinoProgressApi, submitRoomClick, type RoomParticipant} from '../../api/games'
import type {DinoParticipantProgress} from '../../composables/useRoomLobby'
import {useGameSound} from '../../composables/useGameSound'
import GameResultOverlay from '../GameResultOverlay.vue'

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

const board = ref<number[][]>(createEmptyOmokBoard())
const currentStone = ref<number>(1) // 1: Black, 2: White
const winner = ref<number | null>(null)
const lastMove = ref<{ r: number; c: number } | null>(null)
const {playSuccess} = useGameSound()

const participantsList = computed(() => props.participants ?? [])
const myIndex = computed(() => {
  if (!props.participantId || participantsList.value.length === 0) return 0
  const idx = participantsList.value.findIndex(p => p.id === props.participantId)
  return idx >= 0 ? idx : 0
})

// 방 생성자/첫번째 입장자 = 흑돌(1), 두번째 입장자 = 백돌(2)
const myStone = computed(() => (myIndex.value === 0 ? 1 : 2))
const isMyTurn = computed(() => {
  if (!props.isMulti) return true
  return currentStone.value === myStone.value
})

// 착수 좌표 (r, c, stone) 정수 인코딩: dinoY = (r * 15 + c) + 1 + (stone === 2 ? 1000 : 0)
function encodeMove(r: number, c: number, stone: number): number {
  return (r * 15 + c) + 1 + (stone === 2 ? 1000 : 0)
}

function decodeMove(dinoY: number): { r: number; c: number; stone: number } {
  const isWhite = dinoY > 1000
  const pos = (isWhite ? dinoY - 1000 : dinoY) - 1
  const r = Math.floor(pos / 15)
  const c = pos % 15
  return { r, c, stone: isWhite ? 2 : 1 }
}

function resetGame() {
  board.value = createEmptyOmokBoard()
  currentStone.value = 1
  winner.value = null
  lastMove.value = null
}

// 상대방의 착수 SSE 메시지 수신
watch(() => props.dinoProgressMap, (map) => {
  if (!props.isMulti || !map) return
  Object.values(map).forEach(prog => {
    if (prog.participantId && prog.participantId !== props.participantId && prog.dinoY !== undefined && prog.dinoY > 0) {
      const { r, c, stone } = decodeMove(prog.dinoY)
      if (r >= 0 && r < 15 && c >= 0 && c < 15 && board.value[r][c] === 0) {
        board.value[r][c] = stone
        lastMove.value = { r, c }
        playSuccess()

        if (checkOmokWin(board.value, c, r, stone)) {
          winner.value = stone
        } else {
          currentStone.value = stone === 1 ? 2 : 1
        }
      }
    }
  })
}, { deep: true })

async function onCellClick(r: number, c: number) {
  if (winner.value !== null || board.value[r][c] !== 0) return
  if (props.isMulti && !isMyTurn.value) return

  board.value[r][c] = currentStone.value
  lastMove.value = { r, c }
  playSuccess()

  const placedStone = currentStone.value
  const hasWon = checkOmokWin(board.value, c, r, placedStone)

  if (hasWon) {
    winner.value = placedStone
    props.submitScore?.(100)
    props.onGameEnd?.()
  } else {
    currentStone.value = placedStone === 1 ? 2 : 1
  }

  if (props.isMulti && props.code && props.participantId && props.roomSessionToken) {
    try {
      const encoded = encodeMove(r, c, placedStone)
      await reportDinoProgressApi(
          'game-omok',
          props.code,
          props.participantId,
          props.roomSessionToken,
          hasWon ? 100 : 0,
          true,
          encoded,
          hasWon,
          false
      )

      if (hasWon) {
        await submitRoomClick('game-omok', props.code, props.participantId, props.roomSessionToken)
      }
    } catch {}
  }
}
</script>

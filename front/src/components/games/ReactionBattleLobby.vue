<template>
  <BattleLobbyShell
      :game-id="props.gameId"
      :code="code"
      :phase="shellPhase"
      :participants="lobby.participants.value"
      :participant-id="lobby.participantId.value"
      :is-host="lobby.isHost.value"
      :error="lobby.error.value"
      :max-players="5"
      testid-prefix="battle"
      @create="onCreate"
      @join="onJoin"
      @start="onStart"
      @leave="onLeave"
  >
    <!-- 게임 중 화면 -->
    <div v-if="shellPhase === 'playing'">
      <!-- 클릭 패널 -->
      <div v-if="!lobby.hasSubmitted.value" class="py-4">
        <div
            :class="[
              'reaction-area flex h-56 w-full max-w-md cursor-pointer select-none items-center justify-center rounded-xl text-lg font-semibold transition-[background-color,color,transform] mx-auto',
              isGoReady ? 'bg-zone-accent text-white dark:text-background scale-[1.02] shadow-[0_0_40px_color-mix(in_oklch,var(--zone-accent)_40%,transparent)]' : 'bg-muted text-muted-foreground'
            ]"
            data-testid="battle-go"
            @click="onClick"
        >
          <div class="flex flex-col items-center gap-2">
            <span class="text-2xl font-bold">{{ isGoReady ? '지금 클릭!' : '기다리세요…' }}</span>
            <span class="text-xs opacity-80">{{ isGoReady ? '신호를 보는 즉시 클릭하세요' : '신호가 뜨면 클릭하세요' }}</span>
          </div>
        </div>
      </div>

      <!-- 결과 -->
      <div v-else class="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
        <!-- 반응속도(ms) 또는 부정 출발 대형 표시 (싱글과 UI 통일) -->
        <div class="flex flex-col items-center gap-1 my-2">
          <p v-if="myResult?.falseStart" class="text-sm font-medium text-destructive text-center" data-testid="reaction-false-start">
            너무 빨랐습니다! (부정 출발)
          </p>
          <p v-else-if="myResult?.elapsedMs != null" class="font-mono text-4xl font-bold text-foreground" data-testid="reaction-result">
            {{ Math.round(myResult.elapsedMs) }}ms
          </p>
        </div>

        <p class="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">전체 순위</p>
        <div class="flex w-full flex-col gap-2">
          <div
              v-for="r in lobby.results.value"
              :key="r.participantId"
              class="flex items-center gap-3 rounded-xl border px-4 py-2.5"
              :class="r.rank === 1
                ? 'border-amber-500/50 bg-amber-500/10'
                : 'border-border/50 bg-muted/20'"
              data-testid="battle-result-row"
          >
            <span class="font-mono text-sm font-bold" :class="r.rank === 1 ? 'text-amber-400' : 'text-muted-foreground'">
              {{ r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : '' }}
            </span>
            <!-- 테스트 호환: 'N등 — 닉네임' 형식으로 텍스트 포함 -->
            <span class="flex-1 text-sm font-medium text-foreground">{{ r.rank }}등 — {{ r.nickname }}</span>
            <span v-if="r.elapsedMs != null && !r.falseStart" class="font-mono text-sm font-semibold text-zone-accent">
              {{ Math.round(r.elapsedMs) }}ms
            </span>
            <span v-if="r.falseStart" class="text-[10px] font-mono text-destructive border border-destructive/30 bg-destructive/10 px-2 py-0.5 rounded-full">부정 출발</span>
          </div>
        </div>
        <p class="text-[11px] text-muted-foreground/70 text-center font-mono">참가자별 네트워크 지연이 순위에 영향을 줄 수 있습니다</p>
        <button
            v-if="lobby.isHost.value"
            class="flex items-center gap-2 rounded-2xl bg-zone-accent px-6 py-3 text-sm font-bold text-white shadow-[0_0_20px_color-mix(in_oklch,var(--zone-accent)_35%,transparent)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_0_30px_color-mix(in_oklch,var(--zone-accent)_50%,transparent)] active:scale-95"
            data-testid="battle-next-round"
            type="button"
            @click="onNextRound"
        >
          <RotateCcw class="size-4"/>
          다음 라운드
        </button>
      </div>
    </div>
  </BattleLobbyShell>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {RotateCcw} from 'lucide-vue-next'
import {useRoomLobby} from '../../composables/useRoomLobby'
import {generateNickname} from '../../utils/randomNickname'
import {accessToken} from '../../composables/useAuth'
import BattleLobbyShell from './BattleLobbyShell.vue'

const props = defineProps<{ gameId: string }>()

const lobby = useRoomLobby()
const code = computed(() => lobby.code.value)

const shellPhase = computed(() => {
  if (!code.value) return 'lobby' as const
  const phase = lobby.round.value.phase
  if (phase === 'lobby') return 'lobby' as const
  return 'playing' as const
})

const isGoReady = ref(false)
let goTimer: ReturnType<typeof setTimeout> | null = null

function clearGoTimer() {
  if (goTimer) {
    clearTimeout(goTimer)
    goTimer = null
  }
}

function updateGoStatus() {
  clearGoTimer()
  const goAtStr = lobby.round.value.goAt
  if (!goAtStr) {
    isGoReady.value = true
    return
  }
  const targetTime = new Date(goAtStr).getTime()
  const now = Date.now()
  const diff = targetTime - now
  if (diff <= 0) {
    isGoReady.value = true
  } else {
    isGoReady.value = false
    goTimer = setTimeout(() => {
      isGoReady.value = true
    }, diff)
  }
}

watch(() => lobby.round.value.goAt, () => {
  updateGoStatus()
})

watch(shellPhase, (phase) => {
  if (phase === 'playing') {
    updateGoStatus()
  } else {
    clearGoTimer()
    isGoReady.value = false
  }
})

function handleBeforeUnload() {
  lobby.leaveBeacon(props.gameId)
}

async function onLeave() {
  clearGoTimer()
  await lobby.leave(props.gameId)
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  onLeave()
})

const myResult = computed(() => lobby.results.value.find(r => r.participantId === lobby.participantId.value))

function guestOrRealNickname() {
  return accessToken.value ? undefined : generateNickname()
}

async function onCreate() {
  try { await lobby.create(props.gameId, guestOrRealNickname()) } catch { /* lobby.error */ }
}
async function onJoin(inputCode: string) {
  if (!inputCode) return
  try { await lobby.join(props.gameId, inputCode, guestOrRealNickname()) } catch { /* lobby.error */ }
}
async function onStart() { await lobby.startRound(props.gameId) }
async function onClick() { await lobby.submitClick(props.gameId) }
async function onNextRound() { await lobby.nextRound(props.gameId) }
</script>


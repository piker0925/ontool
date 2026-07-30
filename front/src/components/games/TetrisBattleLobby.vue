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
      :countdown="countdown"
      testid-prefix="tetris"
      @create="onCreate"
      @join="onJoin"
      @start="onStart"
      @leave="onLeave"
  >
    <div v-if="shellPhase === 'playing'">
      <div v-if="!lobby.hasSubmitted.value">
        <TetrisBoard
            ref="tetrisBoardRef"
            :code="code ?? undefined"
            :is-multi="true"
            :participant-id="lobby.participantId.value || undefined"
            :room-session-token="lobby.roomSessionToken.value || undefined"
            :on-game-end="handleGameEnd"
        />
      </div>

      <!-- 배틀 결과 화면 -->
      <div v-else class="flex flex-col items-center gap-4 w-full max-w-sm mx-auto py-6 select-none">
        <p class="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">테트리스 배틀 결과</p>
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
            <span class="flex-1 text-sm font-medium text-foreground">{{ r.rank }}등 — {{ r.nickname }}</span>
          </div>
        </div>
        <button
            v-if="lobby.isHost.value"
            class="flex items-center gap-2 rounded-2xl bg-zone-accent px-6 py-3 text-sm font-bold text-white shadow-[0_0_20px_color-mix(in_oklch,var(--zone-accent)_35%,transparent)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_0_30px_color-mix(in_oklch,var(--zone-accent)_50%,transparent)] active:scale-95 mt-2"
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
import {computed, ref, watch} from 'vue'
import {RotateCcw} from 'lucide-vue-next'
import {useRoomLobby} from '../../composables/useRoomLobby'
import {generateNickname} from '../../utils/randomNickname'
import {accessToken} from '../../composables/useAuth'
import BattleLobbyShell from './BattleLobbyShell.vue'
import TetrisBoard from './TetrisBoard.vue'

const props = defineProps<{ gameId: string }>()
const lobby = useRoomLobby()
const code = computed(() => lobby.code.value)
const countdown = ref(3)
const tetrisBoardRef = ref<InstanceType<typeof TetrisBoard> | null>(null)

const shellPhase = computed(() => {
  if (!code.value) return 'lobby' as const
  const p = lobby.round.value.phase
  if (p === 'lobby') return 'lobby' as const
  if (p === 'countdown') return 'countdown' as const
  return 'playing' as const
})

watch(() => lobby.round.value.phase, (p) => {
  if (p === 'countdown') {
    countdown.value = 3
    const t = setInterval(() => { countdown.value--; if (countdown.value <= 0) clearInterval(t) }, 1000)
  }
})

// 다른 참가자로부터의 방해 블록 공격 수신
watch(() => lobby.tetrisGarbageAttackEvent.value, (evt) => {
  if (!evt || evt.attackerParticipantId === lobby.participantId.value) return
  tetrisBoardRef.value?.receiveGarbageLines(evt.garbageLinesAdded, evt.attackerNickname)
})

function guestOrRealNickname() { return accessToken.value ? undefined : generateNickname() }
async function onCreate() { try { await lobby.create(props.gameId, guestOrRealNickname()) } catch {} }
async function onJoin(inputCode: string) { if (!inputCode) return; try { await lobby.join(props.gameId, inputCode, guestOrRealNickname()) } catch {} }
async function onStart() { await lobby.startRound(props.gameId) }
async function onLeave() { await lobby.leave(props.gameId) }
async function handleGameEnd() {
  await lobby.submitClick(props.gameId)
}
async function onNextRound() {
  await lobby.nextRound(props.gameId)
}
</script>

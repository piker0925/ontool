<template>
  <BattleLobbyShell
      :game-id="props.gameId"
      :code="code"
      :phase="shellPhase"
      :participants="lobby.participants.value"
      :is-host="lobby.isHost.value"
      :error="lobby.error.value"
      :max-players="5"
      :countdown="countdown"
      testid-prefix="battle"
      @create="onCreate"
      @join="onJoin"
      @start="onStart"
  >
    <!-- 게임 중 화면 -->
    <div v-if="shellPhase === 'playing'">
      <!-- GO! 클릭 패널 -->
      <div
          v-if="!lobby.hasSubmitted.value"
          class="flex h-60 w-full max-w-md cursor-pointer select-none items-center justify-center rounded-2xl border border-zone-accent/40 bg-zone-accent/10 backdrop-blur-md shadow-[0_0_40px_color-mix(in_oklch,var(--zone-accent)_30%,transparent)] transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[0_0_55px_color-mix(in_oklch,var(--zone-accent)_45%,transparent)] active:scale-[0.98] mx-auto"
          data-testid="battle-go"
          @click="onClick"
      >
        <div class="flex flex-col items-center gap-2">
          <span class="font-mono text-6xl font-black text-zone-accent drop-shadow-[0_0_20px_var(--zone-accent)]">GO!</span>
          <span class="font-mono text-xs text-muted-foreground">신호를 보는 즉시 클릭하세요</span>
        </div>
      </div>

      <!-- 결과 -->
      <div v-else class="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
        <p class="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">결과</p>
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
import {computed, ref, watch} from 'vue'
import {RotateCcw} from 'lucide-vue-next'
import {useRoomLobby} from '../../composables/useRoomLobby'
import {generateNickname} from '../../utils/randomNickname'
import {accessToken} from '../../composables/useAuth'
import BattleLobbyShell from './BattleLobbyShell.vue'

const props = defineProps<{ gameId: string }>()

const lobby = useRoomLobby()
const code = computed(() => lobby.code.value)

// 카운트다운
const countdown = ref(3)
const shellPhase = computed(() => {
  if (!code.value) return 'lobby' as const
  const phase = lobby.round.value.phase
  if (phase === 'lobby') return 'lobby' as const
  if (phase === 'countdown') return 'countdown' as const
  return 'playing' as const
})

watch(() => lobby.round.value.phase, (p) => {
  if (p === 'countdown') {
    countdown.value = 3
    const t = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(t)
    }, 1000)
  }
})

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

<template>
  <BattleLobbyShell
      :game-id="props.gameId"
      :code="code"
      :phase="shellPhase"
      :participants="lobby.participants.value"
      :participant-id="lobby.participantId.value"
      :is-host="lobby.isHost.value"
      :error="lobby.error.value"
      :max-players="2"
      :countdown="countdown"
      testid-prefix="baseball"
      @create="onCreate"
      @join="onJoin"
      @start="onStart"
  >
    <NumberBaseballBoard
        :code="code ?? undefined"
        :dino-progress-map="lobby.dinoProgressMap.value"
        :is-multi="true"
        :participant-id="lobby.participantId.value || undefined"
        :participants="lobby.participants.value"
        :room-session-token="lobby.roomSessionToken.value || undefined"
    />
  </BattleLobbyShell>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {useRoomLobby} from '../../composables/useRoomLobby'
import {generateNickname} from '../../utils/randomNickname'
import {accessToken} from '../../composables/useAuth'
import BattleLobbyShell from './BattleLobbyShell.vue'
import NumberBaseballBoard from './NumberBaseballBoard.vue'

const props = defineProps<{ gameId: string }>()
const lobby = useRoomLobby()
const code = computed(() => lobby.code.value)
const countdown = ref(3)

const shellPhase = computed(() => {
  if (!code.value) return 'lobby' as const
  const p = lobby.round.value.phase as string
  if (p === 'lobby') return 'lobby' as const
  if (p === 'countdown') return 'countdown' as const
  return 'playing' as const
})

watch(() => lobby.round.value.phase as string, (p) => {
  if (p === 'go') {
    countdown.value = 3
    const t = setInterval(() => { countdown.value--; if (countdown.value <= 0) clearInterval(t) }, 1000)
  }
})

function guestOrRealNickname() { return accessToken.value ? undefined : generateNickname() }
async function onCreate() { try { await lobby.create(props.gameId, guestOrRealNickname()) } catch {} }
async function onJoin(inputCode: string) { if (!inputCode) return; try { await lobby.join(props.gameId, inputCode, guestOrRealNickname()) } catch {} }
async function onStart() { await lobby.startRound(props.gameId) }
</script>

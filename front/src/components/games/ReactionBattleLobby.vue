<template>
  <div class="flex flex-col items-center gap-4 py-10">
    <div v-if="!code" class="flex flex-col items-center gap-4">
      <button
          class="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          data-testid="battle-create"
          @click="onCreate"
      >방 만들기
      </button>

      <div class="flex items-center gap-2">
        <input
            v-model="joinCodeInput"
            class="w-24 rounded-md border border-input bg-transparent px-3 py-2 text-center text-sm"
            data-testid="battle-join-code-input"
            maxlength="4"
            placeholder="코드 입력"
        />
        <button
            class="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
            data-testid="battle-join-submit"
            @click="onJoin"
        >입장
        </button>
      </div>

      <p v-if="lobby.error.value" class="text-sm text-destructive" data-testid="battle-error">{{ lobby.error.value }}</p>
    </div>

    <div v-else-if="lobby.round.value.phase === 'lobby'" class="flex flex-col items-center gap-3">
      <p class="text-sm text-muted-foreground">방 코드</p>
      <p class="font-mono text-3xl tracking-widest" data-testid="battle-code-display">{{ code }}</p>
      <div class="flex flex-col items-center gap-1" data-testid="battle-participants">
        <p v-for="p in lobby.participants.value" :key="p.id" class="text-sm text-foreground">{{ p.nickname }}</p>
      </div>
      <button
          v-if="lobby.isHost.value"
          class="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          data-testid="battle-start"
          @click="onStart"
      >게임 시작
      </button>
      <p v-else class="text-sm text-muted-foreground">방장이 시작하기를 기다리는 중...</p>
    </div>

    <div
        v-else-if="!lobby.hasSubmitted.value"
        class="flex h-56 w-full max-w-md cursor-pointer select-none items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground"
        data-testid="battle-go"
        @click="onClick"
    >GO!
    </div>

    <div v-else class="flex flex-col items-center gap-2">
      <p v-for="r in lobby.results.value" :key="r.participantId" class="text-sm text-foreground" data-testid="battle-result-row">
        {{ r.rank }}등 — {{ r.nickname }}{{ r.falseStart ? ' (부정 출발)' : '' }}
      </p>
      <p class="mt-2 text-xs text-muted-foreground">참가자별 네트워크 지연(핑) 차이가 순위에 영향을 줄 수 있습니다.</p>
      <button
          v-if="lobby.isHost.value"
          class="mt-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          data-testid="battle-next-round"
          @click="onNextRound"
      >다음 라운드
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {useRoomLobby} from '../../composables/useRoomLobby'
import {generateNickname} from '../../utils/randomNickname'
import {accessToken} from '../../composables/useAuth'

const props = defineProps<{ gameId: string }>()

const lobby = useRoomLobby()
const joinCodeInput = ref('')
const code = computed(() => lobby.code.value)

// 로그인 유저는 서버가 실제 계정 닉네임으로 강제 대체하므로, 여기서 보내는 닉네임은
// 게스트일 때만 실제로 쓰인다(193 결정 사항).
function guestOrRealNickname() {
  return accessToken.value ? undefined : generateNickname()
}

// 실패 시 메시지는 lobby.error가 이미 들고 있다(useRoomLobby) — 여기서는 화면 이벤트 핸들러
// 밖으로 미처리 rejection이 새어나가지 않게 잡아 버리기만 한다.
async function onCreate() {
  try {
    await lobby.create(props.gameId, guestOrRealNickname())
  } catch {
    // no-op — lobby.error already holds the message
  }
}

async function onJoin() {
  if (!joinCodeInput.value) return
  try {
    await lobby.join(props.gameId, joinCodeInput.value, guestOrRealNickname())
  } catch {
    // no-op — lobby.error already holds the message
  }
}

async function onStart() {
  await lobby.startRound(props.gameId)
}

async function onClick() {
  await lobby.submitClick(props.gameId)
}

async function onNextRound() {
  await lobby.nextRound(props.gameId)
}
</script>

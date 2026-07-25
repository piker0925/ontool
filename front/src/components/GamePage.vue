<template>
  <div class="flex flex-col gap-3">
    <div class="grid grid-cols-1 items-center gap-x-3 gap-y-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[1fr_auto_1fr] sm:gap-y-2">
      <div class="flex min-w-0 flex-col gap-0.5">
        <h1 class="text-lg font-semibold tracking-tight text-foreground">{{ title }}</h1>
        <p v-if="description" class="text-[13px] text-muted-foreground">{{ description }}</p>
      </div>

      <!-- 좌측 제목·우측 빈 스페이서와 동일한 1fr 트랙 사이에 놓여, 헤더 바 전체를 기준으로
           실제로 가운데 정렬된다(자기 컬럼 안에서만 가운데인 게 아님) — CSS 그리드의
           대칭 트랙 폭 특성을 이용한다. 모바일(grid-cols-1)에서는 제목 아래 한 줄로 쌓인다. -->
      <div class="flex items-center justify-center gap-2">
        <button
            v-if="gameId"
            :aria-pressed="showLeaderboard"
            class="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-mono text-[12px] text-muted-foreground transition-colors hover:border-zone-accent/40 hover:text-zone-accent"
            data-testid="game-leaderboard-toggle"
            type="button"
            @click="showLeaderboard = !showLeaderboard"
        >
          <Trophy aria-hidden="true" class="size-3.5"/>
          순위표
        </button>
        <button
            :aria-label="muted ? '효과음 켜기' : '효과음 끄기'"
            :aria-pressed="muted"
            class="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-zone-accent/40 hover:text-zone-accent"
            data-testid="game-mute-toggle"
            type="button"
            @click="toggleMuted"
        >
          <component :is="muted ? VolumeX : Volume2" aria-hidden="true" class="size-4"/>
        </button>
        <button
            class="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-mono text-[12px] text-muted-foreground transition-colors hover:border-zone-accent/40 hover:text-zone-accent"
            data-testid="game-restart"
            @click="restart"
        >
          <RotateCcw aria-hidden="true" class="size-3.5"/>
          다시 시작
        </button>
      </div>

      <!-- 우측 균형용 빈 스페이서 — 좌측 제목과 같은 1fr 트랙이라 버튼 그룹이 헤더 바 전체
           기준으로 가운데에 오게 만든다. 모바일에서는 별도 줄을 차지하지 않도록 숨긴다. -->
      <div aria-hidden="true" class="hidden sm:block"></div>
    </div>

    <GameLeaderboardPanel v-if="gameId && showLeaderboard" ref="leaderboardPanelRef" :game-id="gameId"/>

    <div :key="restartKey" class="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <slot :restart="restart" :submit-score="submitScore"/>
    </div>

    <!-- 053: 게임 종료(submitScore 호출) 이후에만 뜨는 로그인 유인 문구. 비로그인 상태에서만 보인다 —
         로그인 사용자는 자동 등록되고 토스트로 결과를 알리므로 이 문구가 필요 없다. -->
    <p
        v-if="gameId && loginHintVisible && !isLoggedIn"
        aria-live="polite"
        class="text-center text-[12px] text-muted-foreground"
        data-testid="game-login-hint"
    >
      로그인하면 순위표에 자동으로 등록돼요
    </p>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {RotateCcw, Trophy, Volume2, VolumeX} from 'lucide-vue-next'
import {toast} from 'vue-sonner'
import {useGameSound} from '../composables/useGameSound'
import {useAuth} from '../composables/useAuth'
import {startGameSession, submitGameScore} from '../api/games'
import GameLeaderboardPanel from './GameLeaderboardPanel.vue'

// gameId는 GameCatalog(백엔드)에 등록된 게임(053의 8개 + 121의 8개, 총 16개)에서만 넘어온다 —
// 뽀모도로처럼 점수 개념이 없는 FULL_SHELL_COMPONENTS 입주 모듈은 gameId 없이 GamePage를 쓰고,
// 그 경우 순위표·제출 로직 전체가 조용히 비활성화된다.
const props = defineProps<{ title: string; description?: string; gameId?: string }>()

const {muted, toggleMuted} = useGameSound()
const {isLoggedIn} = useAuth()

// key를 바꿔 slot 콘텐츠를 통째로 재마운트한다 — 게임마다 개별 reset()을 구현하지 않아도
// "재시작 시 상태 완전 초기화"가 항상 보장된다.
const restartKey = ref(0)
const showLeaderboard = ref(false)
const loginHintVisible = ref(false)
const leaderboardPanelRef = ref<InstanceType<typeof GameLeaderboardPanel> | null>(null)

// 게임 시작(최초 마운트·재시작)마다 서버 세션 토큰을 새로 받는다 — 점수 제출 시 서버가 이 토큰의
// 발급 시각으로부터 "최소 플레이 시간"을 검증한다(GameScoreService, 053). 발급 실패는 조용히
// 무시한다 — 세션 없이도 게임 자체(표시)는 항상 정상 동작해야 하고, 제출 시점에 토큰이 없으면
// submitScore가 자동으로 건너뛴다.
let sessionToken: string | null = null
async function refreshSession() {
  sessionToken = null
  if (!props.gameId) return
  try {
    sessionToken = await startGameSession(props.gameId)
  } catch {
    sessionToken = null
  }
}
refreshSession()

function restart() {
  restartKey.value++
  loginHintVisible.value = false
  refreshSession()
}

// 게임이 끝났을 때 각 보드 컴포넌트가 자신의 도메인 고유 점수 값(2048 점수, 반응속도 ms, 시도 횟수 등)
// 그대로 호출한다 — "높을수록/낮을수록 좋다"의 방향은 백엔드 GameCatalog가 게임별로 판단한다.
async function submitScore(score: number) {
  if (!props.gameId) return
  loginHintVisible.value = true
  if (!isLoggedIn.value || !sessionToken) return
  try {
    await submitGameScore(props.gameId, score, sessionToken)
    toast.success('순위표에 등록됐어요')
    leaderboardPanelRef.value?.reload()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    toast.error(err.response?.data?.message ?? '점수 등록에 실패했습니다. 다시 시작해 새로 도전해 주세요.')
  }
}
</script>

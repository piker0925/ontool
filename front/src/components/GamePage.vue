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
            @click="toggleLeaderboard"
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
      <!-- 방금 제출한 점수 그 자체의 순위 — 별도로 열어야 하는 순위표 패널 안에 두면 못 보고
           지나친다는 피드백(174 이후)을 받아, 게임 결과가 뜨는 바로 이 카드 안에 함께 보여준다. -->
      <p
          v-if="lastRoundRank != null"
          aria-live="polite"
          class="mb-3 text-center text-[13px] text-foreground"
          data-testid="game-last-round-rank"
      >
        이번 판 순위 <span class="font-mono font-semibold text-zone-accent">{{ lastRoundRank }}</span>위
      </p>
      <slot :restart="restart" :submit-score="submitScore" :on-game-end="onGameEnd"/>
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

// gameId는 GameCatalog(백엔드)에 등록된 게임(총 14개)에서만 넘어온다 —
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
// 방금 제출한 점수 그 자체의 순위 — GameLeaderboardPanel의 myRank(역대 최고 기록 기준)와 별개로
// "이번 판은 몇 등이었는지"를 보여주기 위함(174 이후 사용자 피드백: 최고 기록만 보이면 헷갈림).
const lastRoundRank = ref<number | null>(null)

// 174: 자동으로 열린 순위표를 사용자가 직접 닫으면, 이 GamePage 인스턴스가 살아있는 동안
// (재시작을 반복해도) 더는 자동으로 다시 열지 않는다 — 매 판마다 팝업이 뜨면 방해가 되므로
// "한 번 닫으면 그 이후는 수동 토글로만" 원칙을 둔다(166: 방해 최소화 원칙과 동일).
// 수동 토글 버튼 자체는 이 플래그와 무관하게 항상 살아있다.
// hasAutoOpened로 "자동으로 열렸던 적이 있는지"를 따로 추적한다 — 게임 도중 사용자가 순위표를
// 스스로 열어봤다가 닫는 것까지 억제 대상으로 삼으면 안 된다(그러면 정작 게임이 끝났을 때 한 번도
// 자동으로 안 뜨는 문제가 생긴다). 억제는 "자동으로 뜬 걸 닫았을 때"만 걸린다.
const autoOpenSuppressed = ref(false)
let hasAutoOpened = false

function toggleLeaderboard() {
  showLeaderboard.value = !showLeaderboard.value
  if (!showLeaderboard.value && hasAutoOpened) autoOpenSuppressed.value = true
}

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
  lastRoundRank.value = null
  refreshSession()
}

// 174: 게임 결과 오버레이(GameResultOverlay)가 뜨는 시점(승/패/무승부 불문)에 각 보드 컴포넌트가
// 호출한다 — submitScore와는 독립적인 신호다. 대부분의 게임은 결과가 하나뿐이라 submitScore와 항상
// 같이 호출되지만, 지뢰찾기(패배)처럼 "오버레이는 뜨지만 제출할 점수는 없는" 결과도 있어서(순위표에
// 의미 없는 결과는 제출하지 않는다는 기존 결정, 각 보드 파일 주석 참조) submitScore 하나로는 모든
// 종료 시점을 포착할 수 없다.
function onGameEnd() {
  if (!props.gameId) return
  if (!autoOpenSuppressed.value) {
    showLeaderboard.value = true
    hasAutoOpened = true
  }
}

// 게임이 끝났을 때 각 보드 컴포넌트가 자신의 도메인 고유 점수 값(2048 점수, 반응속도 ms, 시도 횟수 등)
// 그대로 호출한다 — "높을수록/낮을수록 좋다"의 방향은 백엔드 GameCatalog가 게임별로 판단한다.
async function submitScore(score: number) {
  if (!props.gameId) return
  loginHintVisible.value = true
  if (!isLoggedIn.value || !sessionToken) return
  try {
    const result = await submitGameScore(props.gameId, score, sessionToken)
    lastRoundRank.value = result?.rank ?? null
    toast.success('순위표에 등록됐어요')
    leaderboardPanelRef.value?.reload()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    toast.error(err.response?.data?.message ?? '점수 등록에 실패했습니다. 다시 시작해 새로 도전해 주세요.')
  }
}
</script>

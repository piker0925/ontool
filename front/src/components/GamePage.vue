<template>
  <div class="flex flex-col gap-4 max-w-4xl mx-auto px-2">
    <!-- 글래스모피즘 메인 헤더 바 -->
    <div class="grid grid-cols-1 items-center gap-x-4 gap-y-3 rounded-2xl border border-border/80 bg-muted/40 p-4 sm:p-5 shadow-xl backdrop-blur-xl sm:grid-cols-[1fr_auto_1fr]">
      <div class="flex min-w-0 flex-col gap-1">
        <h1 class="text-xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground via-zone-accent to-foreground sm:text-2xl flex items-center gap-2">
          <span>🎮</span> {{ title }}
        </h1>
        <p v-if="description" class="text-xs text-muted-foreground leading-relaxed">{{ description }}</p>
      </div>

      <!-- 중앙 정렬 컨트롤 액션 칩스 -->
      <div class="flex items-center justify-center gap-2">
        <button
            v-if="gameId"
            :aria-pressed="showLeaderboard"
            class="flex items-center gap-1.5 rounded-full border border-border/80 bg-background/60 px-3.5 py-1.5 font-mono text-xs font-medium text-muted-foreground transition-[border-color,color,box-shadow,transform] duration-150 hover:border-zone-accent/50 hover:text-zone-accent hover:shadow-md active:scale-95"
            data-testid="game-leaderboard-toggle"
            type="button"
            @click="toggleLeaderboard"
        >
          <Trophy aria-hidden="true" class="size-3.5 text-amber-400"/>
          순위표
        </button>

        <button
            :aria-label="muted ? '효과음 켜기' : '효과음 끄기'"
            :aria-pressed="muted"
            class="flex size-8.5 items-center justify-center rounded-full border border-border/80 bg-background/60 text-muted-foreground transition-[border-color,color,box-shadow,transform] duration-150 hover:border-zone-accent/50 hover:text-zone-accent active:scale-95 shadow-sm"
            data-testid="game-mute-toggle"
            type="button"
            @click="toggleMuted"
        >
          <component :is="muted ? VolumeX : Volume2" aria-hidden="true" class="size-4"/>
        </button>

        <button
            class="flex items-center gap-1.5 rounded-full border border-border/80 bg-background/60 px-3.5 py-1.5 font-mono text-xs font-medium text-muted-foreground transition-[border-color,color,box-shadow,transform] duration-150 hover:border-zone-accent/50 hover:text-zone-accent hover:shadow-md active:scale-95"
            data-testid="game-restart"
            @click="restart"
        >
          <RotateCcw aria-hidden="true" class="size-3.5"/>
          다시 시작
        </button>

        <button
            v-if="gameId"
            :aria-pressed="isFav"
            :class="isFav ? 'border-amber-400/60 bg-amber-400/10 text-amber-400' : 'border-border/80 bg-background/60 text-muted-foreground hover:border-amber-400/50 hover:text-amber-400'"
            :title="isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'"
            class="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-xs font-medium transition-[border-color,color,box-shadow,transform] duration-150 hover:shadow-md active:scale-95"
            data-testid="game-favorite-toggle"
            type="button"
            @click="toggleFav"
        >
          <Star :class="isFav ? 'fill-amber-400' : ''" aria-hidden="true" class="size-3.5"/>
          즐겨찾기
        </button>

        <button
            v-if="gameId"
            :aria-pressed="liked"
            :class="liked ? 'border-rose-400/60 bg-rose-400/10 text-rose-400' : 'border-border/80 bg-background/60 text-muted-foreground hover:border-rose-400/50 hover:text-rose-400'"
            :disabled="likePending"
            :title="liked ? '좋아요 취소' : '좋아요'"
            class="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-xs font-medium transition-[border-color,color,box-shadow,transform] duration-150 hover:shadow-md active:scale-95 disabled:opacity-60"
            data-testid="game-like-toggle"
            type="button"
            @click="toggleLike"
        >
          <Heart :class="liked ? 'fill-rose-400' : ''" aria-hidden="true" class="size-3.5"/>
          {{ stats?.likeCount ?? 0 }}
        </button>
      </div>

      <div aria-hidden="true" class="hidden sm:block"></div>
    </div>

    <GameLeaderboardPanel
        v-if="gameId && showLeaderboard"
        ref="leaderboardPanelRef"
        :game-id="gameId"
        :last-submitted-id="lastSubmittedId"
    />

    <!-- 게임 실시간 캔버스/보드 컨테이너 카드 -->
    <div :key="restartKey" class="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md sm:p-6 transition-[box-shadow] duration-200">
      <p
          v-if="lastRoundRank != null"
          aria-live="polite"
          class="mb-3 text-center text-xs font-medium text-foreground bg-zone-accent/10 border border-zone-accent/30 py-1.5 px-3 rounded-full w-max mx-auto animate-pulse"
          data-testid="game-last-round-rank"
      >
        🏆 이번 판 순위: <span class="font-mono font-bold text-zone-accent">{{ lastRoundRank }}</span>위
      </p>

      <slot :restart="restart" :submit-score="submitScore" :on-game-end="onGameEnd"/>
    </div>

    <p
        v-if="gameId && loginHintVisible && !isLoggedIn"
        aria-live="polite"
        class="text-center text-xs text-muted-foreground/80 font-mono"
        data-testid="game-login-hint"
    >
      🔒 로그인하면 글로벌 순위표에 자동으로 기록이 등록됩니다.
    </p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {Heart, RotateCcw, Star, Trophy, Volume2, VolumeX} from 'lucide-vue-next'
import {toast} from 'vue-sonner'
import {apiClient} from '../api/client'
import {useGameSound} from '../composables/useGameSound'
import {useAuth} from '../composables/useAuth'
import {useFavorites} from '../composables/useFavorites'
import {useLikes} from '../composables/useLikes'
import {startGameSession, submitGameScore} from '../api/games'
import GameLeaderboardPanel from './GameLeaderboardPanel.vue'

const props = defineProps<{ title: string; description?: string; gameId?: string }>()

const {muted, toggleMuted} = useGameSound()
const {isLoggedIn} = useAuth()

// 도구 페이지(ToolPage)의 즐겨찾기·좋아요와 동일하게 gameId를 도구 모듈 ID로 취급한다 —
// 백엔드 통계·좋아요 API가 모듈 ID로 범용 조회되므로 게임도 그대로 재사용 가능하다.
const {isFavorite, toggle: toggleFavorite} = useFavorites()
const isFav = computed(() => props.gameId ? isFavorite(props.gameId) : false)
function toggleFav() {
  if (props.gameId) toggleFavorite(props.gameId)
}

interface GameStats {
  moduleId: string
  useCount: number
  likeCount: number
}

const stats = ref<GameStats | null>(null)
const likePending = ref(false)
const {isLiked, markLiked, markUnliked} = useLikes()
const liked = computed(() => props.gameId ? isLiked(props.gameId) : false)

async function loadStats() {
  if (!props.gameId) return
  try {
    const {data} = await apiClient.get<GameStats>(`/api/v1/tools/${props.gameId}/stats`)
    stats.value = data
  } catch {
    stats.value = null
  }
}
loadStats()

async function toggleLike() {
  if (!props.gameId || likePending.value) return
  const gameId = props.gameId
  likePending.value = true
  try {
    if (liked.value) {
      const {data} = await apiClient.delete<GameStats>(`/api/v1/tools/${gameId}/like`)
      stats.value = data
      markUnliked(gameId)
    } else {
      const {data} = await apiClient.post<GameStats>(`/api/v1/tools/${gameId}/like`)
      stats.value = data
      markLiked(gameId)
    }
  } catch {
    // 서버 오류 시 상태 변경하지 않음
  } finally {
    likePending.value = false
  }
}

const restartKey = ref(0)
const showLeaderboard = ref(false)
const loginHintVisible = ref(false)
const leaderboardPanelRef = ref<InstanceType<typeof GameLeaderboardPanel> | null>(null)
const lastRoundRank = ref<number | null>(null)
const lastSubmittedId = ref<number | null>(null)

const autoOpenSuppressed = ref(false)
let hasAutoOpened = false

function toggleLeaderboard() {
  showLeaderboard.value = !showLeaderboard.value
  if (!showLeaderboard.value && hasAutoOpened) autoOpenSuppressed.value = true
}

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
  lastSubmittedId.value = null
  refreshSession()
}

function onGameEnd() {
  if (!props.gameId) return
  if (!autoOpenSuppressed.value) {
    showLeaderboard.value = true
    hasAutoOpened = true
  }
}

async function submitScore(score: number) {
  if (!props.gameId) return
  loginHintVisible.value = true
  if (!isLoggedIn.value || !sessionToken) return
  try {
    const result = await submitGameScore(props.gameId, score, sessionToken)
    lastRoundRank.value = result?.rank ?? null
    lastSubmittedId.value = result?.id ?? null
    toast.success('순위표에 등록됐어요')
    leaderboardPanelRef.value?.reload()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    toast.error(err.response?.data?.message ?? '점수 등록에 실패했습니다. 다시 시작해 새로 도전해 주세요.')
  }
}
</script>

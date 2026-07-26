<template>
  <!-- 게임 화면 전체 폭(워크벤치 카드 폭)을 그대로 물려받으면 이름·점수 두 칼럼짜리 목록이
       좌우로 과하게 늘어나 보인다 — 실제 콘텐츠 폭에 맞춰 좁게 제한하고 가운데 정렬한다. -->
  <div class="mx-auto flex w-full max-w-md flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3" data-testid="game-leaderboard-panel">
    <p v-if="loading" aria-live="polite" class="text-[12px] text-muted-foreground">불러오는 중…</p>
    <p v-else-if="error" aria-live="polite" class="text-[12px] text-destructive">순위표를 불러오지 못했습니다. 잠시 후 다시 열어보세요.</p>
    <template v-else>
      <!-- 방금 제출한 점수 그 자체의 순위 — 아래 "역대 최고 기록" 줄과는 다른 정보라 헷갈리지
           않도록 맨 위, 강조된 톤으로 별도 표시한다. -->
      <p v-if="lastRoundRank != null" class="text-[12px] text-foreground" data-testid="leaderboard-last-round-rank">
        이번 판 내 순위 <span class="font-mono font-semibold text-zone-accent">{{ lastRoundRank }}</span>위
      </p>

      <p v-if="!entries.length" class="text-[12px] text-muted-foreground">아직 등록된 기록이 없어요. 첫 기록의 주인공이 되어보세요!</p>
      <ol v-else class="flex flex-col gap-1" data-testid="leaderboard-entries">
        <li
            v-for="(entry, i) in visibleEntries"
            :key="`${entry.userId}-${entry.createdAt}`"
            class="flex items-center gap-2 rounded-md px-2 py-1 text-[13px]"
            :class="rankOf(i) <= 3 ? 'bg-zone-accent/10' : ''"
        >
          <span class="flex w-5 shrink-0 items-center justify-center">
            <Trophy v-if="rankOf(i) <= 3" :class="medalClass(rankOf(i))" aria-hidden="true" class="size-4" data-testid="leaderboard-trophy"/>
            <span v-else class="text-center font-mono text-[11px] text-muted-foreground" data-testid="leaderboard-rank-number">{{ rankOf(i) }}</span>
          </span>
          <span class="min-w-0 flex-1 truncate text-foreground">{{ entry.nickname ?? '탈퇴한 사용자' }}</span>
          <span class="shrink-0 font-mono text-[12px] text-muted-foreground">{{ formatGameScore(gameId, entry.score) }}</span>
        </li>
      </ol>

      <div v-if="expanded && entries.length > PAGE_SIZE" class="flex items-center justify-between border-t border-border pt-2" data-testid="leaderboard-pagination">
        <button
            :disabled="page === 0"
            class="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-zone-accent/40 hover:text-zone-accent disabled:pointer-events-none disabled:opacity-40"
            data-testid="leaderboard-prev-page"
            type="button"
            @click="prevPage"
        >이전</button>
        <span class="text-[11px] text-muted-foreground" data-testid="leaderboard-page-indicator">{{ page + 1 }} / {{ totalPages }}페이지</span>
        <button
            :disabled="page >= totalPages - 1"
            class="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-zone-accent/40 hover:text-zone-accent disabled:pointer-events-none disabled:opacity-40"
            data-testid="leaderboard-next-page"
            type="button"
            @click="nextPage"
        >다음</button>
      </div>

      <!-- 기본은 1~3등 포디움만 보여준다(174에서 만든 10개씩 페이징을 열자마자 다 보여주니
           부담스럽다는 피드백) — 더 보고 싶을 때만 펼쳐서 페이징된 전체 목록을 연다. -->
      <button
          v-if="entries.length > TOP_COUNT"
          class="self-center text-[11px] text-muted-foreground transition-colors hover:text-zone-accent"
          data-testid="leaderboard-expand-toggle"
          type="button"
          @click="toggleExpanded"
      >{{ expanded ? '접기' : '전체 순위 보기' }}</button>

      <p v-if="myRank != null && myBest != null" class="border-t border-border pt-2 text-[12px] text-muted-foreground" data-testid="leaderboard-my-rank">
        역대 최고 기록 <span class="font-mono text-foreground">{{ myRank }}</span>위
        (<span class="font-mono">{{ formatGameScore(gameId, myBest) }}</span>)
      </p>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, ref, watch} from 'vue'
import {Trophy} from 'lucide-vue-next'
import {fetchGameLeaderboard, type GameLeaderboardEntry} from '../api/games'
import {useAuth} from '../composables/useAuth'
import {formatGameScore} from '../config/gameScoreFormat'

const props = defineProps<{ gameId: string; lastRoundRank?: number | null }>()
const {isLoggedIn} = useAuth()

// 174: 서버 오프셋 페이징 없이 최대 100등을 한 번에 받아 화면에서 10개씩 잘라 보여준다 —
// "다음/이전" 페이지 전환이 네트워크 왕복 없이 즉시 반영되고, 100등이라는 상한도 이 한 번의
// 요청 크기(limit)로 그대로 표현된다.
const MAX_ENTRIES = 100
const PAGE_SIZE = 10
// 기본(접힌) 상태에서 보여줄 상위 인원 — 금은동 포디움 3명.
const TOP_COUNT = 3

const entries = ref<GameLeaderboardEntry[]>([])
const page = ref(0)
const expanded = ref(false)
const myRank = ref<number | null>(null)
const myBest = ref<number | null>(null)
const loading = ref(true)
const error = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(entries.value.length / PAGE_SIZE)))
const pagedEntries = computed(() => entries.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE))
// 접힌 상태에서는 항상 1~3등만(현재 페이지와 무관하게), 펼친 상태에서는 페이징된 목록을 보여준다.
const visibleEntries = computed(() => expanded.value ? pagedEntries.value : entries.value.slice(0, TOP_COUNT))

/** 화면에 보이는 i번째 행의 실제 순위(1부터) — 접힌 상태는 항상 1페이지 기준이라 i+1과 같다. */
function rankOf(i: number) {
  return (expanded.value ? page.value * PAGE_SIZE : 0) + i + 1
}

const MEDAL_CLASSES: Record<number, string> = {
  1: 'text-amber-500',
  2: 'text-zinc-400 dark:text-zinc-300',
  3: 'text-amber-700 dark:text-amber-600',
}

function medalClass(rank: number) {
  return MEDAL_CLASSES[rank] ?? 'text-muted-foreground'
}

function toggleExpanded() {
  expanded.value = !expanded.value
  if (expanded.value) page.value = 0
}

function prevPage() {
  if (page.value > 0) page.value--
}

function nextPage() {
  if (page.value < totalPages.value - 1) page.value++
}

async function load() {
  loading.value = true
  error.value = false
  page.value = 0
  expanded.value = false
  try {
    const data = await fetchGameLeaderboard(props.gameId, MAX_ENTRIES)
    entries.value = data.topScores
    myRank.value = data.myRank
    myBest.value = data.myBest
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.gameId, load)
// 로그인 직후 패널이 이미 열려 있었으면 "내 순위" 없이 top만 보이므로, 로그인 상태가 바뀌면 다시 불러온다.
watch(isLoggedIn, load)

defineExpose({reload: load})
</script>

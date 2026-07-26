<template>
  <div class="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3" data-testid="game-leaderboard-panel">
    <p v-if="loading" aria-live="polite" class="text-[12px] text-muted-foreground">불러오는 중…</p>
    <p v-else-if="error" aria-live="polite" class="text-[12px] text-destructive">순위표를 불러오지 못했습니다. 잠시 후 다시 열어보세요.</p>
    <template v-else>
      <p v-if="!entries.length" class="text-[12px] text-muted-foreground">아직 등록된 기록이 없어요. 첫 기록의 주인공이 되어보세요!</p>
      <ol v-else class="flex flex-col gap-1" data-testid="leaderboard-entries">
        <li
            v-for="(entry, i) in pagedEntries"
            :key="`${entry.userId}-${entry.createdAt}`"
            class="flex items-center gap-2 rounded-md px-2 py-1 text-[13px]"
            :class="page * PAGE_SIZE + i < 3 ? 'bg-zone-accent/10' : ''"
        >
          <span class="w-5 shrink-0 text-center font-mono text-[11px] text-muted-foreground">{{ page * PAGE_SIZE + i + 1 }}</span>
          <span class="min-w-0 flex-1 truncate text-foreground">{{ entry.nickname ?? '탈퇴한 사용자' }}</span>
          <span class="shrink-0 font-mono text-[12px] text-muted-foreground">{{ formatGameScore(gameId, entry.score) }}</span>
        </li>
      </ol>

      <div v-if="entries.length > PAGE_SIZE" class="flex items-center justify-between border-t border-border pt-2" data-testid="leaderboard-pagination">
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

      <p v-if="myRank != null && myBest != null" class="border-t border-border pt-2 text-[12px] text-muted-foreground" data-testid="leaderboard-my-rank">
        내 순위 <span class="font-mono text-foreground">{{ myRank }}</span>위
        (<span class="font-mono">{{ formatGameScore(gameId, myBest) }}</span>)
      </p>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, ref, watch} from 'vue'
import {fetchGameLeaderboard, type GameLeaderboardEntry} from '../api/games'
import {useAuth} from '../composables/useAuth'
import {formatGameScore} from '../config/gameScoreFormat'

const props = defineProps<{ gameId: string }>()
const {isLoggedIn} = useAuth()

// 174: 서버 오프셋 페이징 없이 최대 100등을 한 번에 받아 화면에서 10개씩 잘라 보여준다 —
// "다음/이전" 페이지 전환이 네트워크 왕복 없이 즉시 반영되고, 100등이라는 상한도 이 한 번의
// 요청 크기(limit)로 그대로 표현된다.
const MAX_ENTRIES = 100
const PAGE_SIZE = 10

const entries = ref<GameLeaderboardEntry[]>([])
const page = ref(0)
const myRank = ref<number | null>(null)
const myBest = ref<number | null>(null)
const loading = ref(true)
const error = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(entries.value.length / PAGE_SIZE)))
const pagedEntries = computed(() => entries.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE))

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

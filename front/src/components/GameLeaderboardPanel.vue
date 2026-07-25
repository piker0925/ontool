<template>
  <div class="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3" data-testid="game-leaderboard-panel">
    <p v-if="loading" aria-live="polite" class="text-[12px] text-muted-foreground">불러오는 중…</p>
    <p v-else-if="error" aria-live="polite" class="text-[12px] text-destructive">순위표를 불러오지 못했습니다. 잠시 후 다시 열어보세요.</p>
    <template v-else>
      <p v-if="!entries.length" class="text-[12px] text-muted-foreground">아직 등록된 기록이 없어요. 첫 기록의 주인공이 되어보세요!</p>
      <ol v-else class="flex flex-col gap-1" data-testid="leaderboard-entries">
        <li
            v-for="(entry, i) in entries"
            :key="`${entry.userId}-${entry.createdAt}`"
            class="flex items-center gap-2 rounded-md px-2 py-1 text-[13px]"
            :class="i < 3 ? 'bg-zone-accent/10' : ''"
        >
          <span class="w-5 shrink-0 text-center font-mono text-[11px] text-muted-foreground">{{ i + 1 }}</span>
          <span class="min-w-0 flex-1 truncate text-foreground">{{ entry.nickname ?? '탈퇴한 사용자' }}</span>
          <span class="shrink-0 font-mono text-[12px] text-muted-foreground">{{ formatScore(entry.score) }}</span>
        </li>
      </ol>

      <p v-if="myRank != null && myBest != null" class="border-t border-border pt-2 text-[12px] text-muted-foreground" data-testid="leaderboard-my-rank">
        내 순위 <span class="font-mono text-foreground">{{ myRank }}</span>위
        (<span class="font-mono">{{ formatScore(myBest) }}</span>)
      </p>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {onMounted, ref, watch} from 'vue'
import {fetchGameLeaderboard, type GameLeaderboardEntry} from '../api/games'
import {useAuth} from '../composables/useAuth'

const props = defineProps<{ gameId: string }>()
const {isLoggedIn} = useAuth()

const entries = ref<GameLeaderboardEntry[]>([])
const myRank = ref<number | null>(null)
const myBest = ref<number | null>(null)
const loading = ref(true)
const error = ref(false)

function formatScore(score: number): string {
  return score.toLocaleString()
}

async function load() {
  loading.value = true
  error.value = false
  try {
    const data = await fetchGameLeaderboard(props.gameId)
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

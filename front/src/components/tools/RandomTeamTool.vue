<template>
  <div class="flex flex-col gap-5 max-w-2xl mx-auto w-full">
    <!-- 헤더 -->
    <div class="flex items-start gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zone-accent-fun/10 text-zone-accent-fun">
        <Users class="size-4.5"/>
      </div>
      <div class="flex flex-col gap-0.5">
        <h2 class="text-[14px] font-semibold text-foreground">팀 나누기</h2>
        <p class="text-[12px] text-muted-foreground">참가자를 입력하고 무작위로 균등하게 팀을 나눠보세요.</p>
      </div>
    </div>

    <ParticipantsInput v-model="participants"/>

    <div class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <label class="text-[12px] font-medium text-muted-foreground">팀 수</label>
      <div class="flex flex-wrap items-center gap-1.5">
        <button v-for="n in [2, 3, 4, 5, 6]" :key="n"
                :class="teamCount === n ? 'bg-zone-accent-fun text-white dark:text-background' : 'bg-muted text-muted-foreground hover:text-foreground'"
                class="size-7 rounded-full text-[12px] font-medium transition-colors"
                @click="teamCount = n">{{ n }}
        </button>
        <input v-model.number="teamCount"
               class="w-16 rounded-lg border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-zone-accent-fun"
               min="1" type="number"/>
      </div>
    </div>

    <button
        :disabled="participants.length === 0 || teamCount < 1"
        class="flex items-center justify-center gap-1.5 rounded-xl bg-zone-accent-fun py-2.5 text-[14px] font-semibold text-white transition-[opacity,scale] hover:opacity-90 active:scale-[0.99] disabled:opacity-40 dark:text-background"
        @click="doSplit">
      <Shuffle class="size-4"/>
      팀 나누기
    </button>

    <div v-if="teams.length === 0" class="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border py-10 text-center">
      <div class="flex size-10 items-center justify-center rounded-full bg-muted">
        <Users class="size-4 text-muted-foreground/50"/>
      </div>
      <p class="text-[12px] text-muted-foreground">참가자를 입력하고 팀 나누기를 눌러보세요</p>
    </div>
    <TransitionGroup v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2" name="pop-in" tag="div">
      <div v-for="(team, i) in teams" :key="i"
           :class="teamColor(i).border"
           class="rounded-xl border bg-card p-3"
           data-testid="team-group">
        <div class="mb-2 flex items-center gap-2">
          <span :class="teamColor(i).bg" class="size-2.5 rounded-full"/>
          <p class="text-[12px] font-semibold text-foreground">팀 {{ i + 1 }}</p>
          <span class="ml-auto font-mono text-[11px] text-muted-foreground">{{ team.length }}명</span>
        </div>
        <ul class="flex flex-wrap gap-1.5">
          <li v-for="(name, j) in team" :key="j"
              :class="[teamColor(i).bg, teamColor(i).text]"
              class="rounded-full px-2 py-0.5 text-[12px] font-medium"
              data-testid="team-member">{{ name }}</li>
        </ul>
      </div>
    </TransitionGroup>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {Shuffle, Users} from 'lucide-vue-next'
import ParticipantsInput from '../ParticipantsInput.vue'
import {splitIntoTeams} from '../../utils/teamSplit'

const participants = ref<string[]>([])

const teamCount = ref(2)
const teams = ref<string[][]>([])

function doSplit() {
  teams.value = splitIntoTeams(participants.value, teamCount.value)
}

const TEAM_COLORS = [
  {bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20'},
  {bg: 'bg-teal-500/10', text: 'text-teal-600', border: 'border-teal-500/20'},
  {bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20'},
  {bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/20'},
]

function teamColor(i: number) {
  return TEAM_COLORS[i % TEAM_COLORS.length]
}
</script>

<style scoped>
.pop-in-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.pop-in-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
</style>

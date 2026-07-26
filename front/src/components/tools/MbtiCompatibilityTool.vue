<template>
  <div class="flex flex-col gap-5 max-w-2xl mx-auto w-full">
    <div class="flex items-start gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zone-accent-fun/10 text-zone-accent-fun">
        <Heart class="size-4.5"/>
      </div>
      <div class="flex flex-col gap-0.5">
        <h2 class="text-[14px] font-semibold text-foreground">MBTI 궁합 계산기</h2>
        <p class="text-[12px] text-muted-foreground">두 MBTI를 골라 연애·우정·직장 궁합을 확인해보세요 (재미로만 봐주세요!)</p>
      </div>
    </div>

    <!-- 탭 -->
    <div class="flex gap-1 rounded-lg border border-border bg-card p-1">
      <button
          v-for="t in MAIN_TABS" :key="t.id"
          :class="mainTab === t.id
          ? 'bg-zone-accent-fun text-white dark:text-background'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors"
          @click="mainTab = t.id">
        <component :is="t.icon" class="size-3.5"/>
        {{ t.label }}
      </button>
    </div>

    <!-- 계산기 -->
    <template v-if="mainTab === 'calculator'">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-medium text-muted-foreground">첫 번째 MBTI</label>
          <select v-model="typeA"
                  class="rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-zone-accent-fun">
            <option v-for="type in MBTI_TYPES" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>
        <div class="hidden justify-center text-muted-foreground sm:flex">
          <Heart class="size-4"/>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-medium text-muted-foreground">두 번째 MBTI</label>
          <select v-model="typeB"
                  class="rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-zone-accent-fun">
            <option v-for="type in MBTI_TYPES" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <div v-for="cat in CATEGORIES" :key="cat.id"
             class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <component :is="cat.icon" class="size-3.5 text-zone-accent-fun"/>
              {{ cat.label }} 궁합
            </div>
            <span class="font-mono text-[18px] font-bold text-zone-accent-fun">{{ result[cat.id].score }}%</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-muted">
            <div class="h-full rounded-full bg-zone-accent-fun transition-[width]"
                 :style="{ width: `${result[cat.id].score}%` }"/>
          </div>
          <p class="text-[12px] leading-relaxed text-muted-foreground">{{ result[cat.id].description }}</p>
        </div>
      </div>
    </template>

    <!-- 랭킹 -->
    <template v-else>
      <div class="flex gap-1 rounded-lg border border-border bg-card p-1">
        <button
            v-for="cat in CATEGORIES" :key="cat.id"
            :class="rankCategory === cat.id
            ? 'bg-zone-accent-fun text-white dark:text-background'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors"
            @click="rankCategory = cat.id">
          <component :is="cat.icon" class="size-3.5"/>
          {{ cat.label }}
        </button>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
            <Trophy class="size-3.5 text-amber-500"/>
            최고의 궁합 Top 5
          </div>
          <div v-for="(item, i) in topRanking" :key="`top-${item.a}-${item.b}`"
               class="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <span class="w-4 shrink-0 text-center font-mono text-[11px] text-muted-foreground">{{ i + 1 }}</span>
            <span class="flex-1 text-[12px] font-medium text-foreground">{{ item.a }} × {{ item.b }}</span>
            <span class="font-mono text-[13px] font-semibold text-zone-accent-fun">{{ item.score }}%</span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
            <TrendingDown class="size-3.5 text-muted-foreground"/>
            최악의 궁합 Top 5
          </div>
          <div v-for="(item, i) in worstRanking" :key="`worst-${item.a}-${item.b}`"
               class="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <span class="w-4 shrink-0 text-center font-mono text-[11px] text-muted-foreground">{{ i + 1 }}</span>
            <span class="flex-1 text-[12px] font-medium text-foreground">{{ item.a }} × {{ item.b }}</span>
            <span class="font-mono text-[13px] font-semibold text-muted-foreground">{{ item.score }}%</span>
          </div>
        </div>
      </div>
      <p class="text-center text-[11px] text-muted-foreground/70">재미로 보는 랭킹이에요 — 실제 관계는 사람 by 사람!</p>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {Briefcase, Heart, ListOrdered, Trophy, TrendingDown, Users} from 'lucide-vue-next'
import {MBTI_TYPES, type MbtiCompatibilityCategory} from '../../data/mbtiTypes'
import {getCompatibility} from '../../data/mbtiCompatibility'
import {getTopCompatibilities, getWorstCompatibilities} from '../../utils/mbtiCompatibility'

type MainTab = 'calculator' | 'ranking'

const MAIN_TABS: { id: MainTab; label: string; icon: unknown }[] = [
  {id: 'calculator', label: '궁합 계산기', icon: Heart},
  {id: 'ranking', label: '궁합 랭킹', icon: ListOrdered},
]

const CATEGORIES: { id: MbtiCompatibilityCategory; label: string; icon: unknown }[] = [
  {id: 'romance', label: '연애', icon: Heart},
  {id: 'friendship', label: '우정', icon: Users},
  {id: 'work', label: '직장', icon: Briefcase},
]

const mainTab = ref<MainTab>('calculator')
const typeA = ref<string>(MBTI_TYPES[3]) // INTJ
const typeB = ref<string>(MBTI_TYPES[10]) // ENFP
const rankCategory = ref<MbtiCompatibilityCategory>('romance')

const result = computed(() => ({
  romance: getCompatibility(typeA.value, typeB.value, 'romance'),
  friendship: getCompatibility(typeA.value, typeB.value, 'friendship'),
  work: getCompatibility(typeA.value, typeB.value, 'work'),
}))

const topRanking = computed(() => getTopCompatibilities(rankCategory.value, 5))
const worstRanking = computed(() => getWorstCompatibilities(rankCategory.value, 5))
</script>

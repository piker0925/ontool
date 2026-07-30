<template>
  <div class="mx-auto flex w-full max-w-[1280px] flex-col px-4 pb-16 sm:px-6">

    <!-- ══════════════════════════════════════════
         히어로 섹션 — 다크 글래스 배너
    ══════════════════════════════════════════ -->
    <div class="relative mt-6 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-[oklch(0.15_0.04_315)] via-[oklch(0.12_0.03_270)] to-[oklch(0.1_0.02_240)] p-8 shadow-2xl sm:p-10">
      <!-- 배경 오로라 블러 -->
      <div class="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-[oklch(0.52_0.17_315)] opacity-20 blur-3xl"/>
      <div class="pointer-events-none absolute -bottom-16 -left-16 size-56 rounded-full bg-[oklch(0.55_0.2_270)] opacity-15 blur-3xl"/>

      <div class="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="mb-1.5 font-mono text-xs font-medium uppercase tracking-widest text-[oklch(0.7_0.1_315)]">OnTool Game Zone</p>
          <h1 class="text-3xl font-black tracking-tight text-white sm:text-4xl">
            🎮 게임 구역
          </h1>
          <p class="mt-2 max-w-md text-sm text-white/60 leading-relaxed">
            부담 없이 즐기는 미니게임 {{ gameCount }}종 · 1인~5인 멀티플레이
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs font-medium text-white/80 backdrop-blur-sm">⚡ 실시간 멀티</span>
          <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs font-medium text-white/80 backdrop-blur-sm">🧩 싱글 퍼즐</span>
          <span class="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs font-medium text-white/80 backdrop-blur-sm">♟️ 턴제 보드</span>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         헤더 바 — 검색 카운터 + 뷰 토글
    ══════════════════════════════════════════ -->
    <div class="mt-6 flex items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <h2 class="text-base font-bold text-foreground">
          {{ activeCategory ?? '전체 게임' }}
        </h2>
        <span class="rounded-full bg-zone-accent/15 border border-zone-accent/30 px-2 py-0.5 font-mono text-[11px] font-semibold text-zone-accent">
          {{ filteredModules.length }}
        </span>
      </div>

      <div class="flex items-center rounded-xl border border-border/60 bg-card p-0.5 shadow-sm">
        <button
            class="flex items-center justify-center rounded-lg px-2.5 py-1.5 transition-[background-color,color,box-shadow]"
            :class="viewMode === 'grid' ? 'bg-accent text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            title="바둑판 보기"
            @click="viewMode = 'grid'"
        >
          <LayoutGrid class="size-3.5"/>
        </button>
        <button
            class="flex items-center justify-center rounded-lg px-2.5 py-1.5 transition-[background-color,color,box-shadow]"
            :class="viewMode === 'list' ? 'bg-accent text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            title="리스트 보기"
            @click="viewMode = 'list'"
        >
          <List class="size-3.5"/>
        </button>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         로딩 스켈레톤
    ══════════════════════════════════════════ -->
    <div v-if="loading" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="n in 12" :key="n" class="h-[96px] animate-pulse rounded-2xl bg-muted/60"/>
    </div>

    <!-- ══════════════════════════════════════════
         카테고리별 섹션 (기본 뷰)
    ══════════════════════════════════════════ -->
    <template v-else-if="activeCategory === null">
      <section v-for="section in categorySections" :key="section.name" class="mt-8">
        <!-- 카테고리 헤더 -->
        <div class="mb-4 flex items-center gap-3">
          <div class="flex items-center gap-2.5">
            <span class="text-base font-bold text-foreground">{{ section.name }}</span>
            <span class="rounded-full bg-secondary/80 border border-border/40 px-2.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">{{ section.modules.length }}</span>
          </div>
          <div class="h-px flex-1 bg-border/40"/>
        </div>

        <!-- 게임 카드 그리드 -->
        <div :class="viewMode === 'list' ? 'flex flex-col gap-2' : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'">
          <GameCard
              v-for="(mod, i) in section.modules"
              :key="mod.id"
              :mod="mod"
              :mode="viewMode"
              :style="{'--stagger-i': Math.min(section.offset + i, 24)}"
              class="stagger-in"
          />
        </div>
      </section>
    </template>

    <!-- ══════════════════════════════════════════
         카테고리 필터 시 단일 그리드
    ══════════════════════════════════════════ -->
    <div v-else :class="viewMode === 'list' ? 'flex flex-col gap-2 mt-4' : 'grid grid-cols-1 gap-3 mt-4 sm:grid-cols-2 xl:grid-cols-3'">
      <GameCard
          v-for="(mod, i) in filteredModules"
          :key="mod.id"
          :mod="mod"
          :mode="viewMode"
          :style="{'--stagger-i': Math.min(i, 24)}"
          class="stagger-in"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue'
import {LayoutGrid, List} from 'lucide-vue-next'
import {apiClient} from '../api/client'
import {MOCK_MODULES} from '../api/mock'
import {normalizeApiModules} from '../api/modules'
import type {Module} from '../types'
import {CATEGORY_ORDER} from '../utils/categoryConfig'
import {useToolFilter} from '../composables/useToolFilter'
import {useViewMode} from '../composables/useViewMode'
import GameCard from '../components/GameCard.vue'

const {viewMode} = useViewMode()
const {activeCategory} = useToolFilter()
const modules = ref<Module[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const {data} = await apiClient.get<Module[]>('/api/v1/modules')
    modules.value = normalizeApiModules(data)
  } catch {
    modules.value = MOCK_MODULES
  } finally {
    loading.value = false
  }
})

const gameModules = computed(() => modules.value.filter(m => m.zones?.includes('fun')))
const gameCount = computed(() => gameModules.value.length)

const filteredModules = computed(() =>
    activeCategory.value
        ? gameModules.value.filter(m => m.category === activeCategory.value)
        : gameModules.value,
)

const categorySections = computed(() => {
  let offset = 0
  return CATEGORY_ORDER
      .map(name => {
        const mods = gameModules.value.filter(m => m.category === name)
        const section = {name, modules: mods, offset}
        offset += mods.length
        return section
      })
      .filter(s => s.modules.length > 0)
})
</script>

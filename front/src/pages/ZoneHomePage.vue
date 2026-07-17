<template>
  <div class="mx-auto flex w-full max-w-[1200px] flex-col px-4 pb-10 sm:px-6">

    <!-- Page title & View Toggle -->
    <div class="flex items-end justify-between pb-2 pt-8">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">
          {{ activeCategory ?? zone.name }}
          <span class="ml-1.5 align-middle font-mono text-sm font-medium text-muted-foreground/60">{{
              filteredModules.length
            }}</span>
        </h1>
        <p class="mt-2 text-sm text-muted-foreground/80">
          {{ activeCategory ? `${activeCategory} 카테고리의 도구입니다.` : zone.description }}
        </p>
      </div>

      <!-- View Toggle (Segmented Control) -->
      <div class="flex items-center rounded-lg border border-border/60 bg-card p-0.5 shadow-sm">
        <button
            class="flex items-center justify-center rounded-md px-2.5 py-1.5 transition-all"
            :class="viewMode === 'grid' ? 'bg-accent text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground'"
            @click="viewMode = 'grid'"
            title="바둑판 보기"
        >
          <LayoutGrid class="size-3.5" />
        </button>
        <button
            class="flex items-center justify-center rounded-md px-2.5 py-1.5 transition-all"
            :class="viewMode === 'list' ? 'bg-accent text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground'"
            @click="viewMode = 'list'"
            title="리스트 보기"
        >
          <List class="size-3.5" />
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" :class="viewMode === 'list' ? 'flex flex-col gap-2 pt-4' : 'grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-3'">
      <div v-for="n in 18" :key="n" class="animate-pulse rounded-xl bg-muted" :class="viewMode === 'list' ? 'h-[52px]' : 'h-[68px]'" />
    </div>

    <!-- 빈 구역 안내 (즐겨찾기·최근 사용도 없을 때만) -->
    <div
        v-else-if="activeCategory === null && zoneModules.length === 0 && favoriteModules.length === 0 && recentModules.length === 0"
        class="pt-10 text-center"
    >
      <p class="text-[14px] text-muted-foreground">{{ zone.name }} 구역은 준비 중입니다. 곧 도구가 추가됩니다.</p>
    </div>

    <template v-else-if="activeCategory === null">
      <!-- 즐겨찾기 -->
      <section v-if="favoriteModules.length > 0">
        <h2 class="mb-4 mt-8 flex items-center gap-2 border-b border-border/40 pb-2">
          <span class="text-sm font-bold uppercase tracking-wider text-foreground">즐겨찾기</span>
        </h2>
        <div :class="viewMode === 'list' ? 'flex flex-col gap-2' : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'">
          <ToolCard v-for="mod in favoriteModules" :key="mod.id" :mod="mod" :mode="viewMode"/>
        </div>
      </section>

      <!-- 최근 사용 -->
      <section v-if="recentModules.length > 0">
        <h2 class="mb-4 mt-8 flex items-center gap-2 border-b border-border/40 pb-2">
          <span class="text-sm font-bold uppercase tracking-wider text-foreground">최근 사용</span>
        </h2>
        <div :class="viewMode === 'list' ? 'flex flex-col gap-2' : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'">
          <ToolCard v-for="mod in recentModules" :key="mod.id" :mod="mod" :mode="viewMode"/>
        </div>
      </section>

      <!-- 카테고리별 섹션 -->
      <section v-for="section in categorySections" :key="section.name">
        <h2 class="mb-4 mt-8 flex items-center gap-2 border-b border-border/40 pb-2">
          <span class="text-sm font-bold text-foreground">{{ section.name }}</span>
          <span class="rounded-full bg-secondary/80 px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">{{ section.modules.length }}</span>
        </h2>
        <div :class="viewMode === 'list' ? 'flex flex-col gap-2' : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'">
          <ToolCard
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

    <!-- 카테고리 필터 시 단일 그리드 -->
    <div v-else :class="viewMode === 'list' ? 'flex flex-col gap-2 pt-4' : 'grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-3'">
      <ToolCard
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
import {apiClient} from '../api/client'
import {MOCK_MODULES} from '../api/mock'
import {normalizeApiModules} from '../api/modules'
import type {Module} from '../types'
import {CATEGORY_ORDER} from '../utils/categoryConfig'
import {ZONES, type ZoneId} from '../config/zones'
import {useToolFilter} from '../composables/useToolFilter'
import {useFavorites} from '../composables/useFavorites'
import {useRecentTools} from '../composables/useRecentTools'
import {useViewMode} from '../composables/useViewMode'
import ToolCard from '../components/ToolCard.vue'
import {LayoutGrid, List} from 'lucide-vue-next'

const props = defineProps<{ zoneId: ZoneId }>()

const zone = computed(() => ZONES.find(z => z.id === props.zoneId)!)

const {viewMode, toggleViewMode} = useViewMode()
const {activeCategory} = useToolFilter()
const {favoriteIds} = useFavorites()
const {recentIds} = useRecentTools()
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

const zoneModules = computed(() => modules.value.filter(m => m.zones.includes(props.zoneId)))

const filteredModules = computed(() =>
    activeCategory.value
        ? zoneModules.value.filter(m => m.category === activeCategory.value)
        : zoneModules.value,
)

const favoriteModules = computed(() =>
    favoriteIds.value
        .map(id => modules.value.find(m => m.id === id))
        .filter((m): m is Module => m !== undefined),
)

const recentModules = computed(() =>
    recentIds.value
        .filter(id => !favoriteIds.value.includes(id))
        .map(id => modules.value.find(m => m.id === id))
        .filter((m): m is Module => m !== undefined),
)

const categorySections = computed(() => {
  let offset = 0
  return CATEGORY_ORDER
      .map(name => {
        const mods = zoneModules.value.filter(m => m.category === name)
        const section = {name, modules: mods, offset}
        offset += mods.length
        return section
      })
      .filter(s => s.modules.length > 0)
})
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <aside class="flex w-[320px] shrink-0 flex-col bg-[#1A1B1E]">

      <!-- Logo -->
      <button
          class="flex items-center gap-2.5 px-4 py-4 transition-opacity hover:opacity-80"
          @click="handleCategoryClick(null)"
      >
        <div class="flex size-7 items-center justify-center rounded-lg bg-indigo-500">
          <Zap class="size-4 text-white"/>
        </div>
        <span class="text-[15px] font-semibold text-white">DevToolbox</span>
      </button>

      <!-- Search -->
      <div class="px-3 pb-3">
        <button
            class="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/6 px-3 py-2 text-left transition-colors hover:border-white/15 hover:bg-white/10"
            @click="paletteRef?.open()"
        >
          <Search class="size-[14px] shrink-0 text-[#606060]"/>
          <span class="flex-1 text-[13px] text-[#606060]">검색...</span>
          <kbd class="shrink-0 font-mono text-[11px] text-[#505050]">{{ shortcutKey }}</kbd>
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto px-2 pb-3">

        <!-- Favorites -->
        <template v-if="favoriteModules.length > 0">
          <div class="mb-1 px-3">
            <span class="text-[11px] font-medium text-[#555]">즐겨찾기</span>
          </div>
          <button
              v-for="mod in favoriteModules"
              :key="mod.id"
              class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors text-[#808080] hover:bg-white/8 hover:text-[#C8C8C8]"
              @click="router.push(`/tools/${mod.id}`)"
          >
            <div
                :class="getCategoryConfig(mod.category).thumbBg"
                class="flex size-[18px] shrink-0 items-center justify-center rounded"
            >
              <component :is="getCategoryConfig(mod.category).icon" class="size-[10px] text-white"/>
            </div>
            <span class="flex-1 truncate text-[13px]">{{ mod.name }}</span>
          </button>
          <div class="mx-1 my-2 border-t border-white/8"/>
        </template>

        <!-- 전체 -->
        <button
            :class="isAllActive
            ? 'bg-white/10 text-white'
            : 'text-[#808080] hover:bg-white/8 hover:text-[#C8C8C8]'"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors"
            @click="handleCategoryClick(null)"
        >
          <LayoutGrid class="size-[16px] shrink-0"/>
          <span class="flex-1 text-[14px] font-medium">전체 도구</span>
          <span class="shrink-0 text-[12px] opacity-40">{{ modules.length }}</span>
        </button>

        <div class="mx-1 my-2 border-t border-white/8"/>

        <!-- Categories -->
        <button
            v-for="cat in CATEGORIES"
            :key="cat.name"
            :class="isCategoryActive(cat.name)
            ? 'bg-white/10 text-white'
            : 'text-[#808080] hover:bg-white/8 hover:text-[#C8C8C8]'"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors"
            @click="handleCategoryClick(cat.name)"
        >
          <component :is="cat.icon" class="size-[16px] shrink-0"/>
          <span class="flex-1 text-[14px]">{{ cat.name }}</span>
          <span class="shrink-0 text-[12px] opacity-40">{{ categoryCounts[cat.name] }}</span>
        </button>
      </nav>
    </aside>

    <!-- Main -->
    <main class="flex-1 overflow-y-auto bg-slate-50">
      <router-view/>
    </main>

    <CommandPalette ref="paletteRef" :modules="modules"/>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {LayoutGrid, Search, Zap} from 'lucide-vue-next'
import {apiClient} from '../api/client'
import {MOCK_MODULES} from '../api/mock'
import {normalizeApiModules} from '../api/modules'
import type {Module} from '../types'
import {CATEGORY_CONFIG, CATEGORY_ORDER, getCategoryConfig} from '../utils/categoryConfig'
import {useToolFilter} from '../composables/useToolFilter'
import {useFavorites} from '../composables/useFavorites'
import CommandPalette from '../components/CommandPalette.vue'

const route = useRoute()
const router = useRouter()
const modules = ref<Module[]>([])
const paletteRef = ref<InstanceType<typeof CommandPalette> | null>(null)

const {activeCategory, setCategory} = useToolFilter()
const {favoriteIds} = useFavorites()

const shortcutKey = navigator.userAgent.includes('Mac') ? '⌘K' : 'Ctrl K'

const favoriteModules = computed(() =>
    favoriteIds.value
        .map(id => modules.value.find(m => m.id === id))
        .filter((m): m is Module => m !== undefined),
)

const CATEGORIES = CATEGORY_ORDER.map(name => ({
  name,
  icon: CATEGORY_CONFIG[name]?.icon,
}))

const categoryCounts = computed(() =>
    modules.value.reduce<Record<string, number>>((acc, mod) => {
      acc[mod.category] = (acc[mod.category] ?? 0) + 1
      return acc
    }, {}),
)

const isAllActive = computed(() =>
    route.path === '/' && activeCategory.value === null,
)

function isCategoryActive(catName: string) {
  if (route.path === '/') return activeCategory.value === catName
  const moduleId = route.params.moduleId as string | undefined
  if (!moduleId) return false
  return modules.value.find(m => m.id === moduleId)?.category === catName
}

function handleCategoryClick(catName: string | null) {
  setCategory(catName)
  if (route.path !== '/') router.push('/')
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    paletteRef.value?.open()
  }
}

onMounted(() => {
  loadModules()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

async function loadModules() {
  try {
    const {data} = await apiClient.get<Module[]>('/api/v1/modules')
    modules.value = normalizeApiModules(data)
  } catch {
    modules.value = MOCK_MODULES
  }
}
</script>

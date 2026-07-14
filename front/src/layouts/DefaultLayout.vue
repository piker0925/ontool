<template>
  <div class="flex h-screen overflow-hidden">

    <aside
        class="flex w-[280px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
    >

      <!-- Logo -->
      <button
          class="flex items-center gap-2.5 px-4 py-4 transition-opacity hover:opacity-80"
          @click="handleCategoryClick(null)"
      >
        <div class="flex size-7 items-center justify-center rounded-lg bg-sidebar-primary">
          <Zap class="size-4 text-sidebar-primary-foreground"/>
        </div>
        <span class="text-[15px] font-semibold text-sidebar-foreground">DevToolbox</span>
      </button>

      <!-- Search -->
      <div class="px-3 pb-3">
        <button
            class="flex w-full items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-left transition-colors hover:bg-sidebar-accent"
            @click="paletteRef?.open()"
        >
          <Search class="size-[14px] shrink-0 text-sidebar-foreground/80"/>
          <span class="flex-1 text-[13px] text-sidebar-foreground/80">검색…</span>
          <kbd class="shrink-0 font-mono text-[11px] text-sidebar-foreground/70">{{ shortcutKey }}</kbd>
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto px-2 pb-3">

        <!-- Favorites -->
        <template v-if="favoriteModules.length > 0">
          <div class="mb-1 px-3">
            <span
                class="font-mono text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/75">즐겨찾기</span>
          </div>
          <button
              v-for="mod in favoriteModules"
              :key="mod.id"
              class="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              @click="router.push(`/tools/${mod.id}`)"
          >
            <Star class="size-[13px] shrink-0 fill-amber-400/80 text-amber-400/80"/>
            <span class="flex-1 truncate text-[13px]">{{ mod.name }}</span>
          </button>
          <div class="mx-1 my-2 border-t border-sidebar-border"/>
        </template>

        <!-- 전체 -->
        <button
            :class="isAllActive
            ? 'bg-primary/10 text-primary'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors"
            @click="handleCategoryClick(null)"
        >
          <LayoutGrid class="size-[16px] shrink-0"/>
          <span class="flex-1 text-[14px] font-medium">전체 도구</span>
          <span class="shrink-0 font-mono text-[11px] opacity-70">{{ modules.length }}</span>
        </button>

        <div class="mx-1 my-2 border-t border-sidebar-border"/>

        <!-- Categories -->
        <button
            v-for="cat in CATEGORIES"
            :key="cat.name"
            :class="isCategoryActive(cat.name)
            ? 'bg-primary/10 text-primary'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors"
            @click="handleCategoryClick(cat.name)"
        >
          <component :is="cat.icon" class="size-[16px] shrink-0"/>
          <span class="flex-1 text-[14px]">{{ cat.name }}</span>
          <span class="shrink-0 font-mono text-[11px] opacity-70">{{ categoryCounts[cat.name] }}</span>
        </button>
      </nav>

      <!-- 하단: 테마 · 건의하기 -->
      <div class="flex items-center gap-1 border-t border-sidebar-border p-2">
        <router-link
            class="flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            to="/suggestions"
        >
          <MessageSquarePlus class="size-[15px] shrink-0"/>
          <span>건의하기</span>
        </router-link>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
                :title="themeLabel"
                :aria-label="themeLabel"
                class="flex size-9 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Sun v-if="preference === 'light'" class="size-[15px]"/>
              <Moon v-else-if="preference === 'dark'" class="size-[15px]"/>
              <MonitorSmartphone v-else class="size-[15px]"/>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            <DropdownMenuRadioGroup :model-value="preference" @update:model-value="onThemeSelect">
              <DropdownMenuRadioItem value="light">
                <Sun class="size-[14px]"/>
                <span>라이트</span>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon class="size-[14px]"/>
                <span>다크</span>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <MonitorSmartphone class="size-[14px]"/>
                <span>시스템</span>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex min-w-0 flex-1 flex-col">
      <main class="flex-1 overflow-y-auto bg-background">
        <router-view/>
      </main>
    </div>

    <CommandPalette ref="paletteRef" :modules="modules"/>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {LayoutGrid, MessageSquarePlus, MonitorSmartphone, Moon, Search, Star, Sun, Zap} from 'lucide-vue-next'
import {apiClient} from '../api/client'
import {MOCK_MODULES} from '../api/mock'
import {normalizeApiModules} from '../api/modules'
import type {Module} from '../types'
import {CATEGORY_CONFIG, CATEGORY_ORDER} from '../utils/categoryConfig'
import {useToolFilter} from '../composables/useToolFilter'
import {useFavorites} from '../composables/useFavorites'
import {useTheme, type ThemePreference} from '../composables/useTheme'
import CommandPalette from '../components/CommandPalette.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const route = useRoute()
const router = useRouter()
const modules = ref<Module[]>([])
const paletteRef = ref<InstanceType<typeof CommandPalette> | null>(null)

const {activeCategory, setCategory} = useToolFilter()
const {favoriteIds} = useFavorites()
const {preference, setTheme} = useTheme()

const shortcutKey = navigator.userAgent.includes('Mac') ? '⌘K' : 'Ctrl K'

const THEME_LABEL = {light: '라이트 테마', dark: '다크 테마', system: '시스템 테마'} as const

const themeLabel = computed(() => `테마: ${THEME_LABEL[preference.value]} (변경하려면 열기)`)

function onThemeSelect(next: unknown) {
  setTheme(next as ThemePreference)
}

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

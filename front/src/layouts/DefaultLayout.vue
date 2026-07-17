<template>
  <div class="flex h-screen overflow-hidden">

    <!-- 모바일 드로어 백드롭 -->
    <div
        v-if="drawerOpen"
        class="fixed inset-0 z-30 bg-black/50 lg:hidden"
        @click="drawerOpen = false"
    />

    <aside
        :class="drawerOpen ? 'translate-x-0' : '-translate-x-full'"
        class="fixed inset-y-0 left-0 z-40 flex w-[280px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0"
    >

      <!-- Logo -->
      <router-link
          class="flex items-center px-4 py-4 transition-opacity hover:opacity-80"
          to="/"
      >
        <BrandLogo class="scale-90 origin-left" />
      </router-link>

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
          <router-link
              v-for="mod in favoriteModules"
              :key="mod.id"
              class="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              :to="`/tools/${mod.id}`"
          >
            <Star class="size-[13px] shrink-0 fill-amber-400/80 text-amber-400/80"/>
            <span class="flex-1 truncate text-[13px]">{{ mod.name }}</span>
          </router-link>
          <div class="mx-1 my-2 border-t border-sidebar-border"/>
        </template>

        <!-- 전체 (현재 구역 스코프) -->
        <router-link
            :class="isAllActive
            ? 'bg-zone-accent/10 text-zone-accent'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors"
            :to="zoneHomeRoute"
        >
          <LayoutGrid class="size-[16px] shrink-0"/>
          <span class="flex-1 text-[14px] font-medium">전체 도구</span>
          <span class="shrink-0 font-mono text-[11px] opacity-70">{{ zoneModules.length }}</span>
        </router-link>

        <div class="mx-1 my-2 border-t border-sidebar-border"/>

        <!-- Categories (현재 구역에 존재하는 카테고리만) -->
        <router-link
            v-for="cat in zoneCategories"
            :key="cat.name"
            :class="isCategoryActive(cat.name)
            ? 'bg-zone-accent/10 text-zone-accent'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors"
            :to="{path: zoneHomeRoute, query: {category: cat.name}}"
        >
          <component :is="cat.icon" class="size-[16px] shrink-0"/>
          <span class="flex-1 text-[14px]">{{ cat.name }}</span>
          <span class="shrink-0 font-mono text-[11px] opacity-70">{{ categoryCounts[cat.name] }}</span>
        </router-link>
      </nav>

      <!-- 하단: 유저 프로필 + 테마 · 건의하기 -->
      <div class="flex flex-col gap-2 border-t border-sidebar-border p-3">
        <UserProfileButton />
      </div>
      <div class="flex items-center gap-1 border-t border-sidebar-border p-2">
        <router-link
            class="flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            to="/suggestions"
        >
          <MessageSquarePlus class="size-[15px] shrink-0"/>
          <span>건의하기</span>
        </router-link>
        <ThemeToggleButton
            button-class="size-9 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            side="top"
        />
      </div>
      <div class="px-4 pb-3 pt-1 flex justify-center">
        <router-link to="/privacy" class="text-[11px] text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors underline underline-offset-2">
          개인정보처리방침
        </router-link>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- 구역 스위처: 데스크톱·모바일 공통, 드로어와 무관하게 항상 노출 -->
      <nav
          class="flex shrink-0 items-stretch gap-1 border-b border-border bg-background px-2 py-1.5 sm:px-4"
          aria-label="구역 전환"
      >
        <router-link
            v-for="zone in ZONES"
            :key="zone.id"
            :class="currentZoneId === zone.id
            ? [ZONE_BG_CLASS[zone.id], ZONE_TEXT_CLASS[zone.id]]
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
            :aria-current="currentZoneId === zone.id ? 'page' : undefined"
            class="flex flex-1 items-center justify-center rounded-lg px-2 py-2.5 text-center text-[13px] font-medium transition-colors sm:flex-initial sm:px-4"
            :to="zone.route"
        >
          {{ zone.name }}
        </router-link>
      </nav>

      <!-- 모바일 톱바 -->
      <header class="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-background px-2 lg:hidden">
        <button
            class="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title="메뉴 열기"
            @click="drawerOpen = true"
        >
          <Menu class="size-[18px]"/>
        </button>
        <router-link class="flex items-center px-1" to="/">
          <BrandLogo class="scale-[0.8] origin-left" />
        </router-link>
        <div class="ml-auto flex items-center gap-2">
          <UserProfileButton class="lg:hidden" />
          <button
              class="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title="검색"
              @click="paletteRef?.open()"
          >
            <Search class="size-[16px]"/>
          </button>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto bg-background">
        <router-view/>
      </main>
    </div>

    <CommandPalette ref="paletteRef" :modules="modules"/>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {useRoute} from 'vue-router'
import {LayoutGrid, Menu, MessageSquarePlus, Search, Star} from 'lucide-vue-next'
import {apiClient} from '../api/client'
import {MOCK_MODULES} from '../api/mock'
import {normalizeApiModules} from '../api/modules'
import {WORDMARK_PREFIX, WORDMARK_REST} from '../config/brand'
import {ZONES, zoneOf, type ZoneId} from '../config/zones'
import type {Module} from '../types'
import {CATEGORY_CONFIG, CATEGORY_ORDER} from '../utils/categoryConfig'
import {useToolFilter} from '../composables/useToolFilter'
import {useFavorites} from '../composables/useFavorites'
import BrandLogo from '../components/BrandLogo.vue'
import CommandPalette from '../components/CommandPalette.vue'
import ThemeToggleButton from '../components/ThemeToggleButton.vue'
import UserProfileButton from '../components/UserProfileButton.vue'

const route = useRoute()
const modules = ref<Module[]>([])
const paletteRef = ref<InstanceType<typeof CommandPalette> | null>(null)
const drawerOpen = ref(false)

const {activeCategory} = useToolFilter()
const {favoriteIds} = useFavorites()

// Tailwind Oxide는 소스에 리터럴로 등장하는 클래스만 스캔한다 — 동적 템플릿 문자열 금지
const ZONE_BG_CLASS: Record<ZoneId, string> = {
  dev: 'bg-zone-accent-dev/10',
  files: 'bg-zone-accent-files/10',
  life: 'bg-zone-accent-life/10',
  fun: 'bg-zone-accent-fun/10',
}
const ZONE_TEXT_CLASS: Record<ZoneId, string> = {
  dev: 'text-zone-accent-dev',
  files: 'text-zone-accent-files',
  life: 'text-zone-accent-life',
  fun: 'text-zone-accent-fun',
}

const currentZoneId = computed<ZoneId | null>(() => {
  const byPath = ZONES.find(z => route.path === z.route)
  if (byPath) return byPath.id
  const moduleId = route.params.moduleId as string | undefined
  if (moduleId) {
    const mod = modules.value.find(m => m.id === moduleId)
    if (mod) return mod.zones[0] ?? null
  }
  return null
})

const zoneHomeRoute = computed(() => zoneOf(currentZoneId.value ?? undefined).route)

const zoneModules = computed(() =>
    currentZoneId.value
        ? modules.value.filter(m => m.zones.includes(currentZoneId.value!))
        : modules.value,
)

// 현재 구역을 document.documentElement의 data-zone 속성으로 반영 (style.css가 --zone-accent를 이 속성으로 전환)
watch(currentZoneId, zoneId => {
  if (zoneId) {
    document.documentElement.dataset.zone = zoneId
  } else {
    delete document.documentElement.dataset.zone
  }
}, {immediate: true})

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

// 현재 구역에 실제로 도구가 있는 카테고리만 노출
const zoneCategories = computed(() => {
  const namesInZone = new Set(zoneModules.value.map(m => m.category))
  return CATEGORIES.filter(cat => namesInZone.has(cat.name))
})

const categoryCounts = computed(() =>
    zoneModules.value.reduce<Record<string, number>>((acc, mod) => {
      acc[mod.category] = (acc[mod.category] ?? 0) + 1
      return acc
    }, {}),
)

const isAllActive = computed(() =>
    route.path === zoneHomeRoute.value && activeCategory.value === null,
)

function isCategoryActive(catName: string) {
  if (route.path === zoneHomeRoute.value) return activeCategory.value === catName
  const moduleId = route.params.moduleId as string | undefined
  if (!moduleId) return false
  return modules.value.find(m => m.id === moduleId)?.category === catName
}

// 모바일 드로어는 페이지 이동 시 닫는다
watch(() => route.fullPath, () => {
  drawerOpen.value = false
})

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    paletteRef.value?.open()
  }
  if (e.key === 'Escape' && drawerOpen.value) {
    drawerOpen.value = false
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

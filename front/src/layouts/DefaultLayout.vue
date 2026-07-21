<template>
  <!-- Viewport (Infinite Width) -->
  <div class="h-screen w-full overflow-hidden bg-slate-50 dark:bg-background relative flex justify-center">
    <!-- 메인 페이지와 100% 동일한 깊이감의 융합 배경 (무한 너비) -->
    <div class="pointer-events-none absolute inset-0 flex justify-center z-0 overflow-hidden">
      <!-- 배경 도트 패턴 -->
      <div class="absolute inset-0 hidden dark:block bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:24px_24px] opacity-60 transition-opacity duration-1000"></div>
      <!-- 페이드 아웃 마스크 -->
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/80 to-slate-50 dark:via-background/50 dark:to-background"></div>
    </div>

    <!-- App Container (Full Width) -->
    <div class="flex h-full w-full relative z-10">

    <!-- 모바일 드로어 백드롭 -->
    <div
        v-if="drawerOpen"
        data-testid="drawer-backdrop"
        class="fixed inset-0 z-30 bg-black/50 lg:hidden backdrop-blur-sm"
        @click="drawerOpen = false"
    />

    <aside
        :class="drawerOpen ? 'translate-x-0' : '-translate-x-full'"
        class="fixed inset-y-0 left-0 z-40 flex w-[240px] shrink-0 flex-col border-r border-white/60 dark:border-white/10 bg-white/40 dark:bg-[#0a0a0a]/80 backdrop-blur-[30px] transition-transform duration-200 lg:static lg:translate-x-0 shadow-[4px_0_24px_rgb(0,0,0,0.02)] dark:shadow-none"
    >

      <!-- 사이드바 상단: 워크스페이스 스위처 -->
      <div class="flex items-center h-[52px] px-3 shrink-0 border-b border-white/60 dark:border-white/10">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button data-testid="workspace-switcher-trigger" class="flex w-full items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent focus:outline-none group">
              <div class="flex items-center gap-2 min-w-0">
                <div :class="[ZONE_BG_CLASS[currentZoneId || 'dev'], ZONE_TEXT_CLASS[currentZoneId || 'dev']]" class="flex size-7 shrink-0 items-center justify-center rounded-md shadow-sm transition-colors">
                  <component :is="ZONE_ICONS[currentZoneId || 'dev']" class="size-4" />
                </div>
                <div class="flex flex-col truncate">
                  <span class="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 leading-none mb-0.5">Workspace</span>
                  <span class="truncate text-[13px] font-bold text-foreground leading-none">{{ currentZoneName }}</span>
                </div>
              </div>
              <ChevronsUpDown class="size-3.5 text-muted-foreground/50 shrink-0 group-hover:text-foreground/80 transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-[240px] p-1.5 rounded-xl shadow-xl">
            <DropdownMenuLabel class="text-xs font-semibold text-muted-foreground px-2 py-1.5">워크스페이스 전환</DropdownMenuLabel>
            <DropdownMenuItem
                v-for="zone in ZONES" :key="zone.id"
                as-child
                class="rounded-lg cursor-pointer mb-1 last:mb-0 focus:bg-accent"
            >
              <router-link :to="zone.route" class="flex items-center gap-3 w-full px-2 py-2">
                <div :class="[ZONE_BG_CLASS[zone.id], ZONE_TEXT_CLASS[zone.id]]" class="flex size-8 items-center justify-center rounded-lg shadow-sm">
                  <component :is="ZONE_ICONS[zone.id]" class="size-[16px]" />
                </div>
                <div class="flex flex-col">
                  <span class="text-[13px] font-bold text-foreground">{{ zone.name }}</span>
                  <span class="text-[11px] text-muted-foreground mt-0.5">{{ zone.description.split(' ')[0] }}...</span>
                </div>
              </router-link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto px-2 pt-4 pb-3">

        <!-- Favorites Section -->
        <div class="mb-6 flex flex-col gap-0.5">
          <div class="px-2 pb-1.5 text-[10px] font-bold text-muted-foreground/60 tracking-wider">Favorites</div>
          <template v-if="favoriteModules.length > 0">
            <router-link
                v-for="mod in favoriteModules"
                :key="mod.id"
                class="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                :to="`/tools/${mod.id}`"
            >
              <Star class="size-[14px] shrink-0 fill-amber-400 text-amber-400"/>
              <span class="flex-1 truncate text-[13px] font-medium">{{ mod.name }}</span>
            </router-link>
          </template>
          <div v-else class="mx-2 mt-1 rounded-md border border-dashed border-sidebar-border bg-sidebar-accent/30 px-3 py-2.5">
            <p class="text-[11px] leading-tight text-muted-foreground/60">
              도구 상단의 <Star class="inline size-[11px] mx-0.5 text-amber-400" /> 아이콘을 눌러 자주 쓰는 도구를 고정하세요.
            </p>
          </div>
        </div>

        <!-- Explore Section -->
        <div class="flex flex-col gap-0.5">
          <div class="px-2 pb-1.5 text-[10px] font-bold text-muted-foreground/60 tracking-wider">Explore</div>
          
          <!-- 전체 (현재 구역 스코프) -->
          <router-link
              :class="isAllActive
              ? 'bg-zone-accent/10 text-zone-accent'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'"
              class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors"
              :to="zoneHomeRoute"
          >
            <LayoutGrid class="size-[15px] shrink-0"/>
            <span class="flex-1 text-[13px] font-medium">전체 도구</span>
            <span class="shrink-0 font-mono text-[11px] opacity-70">{{ zoneModules.length }}</span>
          </router-link>

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
            <component :is="cat.icon" class="size-[15px] shrink-0"/>
            <span class="flex-1 text-[13px] font-medium">{{ cat.name }}</span>
            <span class="shrink-0 font-mono text-[11px] opacity-70">{{ categoryCounts[cat.name] }}</span>
          </router-link>
        </div>
      </nav>

      <!-- 내 작업: Heavy Job 백그라운드 추적 패널 (043) -->
      <ActiveJobsPanel/>

      <!-- 사이드바 하단: 부가 링크 -->
      <div class="mt-auto flex items-center justify-between border-t border-white/60 dark:border-white/10 p-3">
        <router-link to="/suggestions" class="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground">
          <MessageSquarePlus class="size-3.5" />
          <span>건의하기</span>
        </router-link>
        <router-link to="/privacy" class="text-[11px] text-muted-foreground/50 hover:text-foreground transition-colors underline underline-offset-2">
          개인정보처리방침
        </router-link>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex min-w-0 flex-1 flex-col relative z-10">
      <!-- 상단 글로벌 헤더 -->
      <header class="flex h-[52px] shrink-0 justify-center border-b border-white/60 dark:border-white/10 bg-white/40 dark:bg-background/80 backdrop-blur-[30px] sticky top-0 z-20 shadow-[0_4px_24px_rgb(0,0,0,0.02)] dark:shadow-none">
        <div class="flex w-full max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <!-- 좌측: 모바일 메뉴 & 경로 (Breadcrumbs) -->
          <div class="flex min-w-0 flex-1 items-center gap-3 lg:w-1/3 lg:flex-none">
            <button
                class="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden shrink-0"
                @click="drawerOpen = true"
            >
              <Menu class="size-[16px]"/>
            </button>

            <div data-testid="breadcrumb" class="flex items-center gap-2 text-[13px] font-medium text-muted-foreground min-w-0">
              <router-link class="flex items-center shrink-0 transition-opacity hover:opacity-80 mr-1" to="/" title="홈으로 가기">
                <BrandLogo icon-only class="scale-[0.75] origin-left" />
              </router-link>
              <span class="text-border">/</span>
              <router-link
                :to="zoneHomeRoute"
                class="truncate transition-colors hover:underline hover:underline-offset-4"
                :class="ZONE_TEXT_CLASS[currentZoneId || 'dev']"
              >
                {{ currentZoneName }}
              </router-link>
              <span class="text-border">/</span>
              <router-link
                 v-if="displayCategory !== '전체 도구'"
                 :to="{path: zoneHomeRoute, query: {category: displayCategory}}"
                 class="truncate text-foreground transition-colors hover:underline hover:underline-offset-4"
              >{{ displayCategory }}</router-link>
              <span v-else class="truncate text-foreground">전체 도구</span>
            </div>
          </div>

          <!-- 중앙: 글로벌 검색 바 (데스크톱 전용) -->
          <div class="hidden lg:flex w-1/3 justify-center">
            <button
                class="flex w-full max-w-[320px] items-center gap-2.5 rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-left transition-all hover:bg-accent hover:border-border shadow-sm group"
                @click="paletteRef?.open()"
            >
              <Search class="size-[14px] shrink-0 text-muted-foreground group-hover:text-foreground transition-colors"/>
              <span class="flex-1 text-[12px] text-muted-foreground group-hover:text-foreground transition-colors">도구 및 기능 검색...</span>
              <kbd class="shrink-0 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">{{ shortcutKey }}</kbd>
            </button>
          </div>

          <!-- 우측 액션 (데스크톱 & 모바일) -->
          <div class="flex shrink-0 items-center justify-end gap-2 lg:w-1/3">
            <!-- 모바일 전용 검색 아이콘 -->
            <button
                class="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
                title="검색"
                @click="paletteRef?.open()"
            >
              <Search class="size-[15px]"/>
            </button>
            <ThemeToggleButton button-class="size-8 text-muted-foreground hover:bg-accent hover:text-foreground" side="bottom" />
            <UserProfileButton />
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto bg-transparent">
        <router-view/>
      </main>
    </div>

    <CommandPalette ref="paletteRef" :modules="modules"/>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {useRoute} from 'vue-router'
import {LayoutGrid, Menu, MessageSquarePlus, Search, Star, Terminal, FileText, Coffee, Gamepad2, ChevronsUpDown} from 'lucide-vue-next'
import {apiClient} from '../api/client'
import {MOCK_MODULES} from '../api/mock'
import {normalizeApiModules} from '../api/modules'

import {ZONES, zoneOf, type ZoneId} from '../config/zones'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import type {Module} from '../types'
import {CATEGORY_CONFIG, CATEGORY_ORDER} from '../utils/categoryConfig'
import {useToolFilter} from '../composables/useToolFilter'
import {useFavorites} from '../composables/useFavorites'
import ActiveJobsPanel from '../components/ActiveJobsPanel.vue'
import BrandLogo from '../components/BrandLogo.vue'
import CommandPalette from '../components/CommandPalette.vue'
import ThemeToggleButton from '../components/ThemeToggleButton.vue'
import UserProfileButton from '../components/UserProfileButton.vue'

const route = useRoute()
const modules = ref<Module[]>([])
const paletteRef = ref<InstanceType<typeof CommandPalette> | null>(null)
const drawerOpen = ref(false)

const ZONE_ICONS: Record<ZoneId, any> = {
  dev: Terminal,
  files: FileText,
  life: Coffee,
  fun: Gamepad2,
}

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

const currentZoneName = computed(() => ZONES.find(z => z.id === currentZoneId.value)?.name || 'OnTool')

const zoneHomeRoute = computed(() => zoneOf(currentZoneId.value ?? undefined).route)

const displayCategory = computed(() => {
  if (route.path === zoneHomeRoute.value) return activeCategory.value || '전체 도구'
  const moduleId = route.params.moduleId as string | undefined
  if (moduleId) {
    const mod = modules.value.find(m => m.id === moduleId)
    return mod?.category || '전체 도구'
  }
  return '전체 도구'
})

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
        .filter((m): m is Module => m !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name)),
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
  } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
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

<style scoped>

</style>

<template>
  <div class="min-h-screen bg-background relative overflow-hidden">

    <!-- 히어로 배경 그라데이션 (대문 한정 허용) -->
    <div class="pointer-events-none absolute inset-0 flex justify-center -z-10">
      <div class="absolute -top-[15%] left-[10%] h-[500px] w-[500px] rounded-full bg-zone-accent-dev/20 blur-[100px] mix-blend-screen dark:bg-zone-accent-dev/10"></div>
      <div class="absolute -top-[10%] right-[10%] h-[400px] w-[400px] rounded-full bg-zone-accent-fun/20 blur-[100px] mix-blend-screen dark:bg-zone-accent-fun/10"></div>
      <div class="absolute top-[20%] left-[30%] h-[300px] w-[300px] rounded-full bg-zone-accent-files/20 blur-[80px] mix-blend-screen dark:bg-zone-accent-files/10"></div>
    </div>

    <!-- 상단 바: 워드마크 + 로그인 + 테마 토글 -->
    <header class="flex items-center justify-between px-4 py-4 sm:px-8 relative z-10">
      <BrandLogo />
      <div class="flex items-center gap-3">
        <UserProfileButton />
        <ThemeToggleButton/>
      </div>
    </header>

    <!-- 히어로 -->
    <section 
      v-motion
      :initial="{ opacity: 0, y: 15 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 500, type: 'spring', bounce: 0.1 } }"
      class="relative z-10 mx-auto flex max-w-[720px] flex-col items-center px-4 pb-8 pt-8 text-center sm:pt-12"
    >
      <div class="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary mb-5 backdrop-blur-md">
        ✨ v2 포털 개편 베타
      </div>
      <h1 class="text-4xl font-bold tracking-tight text-foreground sm:text-5xl drop-shadow-sm">
        {{ BRAND.slogan }}<span class="hero-cursor text-primary" aria-hidden="true">_</span>
      </h1>
      <p class="mt-3 text-base text-muted-foreground max-w-[480px]">모든 필수 도구를 설치 없이 브라우저에서 바로 사용하세요.</p>

      <!-- 명령줄 스타일 검색 트리거 (Glassmorphism 적용) -->
      <button
          data-testid="landing-search-trigger"
          class="mt-6 flex w-full max-w-[500px] items-center gap-3 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-xl px-4 py-3 text-left shadow-md transition-all hover:border-primary/50 hover:bg-background/80 hover:shadow-primary/10 hover:-translate-y-0.5"
          @click="paletteRef?.open()"
      >
        <span class="font-mono text-lg text-primary" aria-hidden="true">&gt;</span>
        <span class="flex-1 font-mono text-[15px] text-muted-foreground">필요한 도구를 검색하세요...</span>
        <kbd class="shrink-0 rounded bg-muted px-2 py-1 font-mono text-[11px] font-medium text-muted-foreground">{{ shortcutKey }}</kbd>
      </button>

      <!-- 최근 사용 바로가기 (재방문자 동선) -->
      <div v-if="recentModules.length > 0" class="mt-8 flex flex-wrap items-center justify-center gap-2">
        <span class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mr-2">최근 사용:</span>
        <router-link
            v-for="mod in recentModules"
            :key="mod.id"
            class="rounded-full border border-border/50 bg-card/50 backdrop-blur-sm px-3 py-1.5 text-[12px] text-foreground transition-colors hover:border-primary/40 hover:bg-card"
            :to="`/tools/${mod.id}`"
        >
          {{ mod.name }}
        </router-link>
      </div>
    </section>

    <!-- 구역 카드 4장 -->
    <section class="relative z-10 mx-auto max-w-[900px] px-4 pb-12 sm:px-8">
      <div 
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 100, duration: 600, type: 'spring', bounce: 0.1 } }"
        class="grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        <router-link
            v-for="zone in ZONES"
            :key="zone.id"
            :class="ZONE_BORDER_CLASS[zone.id]"
            class="group flex flex-col gap-2 rounded-2xl border bg-card/80 backdrop-blur-sm p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            :to="zone.route"
        >
          <div class="flex items-center justify-between mb-1">
            <span :class="[ZONE_TEXT_CLASS[zone.id], ZONE_BG_CLASS[zone.id]]" class="font-mono text-[11px] px-2 py-0.5 rounded-full bg-opacity-10">cd {{ zone.route }}</span>
          </div>
          <h2 class="text-lg font-bold text-foreground">{{ zone.name }}</h2>
          <p class="text-[13px] text-muted-foreground leading-snug line-clamp-2">{{ zone.description }}</p>
          <div class="mt-auto pt-3 flex items-center justify-between">
            <span class="font-mono text-[11px] text-muted-foreground">
              {{ zoneModuleCounts[zone.id] > 0 ? `${zoneModuleCounts[zone.id]} Tools` : 'Soon' }}
            </span>
            <span class="text-sm opacity-0 transition-opacity group-hover:opacity-100" :class="ZONE_TEXT_CLASS[zone.id]">→</span>
          </div>
        </router-link>
      </div>
    </section>

    <!-- 푸터 -->
    <footer class="relative z-10 border-t border-border/50 bg-background/50 backdrop-blur-sm px-4 py-8 sm:px-8">
      <nav class="mx-auto flex max-w-[1000px] flex-wrap items-center justify-center gap-6 text-[14px] text-muted-foreground">
        <router-link class="transition-colors hover:text-foreground" to="/suggestions">건의하기</router-link>
        <router-link class="transition-colors hover:text-foreground" to="/privacy">개인정보처리방침</router-link>
        <router-link class="transition-colors hover:text-foreground" to="/admin">관리자</router-link>
      </nav>
      <div class="mt-4 text-center text-[12px] text-muted-foreground/60 font-mono">
        © 2026 OnTool. 모든 권리 보유.
      </div>
    </footer>

    <CommandPalette ref="paletteRef" :modules="modules"/>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {apiClient} from '../api/client'
import {MOCK_MODULES} from '../api/mock'
import {normalizeApiModules} from '../api/modules'
import {BRAND, WORDMARK_PREFIX, WORDMARK_REST} from '../config/brand'
import {ZONES, type ZoneId} from '../config/zones'
import {useRecentTools} from '../composables/useRecentTools'
import type {Module} from '../types'
import BrandLogo from '../components/BrandLogo.vue'
import CommandPalette from '../components/CommandPalette.vue'
import ThemeToggleButton from '../components/ThemeToggleButton.vue'
import UserProfileButton from '../components/UserProfileButton.vue'

// Tailwind Oxide는 소스에 리터럴로 등장하는 클래스만 스캔한다 — 동적 템플릿 문자열 금지
const ZONE_TEXT_CLASS: Record<ZoneId, string> = {
  dev: 'text-zone-accent-dev',
  files: 'text-zone-accent-files',
  life: 'text-zone-accent-life',
  fun: 'text-zone-accent-fun',
}
const ZONE_BG_CLASS: Record<ZoneId, string> = {
  dev: 'bg-zone-accent-dev/10',
  files: 'bg-zone-accent-files/10',
  life: 'bg-zone-accent-life/10',
  fun: 'bg-zone-accent-fun/10',
}
const ZONE_BORDER_CLASS: Record<ZoneId, string> = {
  dev: 'border-zone-accent-dev/20 hover:border-zone-accent-dev/50 hover:shadow-zone-accent-dev/10',
  files: 'border-zone-accent-files/20 hover:border-zone-accent-files/50 hover:shadow-zone-accent-files/10',
  life: 'border-zone-accent-life/20 hover:border-zone-accent-life/50 hover:shadow-zone-accent-life/10',
  fun: 'border-zone-accent-fun/20 hover:border-zone-accent-fun/50 hover:shadow-zone-accent-fun/10',
}

const {recentIds} = useRecentTools()
const modules = ref<Module[]>([])
const paletteRef = ref<InstanceType<typeof CommandPalette> | null>(null)
const shortcutKey = navigator.userAgent.includes('Mac') ? '⌘K' : 'Ctrl K'

const recentModules = computed(() =>
    recentIds.value
        .map(id => modules.value.find(m => m.id === id))
        .filter((m): m is Module => m !== undefined)
        .slice(0, 4),
)

const zoneModuleCounts = computed(() =>
    ZONES.reduce<Record<ZoneId, number>>((acc, zone) => {
      acc[zone.id] = modules.value.filter(m => m.zones.includes(zone.id)).length
      return acc
    }, {} as Record<ZoneId, number>),
)

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    paletteRef.value?.open()
  }
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  try {
    const {data} = await apiClient.get<Module[]>('/api/v1/modules')
    modules.value = normalizeApiModules(data)
  } catch {
    modules.value = MOCK_MODULES
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .hero-cursor {
    animation: cursor-blink 1.1s step-end infinite;
  }
}

@keyframes cursor-blink {
  50% {
    opacity: 0;
  }
}
</style>

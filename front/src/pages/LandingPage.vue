<template>
  <div class="min-h-screen flex flex-col bg-slate-50 dark:bg-background relative overflow-hidden transition-colors duration-500">

    <!-- 애플 스타일(라이트) & Vercel 스타일(다크) 융합 배경 -->
    <div class="pointer-events-none absolute inset-0 flex justify-center z-0 overflow-hidden">
      <!-- 배경 도트 패턴 (다크 모드 전용으로 제한하여 라이트 모드는 순백/실버의 깔끔함 강조) -->
      <div class="absolute inset-0 hidden dark:block bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>
      <!-- 페이드 아웃 마스크 -->
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/80 to-slate-50 dark:via-background/50 dark:to-background"></div>
    </div>

    <!-- 상단 바: 워드마크 + 로그인 + 테마 토글 -->
    <header class="flex items-center justify-between px-4 py-4 sm:px-8 relative z-10 shrink-0">
      <BrandLogo />
      <div class="flex items-center gap-3">
        <UserProfileButton />
        <ThemeToggleButton/>
      </div>
    </header>

    <!-- 수직 중앙 정렬을 위한 래퍼 -->
    <main class="flex-1 flex flex-col justify-center pb-12 sm:pb-24 relative z-10">
      <!-- 히어로 -->
      <section 
        v-motion
        :initial="{ opacity: 0, y: 15 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 500, type: 'spring', bounce: 0.1 } }"
        class="mx-auto flex w-full max-w-[800px] flex-col items-center px-4 pb-4 text-center"
      >
        <h1 class="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl drop-shadow-sm">
          {{ BRAND.slogan }}<span class="hero-cursor text-primary opacity-90" aria-hidden="true">_</span>
        </h1>
        <p class="mt-4 text-[17px] font-medium text-muted-foreground/90 max-w-[480px]">모든 필수 도구를 설치 없이 브라우저에서 바로 사용하세요.</p>

        <!-- 명령줄 스타일 검색 트리거 (Apple 스타일 초강력 블러 Glassmorphism) -->
        <button
            data-testid="landing-search-trigger"
            class="mt-8 flex w-full max-w-[640px] items-center gap-3.5 rounded-2xl border border-white/70 dark:border-white/10 bg-white/50 dark:bg-background/50 backdrop-blur-2xl px-5 py-4 text-left shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] dark:shadow-none transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:border-primary/80 hover:bg-white/80 dark:hover:bg-background/80 hover:shadow-[0_20px_40px_-10px_rgba(var(--primary),0.12)] cursor-pointer"
            @click="paletteRef?.open()"
        >
          <span class="font-mono text-lg font-bold text-primary" aria-hidden="true">&gt;</span>
          <span class="flex-1 text-[15px] text-muted-foreground font-medium">필요한 도구를 검색하세요...</span>
          <kbd class="shrink-0 rounded-md border border-black/5 dark:border-border/50 bg-black/5 dark:bg-muted/50 px-2 py-1 font-mono text-[11px] font-semibold text-muted-foreground">{{ shortcutKey }}</kbd>
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
      <section class="mx-auto w-full max-w-[800px] px-4 pt-8">
        <div 
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 100, duration: 600, type: 'spring', bounce: 0.1 } }"
          class="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6"
        >
          <router-link
              v-for="zone in ZONES"
              :key="zone.id"
              :class="ZONE_BORDER_CLASS[zone.id]"
              class="group flex flex-col gap-2 rounded-2xl border border-white/70 dark:border-white/10 bg-white/40 dark:bg-[#0a0a0a]/80 backdrop-blur-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_5px_20px_-10px_rgba(255,255,255,0.02)] transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1.5 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)]"
              :to="zone.route"
          >
            <div class="flex items-start justify-between mb-4">
              <div :class="[ZONE_BG_CLASS[zone.id], ZONE_TEXT_CLASS[zone.id]]" class="flex size-10 items-center justify-center rounded-xl shadow-sm">
                <component :is="ZONE_ICONS[zone.id]" class="size-5" />
              </div>
              <span :class="[ZONE_TEXT_CLASS[zone.id], ZONE_BG_CLASS[zone.id]]" class="font-mono text-[11px] px-2.5 py-1 rounded-full">cd {{ zone.route }}</span>
            </div>
            <h2 class="text-xl font-bold text-foreground">{{ zone.name }}</h2>
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
    </main>

    <!-- 푸터 -->
    <footer class="absolute bottom-4 left-0 right-0 z-10 px-4 sm:px-8">
      <div class="mx-auto max-w-7xl flex flex-row items-center justify-between">
        <p class="font-mono text-[11px] text-muted-foreground/60">&copy; 2026 OnTool. <a href="https://opensource.org/licenses/MIT" target="_blank" class="hover:underline hover:text-foreground transition-colors">MIT License</a></p>
        <div class="flex gap-4 text-[11px] font-medium text-muted-foreground/80">
          <router-link to="/suggestions" class="hover:text-foreground transition-colors">건의하기</router-link>
          <router-link to="/privacy" class="hover:text-foreground transition-colors">개인정보처리방침</router-link>
        </div>
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
import {BRAND} from '../config/brand'
import {ZONES, type ZoneId} from '../config/zones'
import {useRecentTools} from '../composables/useRecentTools'
import type {Module} from '../types'
import BrandLogo from '../components/BrandLogo.vue'
import CommandPalette from '../components/CommandPalette.vue'
import ThemeToggleButton from '../components/ThemeToggleButton.vue'
import UserProfileButton from '../components/UserProfileButton.vue'

import {Terminal, FileText, Coffee, Gamepad2} from 'lucide-vue-next'

const ZONE_ICONS: Record<ZoneId, any> = {
  dev: Terminal,
  files: FileText,
  life: Coffee,
  fun: Gamepad2,
}

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
  } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
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

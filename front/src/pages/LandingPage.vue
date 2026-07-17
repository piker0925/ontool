<template>
  <div class="min-h-screen bg-background">

    <!-- 상단 바: 워드마크 + 테마 토글만, 사이드바 없음 -->
    <header class="flex items-center justify-between px-4 py-4 sm:px-8">
      <span class="font-mono text-[16px] font-semibold tracking-tight">
        <span class="text-primary">{{ WORDMARK_PREFIX }}</span><span class="text-foreground">{{ WORDMARK_REST }}</span>
      </span>
      <ThemeToggleButton/>
    </header>

    <!-- 히어로 -->
    <section class="mx-auto flex max-w-[720px] flex-col items-center px-4 pb-16 pt-10 text-center sm:pt-16">
      <h1 class="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {{ BRAND.slogan }}<span class="hero-cursor text-primary" aria-hidden="true">_</span>
      </h1>
      <p class="mt-3 text-[15px] text-muted-foreground">개발부터 생활까지, 설치 없이 브라우저에서 바로</p>

      <!-- 명령줄 스타일 검색 트리거 -->
      <button
          data-testid="landing-search-trigger"
          class="mt-8 flex w-full max-w-[480px] items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/40"
          @click="paletteRef?.open()"
      >
        <span class="font-mono text-[15px] text-primary" aria-hidden="true">&gt;</span>
        <span class="flex-1 font-mono text-[13px] text-muted-foreground">도구 검색 — 예: PDF 병합, UUID</span>
        <kbd class="shrink-0 font-mono text-[11px] text-muted-foreground/70">{{ shortcutKey }}</kbd>
      </button>

      <!-- 최근 사용 바로가기 (재방문자 동선) -->
      <div v-if="recentModules.length > 0" class="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">최근 사용</span>
        <router-link
            v-for="mod in recentModules"
            :key="mod.id"
            class="rounded-full border border-border bg-card px-3 py-1 text-[12px] text-foreground transition-colors hover:border-primary/40"
            :to="`/tools/${mod.id}`"
        >
          {{ mod.name }}
        </router-link>
      </div>
    </section>

    <!-- 구역 카드 4장 -->
    <section class="mx-auto max-w-[1000px] px-4 pb-20 sm:px-8">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <router-link
            v-for="zone in ZONES"
            :key="zone.id"
            :class="ZONE_BORDER_CLASS[zone.id]"
            class="group flex flex-col gap-3 rounded-2xl border bg-card p-6 transition-transform hover:-translate-y-0.5"
            :to="zone.route"
        >
          <span :class="ZONE_TEXT_CLASS[zone.id]" class="font-mono text-[12px]">cd {{ zone.route }}</span>
          <span class="text-xl font-semibold text-foreground">{{ zone.name }}</span>
          <span class="text-[13px] text-muted-foreground">{{ zone.description }}</span>
          <span class="mt-auto font-mono text-[12px] text-muted-foreground">
            {{ zoneModuleCounts[zone.id] > 0 ? `${zoneModuleCounts[zone.id]}개 도구` : '준비 중' }}
          </span>
        </router-link>
      </div>
    </section>

    <!-- 푸터 -->
    <footer class="border-t border-border px-4 py-6 sm:px-8">
      <nav class="mx-auto flex max-w-[1000px] flex-wrap items-center justify-center gap-4 text-[13px] text-muted-foreground">
        <router-link class="transition-colors hover:text-foreground" to="/suggestions">건의하기</router-link>
        <router-link class="transition-colors hover:text-foreground" to="/privacy">개인정보처리방침</router-link>
        <router-link class="transition-colors hover:text-foreground" to="/admin">admin</router-link>
      </nav>
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
import CommandPalette from '../components/CommandPalette.vue'
import ThemeToggleButton from '../components/ThemeToggleButton.vue'

// Tailwind Oxide는 소스에 리터럴로 등장하는 클래스만 스캔한다 — 동적 템플릿 문자열 금지
const ZONE_TEXT_CLASS: Record<ZoneId, string> = {
  dev: 'text-zone-accent-dev',
  files: 'text-zone-accent-files',
  life: 'text-zone-accent-life',
  fun: 'text-zone-accent-fun',
}
const ZONE_BORDER_CLASS: Record<ZoneId, string> = {
  dev: 'border-zone-accent-dev/25 hover:border-zone-accent-dev/60',
  files: 'border-zone-accent-files/25 hover:border-zone-accent-files/60',
  life: 'border-zone-accent-life/25 hover:border-zone-accent-life/60',
  fun: 'border-zone-accent-fun/25 hover:border-zone-accent-fun/60',
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

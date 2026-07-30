<template>
  <router-link
      :to="`/tools/${mod.id}`"
      :title="mod.description ?? mod.name"
      :class="[
        'group relative flex cursor-pointer touch-manipulation overflow-hidden rounded-2xl border border-border/70 bg-card/95 backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-200 hover:border-zone-accent/60 hover:shadow-[0_8px_30px_color-mix(in_oklch,var(--zone-accent)_18%,transparent)] active:scale-[0.99]',
        mode === 'list' ? 'flex-row items-center gap-3 px-4 py-3' : 'flex-col',
      ]"
  >

    <!-- ─── 커버 이미지 영역 (grid mode only) ─── -->
    <div
        v-if="mode !== 'list'"
        class="relative h-28 w-full overflow-hidden bg-gradient-to-br from-muted/80 to-muted/30"
    >
      <!-- AI 커버 이미지 (Gemini 생성 후 연결) -->
      <img
          v-if="coverSrc"
          :src="coverSrc"
          :alt="mod.name"
          class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <!-- 이미지 없을 때 fallback: 아이콘 + 그라디언트 -->
      <div
          v-else
          class="flex h-full w-full items-center justify-center"
          :class="gradientClass"
      >
        <component :is="config.icon" class="size-10 opacity-40 text-white"/>
      </div>

      <!-- 상단 뱃지들 -->
      <div class="absolute left-2.5 top-2.5 flex gap-1.5">
        <span
            v-if="isMulti"
            class="rounded-full border border-blue-400/40 bg-blue-500/80 px-2 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-sm shadow-sm"
        >{{ multiLabel }}</span>
      </div>

      <!-- 즐겨찾기 버튼 -->
      <button
          :class="isFav ? 'opacity-100 text-amber-400' : 'opacity-0 group-hover:opacity-100 text-white/60 hover:text-amber-400'"
          class="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-[color,opacity]"
          @click.prevent="toggle(mod.id)"
      >
        <Star :class="isFav ? 'fill-amber-400' : ''" class="size-3.5"/>
      </button>
    </div>

    <!-- ─── 카드 본문 ─── -->
    <div :class="mode === 'list' ? 'flex flex-1 min-w-0 items-center gap-3' : 'flex flex-col gap-1.5 px-4 py-3'">

      <!-- 리스트 모드 아이콘 -->
      <div
          v-if="mode === 'list'"
          class="flex shrink-0 size-10 items-center justify-center rounded-xl bg-secondary/80 text-muted-foreground transition-colors group-hover:bg-zone-accent/20 group-hover:text-zone-accent"
      >
        <component :is="config.icon" class="size-4.5"/>
      </div>

      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <div class="flex items-center gap-2">
          <p class="truncate text-sm font-semibold text-foreground group-hover:text-zone-accent transition-colors">
            {{ mod.name }}
          </p>
          <!-- 리스트 모드 뱃지 -->
          <template v-if="mode === 'list'">
            <span v-if="isMulti" class="shrink-0 rounded-full border border-blue-400/40 bg-blue-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-400">{{ multiLabel }}</span>
          </template>
        </div>
        <p v-if="mod.description" class="truncate text-xs text-muted-foreground/80 leading-snug">
          {{ mod.description }}
        </p>
      </div>

      <!-- 리스트 즐겨찾기 + 화살표 -->
      <div v-if="mode === 'list'" class="flex shrink-0 items-center gap-1.5">
        <button
            :class="isFav ? 'opacity-100 text-amber-400' : 'opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-amber-400'"
            class="flex size-7 items-center justify-center rounded-lg transition-[background-color,transform] hover:bg-background/80 active:scale-95"
            @click.prevent="toggle(mod.id)"
        >
          <Star :class="isFav ? 'fill-amber-400' : ''" class="size-3.5"/>
        </button>
        <ChevronRight class="size-4 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-zone-accent"/>
      </div>
    </div>

    <!-- 그리드 모드 화살표 -->
    <div v-if="mode !== 'list'" class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
      <ChevronRight class="size-4 text-zone-accent"/>
    </div>
  </router-link>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import {ChevronRight, Star} from 'lucide-vue-next'
import {getCategoryConfig} from '../utils/categoryConfig'
import {useFavorites} from '../composables/useFavorites'
import type {Module} from '../types'

const props = withDefaults(defineProps<{
  mod: Module
  mode?: 'grid' | 'list'
}>(), {
  mode: 'grid',
})

const config = computed(() => getCategoryConfig(props.mod.category))
const {isFavorite, toggle} = useFavorites()
const isFav = computed(() => isFavorite(props.mod.id))

// 멀티 지원 게임 및 정원 정의 (1v1 vs 최대 5명)
const MULTI_GAME_IDS = new Set([
  'game-code-rain-typing', 'game-tetris', 'game-dino-run', 'game-flappy-bird',
  'game-tug-of-war', 'game-reaction-time', 'game-grid-turf-war', 'game-yacht-dice',
  'game-baseball', 'game-omok',
])

const ONE_VS_ONE_GAME_IDS = new Set([
  'game-omok', 'game-baseball',
])

const isMulti = computed(() => MULTI_GAME_IDS.has(props.mod.id))
const is1v1 = computed(() => ONE_VS_ONE_GAME_IDS.has(props.mod.id))
const multiLabel = computed(() => (is1v1.value ? '1v1 멀티' : '5인 멀티'))

// 게임별 AI 커버 이미지 경로 (Gemini 생성 후 채워짐)
const COVER_MAP: Record<string, string> = {
  'game-tetris': '/images/games/covers/game_tetris_cover.jpg',
  'game-suika-merge': '/images/games/covers/game_suika_cover.jpg',
  'game-omok': '/images/games/covers/game_omok_cover.jpg',
  'game-code-rain-typing': '/images/games/covers/game_code_rain_cover.jpg',
  'game-dino-run': '/images/games/covers/game_dino_cover.jpg',
  'game-flappy-bird': '/images/games/covers/game_flappy_cover.jpg',
  'game-pacman': '/images/games/covers/game_pacman_cover.jpg',
  'game-reaction-time': '/images/games/covers/game_reaction_cover.jpg',
}
const coverSrc = computed(() => COVER_MAP[props.mod.id] ?? null)

// 커버 없을 때 fallback 그라디언트
const GRADIENT_MAP: Record<string, string> = {
  'game-tetris': 'bg-gradient-to-br from-purple-900/80 to-indigo-900/80',
  'game-suika-merge': 'bg-gradient-to-br from-pink-900/80 to-orange-900/80',
  'game-omok': 'bg-gradient-to-br from-amber-900/80 to-stone-900/80',
  'game-code-rain-typing': 'bg-gradient-to-br from-green-900/80 to-cyan-900/80',
  'game-dino-run': 'bg-gradient-to-br from-gray-800/80 to-zinc-900/80',
  'game-flappy-bird': 'bg-gradient-to-br from-sky-900/80 to-blue-900/80',
  'game-pacman': 'bg-gradient-to-br from-yellow-900/80 to-orange-900/80',
  'game-tug-of-war': 'bg-gradient-to-br from-red-900/80 to-rose-900/80',
  'game-crossy-road': 'bg-gradient-to-br from-teal-900/80 to-emerald-900/80',
  'game-helix-jump': 'bg-gradient-to-br from-violet-900/80 to-purple-900/80',
  'game-bounce-ball': 'bg-gradient-to-br from-cyan-900/80 to-blue-900/80',
  'game-yacht-dice': 'bg-gradient-to-br from-amber-900/80 to-yellow-900/80',
  'game-minesweeper': 'bg-gradient-to-br from-slate-800/80 to-gray-900/80',
  'game-2048': 'bg-gradient-to-br from-orange-900/80 to-amber-900/80',
  'game-memory-cards': 'bg-gradient-to-br from-fuchsia-900/80 to-purple-900/80',
  'game-whack-a-mole': 'bg-gradient-to-br from-lime-900/80 to-green-900/80',
  'game-snake': 'bg-gradient-to-br from-emerald-900/80 to-teal-900/80',
  'game-reaction-time': 'bg-gradient-to-br from-blue-900/80 to-indigo-900/80',
}
const gradientClass = computed(() => GRADIENT_MAP[props.mod.id] ?? 'bg-gradient-to-br from-muted/60 to-muted/20')
</script>

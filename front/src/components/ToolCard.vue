<template>
  <router-link
      :to="`/tools/${mod.id}`"
      :title="mod.description ?? mod.name"
      :class="[
        'group relative flex cursor-pointer touch-manipulation items-center rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-200 hover:border-zone-accent hover:shadow-[0_8px_25px_color-mix(in_oklch,var(--zone-accent)_15%,transparent)] active:scale-[0.99]',
        mode === 'list' ? 'gap-3 px-3 py-2.5' : 'gap-3.5 px-4 py-4'
      ]"
  >
    <!-- 아이콘 -->
    <div
        :class="[
          'flex shrink-0 items-center justify-center rounded-xl bg-secondary/80 text-muted-foreground transition-[background-color,color] group-hover:bg-zone-accent/20 group-hover:text-zone-accent',
          mode === 'list' ? 'size-8' : 'size-10'
        ]"
    >
      <component :is="config.icon" :class="mode === 'list' ? 'size-[15px]' : 'size-[18px]'"/>
    </div>

    <!-- 이름 + 설명 -->
    <div class="min-w-0 flex-1 flex items-center gap-3">
      <div class="flex flex-col min-w-0" :class="mode === 'list' ? 'flex-row items-center gap-2' : ''">
        <div class="flex items-center gap-1.5 min-w-0">
          <p class="truncate text-[14px] font-medium text-foreground transition-colors group-hover:text-zone-accent">
            {{ mod.name }}
          </p>
          <span
              v-if="mod.kind === 'game' && !mod.zones?.includes('fun')"
              class="shrink-0 rounded-full border border-zone-accent/40 bg-zone-accent/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-zone-accent"
          >게임</span>
          <span
              v-if="isMulti"
              class="shrink-0 rounded-full border border-blue-400/40 bg-blue-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-blue-400"
          >{{ multiLabel }}</span>
        </div>
        <p v-if="mod.description && mode !== 'list'" class="truncate mt-0.5 text-[12px] text-muted-foreground">
          {{ mod.description }}
        </p>
      </div>

      <!-- 리스트 모드 전용 설명 -->
      <div v-if="mode === 'list'" class="hidden sm:flex items-center gap-2 min-w-0 flex-1">
        <span v-if="mod.description" class="truncate text-[12px] text-muted-foreground flex-1 max-w-[60%]">
          <span class="mr-2 text-border">|</span>{{ mod.description }}
        </span>
      </div>
    </div>

    <!-- 즐겨찾기 -->
    <button
        :class="isFav
        ? 'opacity-100 text-amber-400'
        : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground/30 hover:text-amber-400'"
        :title="isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'"
        class="flex size-7 shrink-0 touch-manipulation items-center justify-center rounded-md transition-[background-color,color,opacity] hover:bg-background/80"
        @click.stop.prevent="toggle(mod.id)"
    >
      <Star :class="isFav ? 'fill-amber-400' : ''" class="size-3.5"/>
    </button>

    <!-- 화살표 -->
    <ChevronRight class="size-4 shrink-0 text-muted-foreground/30 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-zone-accent"/>
  </router-link>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import {ChevronRight, Star} from 'lucide-vue-next'
import {getCategoryConfig} from '../utils/categoryConfig'
import {useFavorites} from '../composables/useFavorites'
import type {Module} from '../types'

const props = withDefaults(defineProps<{
  mod: Module;
  mode?: 'grid' | 'list'
}>(), {
  mode: 'grid'
})

const config = computed(() => getCategoryConfig(props.mod.category))
const {isFavorite, toggle} = useFavorites()
const isFav = computed(() => isFavorite(props.mod.id))

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
</script>

<template>
  <div
      :title="mod.description ?? mod.name"
      :class="[
        'group relative flex cursor-pointer items-center rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/30 hover:bg-accent/50 hover:shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:hover:shadow-none',
        mode === 'list' ? 'gap-3 px-3 py-2.5' : 'gap-3.5 px-4 py-4'
      ]"
      @click="router.push(`/tools/${mod.id}`)"
  >
    <!-- Category icon -->
    <div
        :class="[
          'flex shrink-0 items-center justify-center rounded-lg bg-secondary/80 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary',
          mode === 'list' ? 'size-8' : 'size-10'
        ]"
    >
      <component :is="config.icon" :class="mode === 'list' ? 'size-[15px]' : 'size-[18px]'"/>
    </div>

    <!-- Name + Description -->
    <div class="min-w-0 flex-1 flex items-center gap-3">
      <div class="flex flex-col min-w-0" :class="mode === 'list' ? 'flex-row items-center gap-2' : ''">
        <div class="flex items-center gap-1.5 min-w-0">
          <p class="truncate text-[14px] font-medium text-foreground group-hover:text-primary transition-colors">
            {{ mod.name }}
          </p>
          <span
              v-if="mod.kind === 'game'"
              class="shrink-0 rounded-full border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9px] font-medium text-muted-foreground"
          >게임</span>
        </div>
        <p v-if="mod.description && mode !== 'list'" class="truncate mt-0.5 text-[12px] text-muted-foreground/80">
          {{ mod.description }}
        </p>
      </div>
      
      <!-- List mode exclusive metadata -->
      <div v-if="mode === 'list'" class="hidden sm:flex items-center gap-2 min-w-0 flex-1">
        <span v-if="mod.description" class="truncate text-[12px] text-muted-foreground/60 flex-1 max-w-[60%]">
          <span class="mr-2 text-border">|</span>{{ mod.description }}
        </span>
      </div>
    </div>

    <!-- Favorite -->
    <button
        :class="isFav
        ? 'opacity-100 text-amber-400'
        : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground/30 hover:text-amber-400'"
        :title="isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'"
        class="flex size-7 shrink-0 items-center justify-center rounded-md transition-all hover:bg-background"
        @click.stop="toggle(mod.id)"
    >
      <Star :class="isFav ? 'fill-amber-400' : ''" class="size-3.5"/>
    </button>

    <!-- Arrow -->
    <ChevronRight class="size-4 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/70"/>
  </div>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import {useRouter} from 'vue-router'
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

const router = useRouter()
const config = computed(() => getCategoryConfig(props.mod.category))

const {isFavorite, toggle} = useFavorites()
const isFav = computed(() => isFavorite(props.mod.id))
</script>

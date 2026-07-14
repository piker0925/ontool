<template>
  <div
      :title="mod.description ?? mod.name"
      class="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
      @click="router.push(`/tools/${mod.id}`)"
  >
    <!-- Category icon -->
    <div
        class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/15 group-hover:text-primary"
    >
      <component :is="config.icon" class="size-4"/>
    </div>

    <!-- Name + Description -->
    <div class="min-w-0 flex-1">
      <p class="truncate text-[14px] font-semibold text-card-foreground group-hover:text-primary">
        {{ mod.name }}
      </p>
      <p v-if="mod.description" class="truncate text-[12px] text-muted-foreground">
        {{ mod.description }}
      </p>
    </div>

    <!-- Favorite -->
    <button
        :class="isFav
        ? 'opacity-100 text-amber-400'
        : 'opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-amber-400'"
        :title="isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'"
        class="flex size-6 shrink-0 items-center justify-center rounded transition-all"
        @click.stop="toggle(mod.id)"
    >
      <Star :class="isFav ? 'fill-amber-400' : ''" class="size-[13px]"/>
    </button>

    <!-- Arrow -->
    <ChevronRight class="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground"/>
  </div>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import {useRouter} from 'vue-router'
import {ChevronRight, Star} from 'lucide-vue-next'
import {getCategoryConfig} from '../utils/categoryConfig'
import {useFavorites} from '../composables/useFavorites'
import type {Module} from '../types'

const props = defineProps<{ mod: Module }>()
const router = useRouter()
const config = computed(() => getCategoryConfig(props.mod.category))

const {isFavorite, toggle} = useFavorites()
const isFav = computed(() => isFavorite(props.mod.id))
</script>

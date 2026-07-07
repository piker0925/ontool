<template>
  <div class="flex flex-col">

    <!-- Page title -->
    <div class="px-6 pb-3 pt-6">
      <h1 class="text-[13px] font-medium text-slate-400">
        {{ activeCategory ?? '전체 도구' }}
        <span class="ml-1 text-slate-300">{{ filteredModules.length }}</span>
      </h1>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-3 gap-3 px-6 pb-6">
      <div v-for="n in 18" :key="n" class="h-[68px] animate-pulse rounded-xl bg-slate-200"/>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-3 gap-3 px-6 pb-6">
      <ToolCard
          v-for="mod in filteredModules"
          :key="mod.id"
          :mod="mod"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue'
import {apiClient} from '../api/client'
import {MOCK_MODULES} from '../api/mock'
import {normalizeApiModules} from '../api/modules'
import type {Module} from '../types'
import {useToolFilter} from '../composables/useToolFilter'
import ToolCard from '../components/ToolCard.vue'

const {activeCategory, setCategory} = useToolFilter()
const modules = ref<Module[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const {data} = await apiClient.get<Module[]>('/api/v1/modules')
    modules.value = normalizeApiModules(data)
  } catch {
    modules.value = MOCK_MODULES
  } finally {
    loading.value = false
  }
})

const filteredModules = computed(() =>
    activeCategory.value
        ? modules.value.filter(m => m.category === activeCategory.value)
        : modules.value
)

</script>

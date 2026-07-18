<template>
  <CommandDialog v-model:open="isOpen">
    <CommandInput placeholder="어떤 도구가 필요하신가요? (예: json)" @input="onSearchInput"/>
    <CommandList class="max-h-[400px]">
      <CommandEmpty class="py-12 text-center text-sm text-muted-foreground">도구를 찾을 수 없습니다.</CommandEmpty>
      <CommandGroup
          v-for="(group, groupLabel) in grouped"
          :key="groupLabel"
          :heading="String(groupLabel)"
      >
        <CommandItem
            v-for="mod in group"
            :key="mod.id"
            :value="`${mod.name} ${mod.category} ${mod.description ?? ''} ${keywordStrings(mod.keywords).join(' ')}`"
            class="flex items-center gap-3 py-2.5 cursor-pointer"
            @select="navigate(mod)"
        >
          <div class="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground shadow-sm">
            <component
                :is="getCategoryConfig(mod.category).icon"
                class="size-4"
            />
          </div>
          <span class="flex-1 truncate text-[14px] font-medium">{{ mod.name }}</span>
          <span class="shrink-0 rounded-md bg-secondary/60 px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">{{ mod.category }}</span>
        </CommandItem>
      </CommandGroup>
      <CommandGroup v-if="isAdminSearch" heading="System">
        <CommandItem
            value="admin 어드민 관리자"
            class="flex items-center gap-3 py-2.5 cursor-pointer text-rose-500"
            @select="router.push('/admin'); isOpen = false"
        >
          <div class="flex size-7 shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-500 shadow-sm">
            <Lock class="size-4" />
          </div>
          <span class="flex-1 truncate text-[14px] font-medium">관리자 콘솔 (Admin)</span>
          <span class="shrink-0 rounded-md bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-rose-500">system</span>
        </CommandItem>
      </CommandGroup>
    </CommandList>
    <div class="flex items-center gap-5 border-t border-border/50 px-4 py-3 font-mono text-[11px] text-muted-foreground bg-muted/20">
      <span>↑↓ 이동</span>
      <span>↵ 선택</span>
      <span>Esc 닫기</span>
    </div>
  </CommandDialog>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {useRouter} from 'vue-router'
import type {Module} from '../types'
import {getCategoryConfig} from '../utils/categoryConfig'
import {zoneOf} from '../config/zones'
import {keywordStrings, resolveAliasQuery} from '../utils/keywordAlias'
import {Lock} from 'lucide-vue-next'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

const props = defineProps<{ modules: Module[] }>()
const router = useRouter()
const isOpen = ref(false)
const search = ref('')

function open() {
  search.value = ''
  isOpen.value = true
}

defineExpose({open})

function onSearchInput(e: Event) {
  search.value = (e.target as HTMLInputElement).value ?? ''
}

const grouped = computed(() =>
    props.modules.reduce<Record<string, Module[]>>((acc, mod) => {
      // zones[0]이 기본 구역 (ADR-0023) — 카테고리까지 묶지 않고 큼직한 구역으로만 그룹핑하여 스캐닝 극대화
      const groupLabel = zoneOf(mod.zones[0]).name
      ;(acc[groupLabel] ??= []).push(mod)
      return acc
    }, {}),
)

const isAdminSearch = computed(() => {
  const s = search.value.toLowerCase().trim()
  return s === 'admin' || s === '어드민' || s === '관리자'
})

function navigate(mod: Module) {
  isOpen.value = false
  // 검색어가 딥링크 별칭과 일치하면 해당 모드/탭으로 바로 이동한다
  const query = resolveAliasQuery(mod.keywords, search.value)
  router.push(query ? `/tools/${mod.id}?${query}` : `/tools/${mod.id}`)
}
</script>

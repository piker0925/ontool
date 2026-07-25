<template>
  <div class="flex flex-col gap-3 w-full">
    <div class="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
      <button
          v-for="c in SPECIAL_CHAR_CATEGORIES"
          :key="c.id"
          :class="activeCategory === c.id
          ? 'bg-zone-accent-life text-white dark:text-background'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
          class="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors"
          @click="activeCategory = c.id"
      >{{ c.label }}
      </button>
    </div>

    <div class="grid grid-cols-4 gap-2 sm:grid-cols-6">
      <div v-for="ch in currentChars" :key="ch" class="relative">
        <button
            class="flex h-14 w-full items-center justify-center rounded-lg border border-border bg-card text-lg text-foreground transition-colors hover:border-zone-accent-life hover:text-zone-accent-life"
            @click="copyChar(ch)"
        >{{ ch }}
        </button>
        <span v-if="copiedChar === ch"
              class="absolute inset-x-0 -bottom-5 text-center text-[10px] font-semibold text-zone-accent-life">복사됨</span>
      </div>
    </div>

    <p class="text-[11px] text-muted-foreground">문자를 클릭하면 클립보드에 복사됩니다</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {SPECIAL_CHAR_CATEGORIES} from '../../utils/specialChars'

const activeCategory = ref(SPECIAL_CHAR_CATEGORIES[0].id)
const copiedChar = ref<string | null>(null)
let copyTimer: ReturnType<typeof setTimeout> | undefined

const currentChars = computed(() =>
    SPECIAL_CHAR_CATEGORIES.find(c => c.id === activeCategory.value)?.chars ?? [],
)

async function copyChar(ch: string) {
  await navigator.clipboard.writeText(ch)
  copiedChar.value = ch
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copiedChar.value = null
  }, 2000)
}
</script>

<template>
  <!-- 싱글 vs 배틀 모드 세그먼트 탭 -->
  <div class="flex w-full items-center justify-center px-2 pt-1 pb-4">
    <div class="flex items-center rounded-2xl border border-border/60 bg-muted/30 p-1 backdrop-blur-sm shadow-sm gap-1">
      <!-- 싱글 탭 -->
      <button
          :class="modelValue === 'single'
            ? 'bg-background text-foreground shadow-sm border border-border/60'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'"
          class="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-[background-color,color,box-shadow] duration-150"
          :data-testid="`${testidPrefix}-mode-single`"
          type="button"
          @click="$emit('update:modelValue', 'single')"
      >
        <User class="size-3.5 shrink-0"/>
        싱글 플레이
      </button>

      <!-- 배틀 탭 -->
      <button
          :class="modelValue === 'battle'
            ? 'bg-zone-accent text-white shadow-[0_0_12px_color-mix(in_oklch,var(--zone-accent)_40%,transparent)]'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'"
          class="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-[background-color,color,box-shadow] duration-150"
          :data-testid="`${testidPrefix}-mode-toggle`"
          type="button"
          @click="$emit('update:modelValue', 'battle')"
      >
        <Swords class="size-3.5 shrink-0"/>
        {{ battleLabel }}
        <span v-if="maxPlayers" class="font-mono text-[9px] opacity-70">{{ maxPlayers }}인</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {Swords, User} from 'lucide-vue-next'

withDefaults(defineProps<{
  modelValue: 'single' | 'battle'
  testidPrefix: string
  battleLabel?: string
  maxPlayers?: number
}>(), {
  battleLabel: '배틀 대결',
  maxPlayers: 5,
})

defineEmits<{
  'update:modelValue': ['single' | 'battle']
}>()
</script>

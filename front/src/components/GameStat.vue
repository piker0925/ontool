<template>
  <div v-if="label !== undefined" class="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/30 backdrop-blur-md shadow-sm">
    <span class="text-xs text-muted-foreground font-medium">{{ label }}</span>
    <span :data-testid="testid" class="font-mono text-sm font-bold text-zone-accent tracking-tight">{{ value }}</span>
  </div>

  <div v-else :class="toneClass" :data-testid="testid" class="px-3.5 py-1.5 rounded-xl border border-border/60 bg-muted/30 backdrop-blur-md text-xs font-semibold shadow-sm">
    {{ text }}
  </div>
</template>

<script lang="ts" setup>
import {computed} from 'vue'

const props = withDefaults(defineProps<{
  testid?: string
  label?: string
  value?: string | number
  text?: string
  tone?: 'neutral' | 'win' | 'lose'
}>(), {
  tone: 'neutral',
})

const toneClass = computed(() => ({
  win: 'text-zone-accent border-zone-accent/40 shadow-[0_0_10px_var(--zone-accent-fun)]',
  lose: 'text-destructive border-destructive/40 shadow-[0_0_10px_var(--destructive)]',
  neutral: 'text-muted-foreground border-border/40',
}[props.tone]))
</script>

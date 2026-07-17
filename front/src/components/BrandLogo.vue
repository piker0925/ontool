<template>
  <div class="flex items-center gap-2.5">
    <!-- SVG 큐브 심볼 -->
    <svg class="h-7 w-7 sm:h-8 sm:w-8 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" fill="oklch(0.495 0.185 257)" opacity="0.15" />
      <path d="M24 8L40 16L24 24L8 16L24 8Z" fill="oklch(0.74 0.14 257)" />
      <path d="M24 10.5L37 17L24 23.5L11 17L24 10.5Z" fill="oklch(0.85 0.10 257)" opacity="0.8"/>
      <path d="M8 16V32L24 40V24L8 16Z" fill="oklch(0.495 0.185 257)" />
      <path d="M40 16V32L24 40V24L40 16Z" fill="oklch(0.35 0.15 257)" />
      <path d="M26 26.5L37 21V30L26 35.5V26.5Z" fill="oklch(0.45 0.18 257)" />
      <path d="M8 16L24 24M40 16L24 24M24 24V40" stroke="oklch(0.95 0.02 257)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
    </svg>
    
    <!-- 워드마크 -->
    <span class="font-mono text-[20px] sm:text-[22px] font-bold tracking-tight">
      <span class="text-primary">{{ WORDMARK_PREFIX }}</span><span class="text-foreground">{{ WORDMARK_REST }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { WORDMARK_PREFIX, WORDMARK_REST } from '../config/brand'
</script>

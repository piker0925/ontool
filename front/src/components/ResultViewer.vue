<template>
  <div class="relative flex h-full flex-col gap-3">
    <template v-if="text">
      <div class="absolute right-2 top-2 z-10">
        <ResultActionBar :text="text" filename="result.txt" />
      </div>
      <Textarea :model-value="text" class="min-h-[240px] flex-1 resize-y font-mono text-sm pt-12" readonly/>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {Textarea} from '@/components/ui/textarea'
import ResultActionBar from '@/components/ResultActionBar.vue'

defineProps<{ text: string | null }>()
</script>


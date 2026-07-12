<template>
  <div class="flex h-full flex-col gap-3">
    <template v-if="url">
      <Button as-child>
        <a :href="url" download>⬇ 다운로드</a>
      </Button>
      <!-- 파일 결과에 동반되는 advisory (예: 업스케일 경고) -->
      <p v-if="text" class="text-[12px] text-amber-600 dark:text-amber-400">{{ text }}</p>
    </template>
    <template v-else-if="text">
      <Textarea :model-value="text" class="min-h-[240px] flex-1 resize-y font-mono text-sm" readonly/>
      <Button class="w-fit" variant="outline" @click="copy">복사</Button>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {Button} from '@/components/ui/button'
import {Textarea} from '@/components/ui/textarea'

const props = defineProps<{ url: string | null; text: string | null }>()

function copy() {
  if (props.text) navigator.clipboard.writeText(props.text)
}
</script>

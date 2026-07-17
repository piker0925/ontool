<template>
  <div class="mx-auto max-w-2xl px-6 py-8">
    <h1 class="mb-1 text-xl font-semibold text-foreground">건의하기</h1>
    <p class="mb-6 text-sm text-muted-foreground">추가됐으면 하는 도구나 기능, 불편한 점을 자유롭게 남겨주세요.</p>

    <div v-if="submitted" class="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
      <p class="text-sm text-foreground">감사합니다! 소중한 의견 남겨주셔서 감사합니다.</p>
      <Button class="mt-4 text-xs" size="sm" variant="outline" @click="submitted = false">다른 의견 남기기</Button>
    </div>

    <div v-else class="rounded-xl border border-border bg-card p-6 shadow-sm">
      <Textarea
          v-model="content"
          class="min-h-[120px] resize-none text-sm"
          placeholder="건의사항을 입력해주세요..."
      />
      <div class="mt-3 flex items-center justify-between">
        <p class="text-xs text-muted-foreground">
          <span v-if="user" class="text-primary font-medium">{{ user.nickname }}</span>
          <span v-else>익명 · 로그인 없이 제출</span>
        </p>
        <Button :disabled="submitting || !content.trim()" class="text-xs" size="sm" @click="submit">
          {{ submitting ? '제출 중...' : '제출' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {Button} from '@/components/ui/button'
import {Textarea} from '@/components/ui/textarea'
import {apiClient} from '../api/client'
import {useAuth} from '../composables/useAuth'

const {user} = useAuth()
const content = ref('')
const submitting = ref(false)
const submitted = ref(false)

async function submit() {
  if (!content.value.trim()) return
  submitting.value = true
  try {
    await apiClient.post('/api/v1/suggestions', {content: content.value})
    content.value = ''
    submitted.value = true
  } finally {
    submitting.value = false
  }
}
</script>

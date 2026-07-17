<template>
  <div class="flex min-h-screen items-center justify-center bg-background">
    <div class="flex flex-col items-center gap-4 text-center">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p class="text-sm text-muted-foreground">로그인 처리 중입니다...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { setTokens, fetchUser } = useAuth()

onMounted(async () => {
  const hash = window.location.hash.substring(1)
  const params = new URLSearchParams(hash)

  const error = params.get('error')
  if (error) {
    toast.error('로그인에 실패했습니다.')
    router.replace('/')
    return
  }

  const access = params.get('access')
  const refresh = params.get('refresh')

  if (access && refresh) {
    setTokens(access, refresh)
    await fetchUser()
    toast.success('로그인 되었습니다.')
    router.replace('/')
  } else {
    toast.error('유효하지 않은 로그인 응답입니다.')
    router.replace('/')
  }
})
</script>

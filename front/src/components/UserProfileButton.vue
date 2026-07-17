<template>
  <div v-if="isLoading" class="h-8 w-8 animate-pulse rounded-full bg-muted"></div>
  <template v-else>
    <DropdownMenu v-if="isLoggedIn && user">
      <DropdownMenuTrigger as-child>
        <button class="flex items-center gap-2 rounded-full border border-border/50 bg-background/50 pl-2 pr-3 py-1 text-sm font-medium transition-colors hover:bg-accent focus:outline-none">
          <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            {{ user.nickname.charAt(0).toUpperCase() }}
          </div>
          <span class="max-w-[100px] truncate">{{ user.nickname }}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-56">
        <DropdownMenuLabel>
          <div class="flex flex-col space-y-1">
            <p class="text-sm font-medium leading-none">{{ user.nickname }}</p>
            <p v-if="user.email" class="text-xs leading-none text-muted-foreground">{{ user.email }}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <!-- TODO: 마이페이지 라우트 추가 시 수정 -->
        <DropdownMenuItem @click="$router.push('/admin')">
          <Settings class="mr-2 h-4 w-4" />
          <span>설정</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="logout" class="text-destructive focus:text-destructive">
          <LogOut class="mr-2 h-4 w-4" />
          <span>로그아웃</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <div v-else class="flex items-center gap-2">
      <button @click="loginWithGoogle" class="flex h-8 items-center justify-center rounded-full border border-border/50 bg-background px-3 text-xs font-medium transition-colors hover:bg-accent">
        <svg class="mr-2 h-3.5 w-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
        Google
      </button>
      <button @click="loginWithKakao" class="flex h-8 items-center justify-center rounded-full border border-border/50 bg-[#FEE500] px-3 text-xs font-medium text-black transition-colors hover:bg-[#FEE500]/80">
        <svg class="mr-2 h-3.5 w-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3c-5.52 0-10 3.58-10 8 0 2.86 1.83 5.37 4.54 6.81l-1.15 4.24c-.13.48.43.83.84.58l4.98-3.32c.26.02.52.03.79.03 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/></svg>
        Kakao
      </button>
    </div>
  </template>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { LogOut, Settings } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useAuth } from '../composables/useAuth'

const { user, isLoggedIn, isLoading, fetchUser, logout, loginWithGoogle, loginWithKakao } = useAuth()

onMounted(() => {
  // 컴포넌트 마운트 시 (새로고침 등) 토큰이 있으면 유저 정보 패치
  if (isLoggedIn.value && !user.value) {
    fetchUser()
  }
})
</script>

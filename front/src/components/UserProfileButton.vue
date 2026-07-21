<template>
  <div v-if="isLoading" class="h-8 w-8 animate-pulse rounded-full bg-muted"></div>
  <template v-else>
    <DropdownMenu v-if="isLoggedIn && user">
      <DropdownMenuTrigger as-child>
        <button class="relative flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold shadow-sm ring-1 ring-border/50 transition-all hover:ring-primary/50 hover:shadow-md focus:outline-none">
          {{ user.nickname.charAt(0).toUpperCase() }}
          <!-- Provider Badge (Trigger) -->
          <div v-if="user.provider === 'GOOGLE'" class="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/10 dark:ring-white/20">
            <svg class="h-2.5 w-2.5 text-[#4285F4]" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
          </div>
          <div v-else-if="user.provider === 'KAKAO'" class="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FEE500] shadow-sm ring-1 ring-black/10 dark:ring-white/20">
            <svg class="h-2.5 w-2.5 text-black" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3c-5.52 0-10 3.58-10 8 0 2.86 1.83 5.37 4.54 6.81l-1.15 4.24c-.13.48.43.83.84.58l4.98-3.32c.26.02.52.03.79.03 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/></svg>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-60 p-2 rounded-xl shadow-xl">
        <DropdownMenuLabel class="px-2 py-2 flex items-center gap-3">
          <div class="relative flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-bold text-lg">
            {{ user.nickname.charAt(0).toUpperCase() }}
            <!-- Provider Badge (Dropdown Label) -->
            <div v-if="user.provider === 'GOOGLE'" class="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/10 dark:ring-white/20">
              <svg class="h-2.5 w-2.5 text-[#4285F4]" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            </div>
            <div v-else-if="user.provider === 'KAKAO'" class="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FEE500] shadow-sm ring-1 ring-black/10 dark:ring-white/20">
              <svg class="h-2.5 w-2.5 text-black" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3c-5.52 0-10 3.58-10 8 0 2.86 1.83 5.37 4.54 6.81l-1.15 4.24c-.13.48.43.83.84.58l4.98-3.32c.26.02.52.03.79.03 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/></svg>
            </div>
          </div>
          <div class="flex flex-col space-y-1 overflow-hidden">
            <p class="text-sm font-semibold leading-none text-foreground truncate">{{ user.nickname }}</p>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-medium leading-none px-1.5 py-0.5 rounded-sm border" :class="user.provider === 'GOOGLE' ? 'bg-muted/50 text-muted-foreground border-border' : 'bg-[#FEE500]/10 text-amber-600 dark:text-amber-400 border-amber-500/20'">
                {{ user.provider === 'GOOGLE' ? 'Google' : 'Kakao' }}
              </span>
              <p v-if="user.email" class="text-[11px] leading-none text-muted-foreground truncate">{{ user.email }}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator class="my-1" />
        <DropdownMenuItem class="cursor-pointer rounded-md px-2 py-2 transition-colors hover:bg-accent" @click="router.push('/mypage')">
          <User class="mr-2 h-4 w-4 text-muted-foreground" />
          <span class="flex-1">마이페이지</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator class="my-1" />
        <DropdownMenuItem class="cursor-pointer rounded-md px-2 py-2 text-destructive transition-colors hover:bg-destructive/10 focus:text-destructive" @click="logout">
          <LogOut class="mr-2 h-4 w-4" />
          <span>로그아웃</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog v-else>
      <DialogTrigger as-child>
        <button class="flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-sm transition-all hover:scale-105 hover:bg-primary/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20">
          로그인
        </button>
      </DialogTrigger>
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle class="text-center text-xl font-bold mt-2">OnTool 시작하기</DialogTitle>
          <DialogDescription class="text-center mt-2 mb-4">
            로그인하여 즐겨찾기와 작업 이력을 저장하세요.<br/>(비회원도 모든 도구를 무료로 사용할 수 있습니다)
          </DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-3 px-4 pb-4">
          <div class="flex flex-col gap-1.5">
            <button @click="loginWithGoogle()" class="relative flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background px-4 text-[14px] font-medium transition-all hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/20">
              <svg class="absolute left-4 h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              Google로 시작하기
            </button>
            <button @click="loginWithGoogle(true)" class="text-center text-[11px] text-muted-foreground transition-colors hover:text-foreground focus:outline-none">
              다른 구글 계정으로 로그인
            </button>
          </div>
          <div class="flex flex-col gap-1.5">
            <button @click="loginWithKakao()" class="relative flex h-11 w-full items-center justify-center rounded-xl bg-[#FEE500] px-4 text-[14px] font-medium text-black transition-all hover:bg-[#FEE500]/90 focus:outline-none focus:ring-2 focus:ring-[#FEE500]/50">
              <svg class="absolute left-4 h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3c-5.52 0-10 3.58-10 8 0 2.86 1.83 5.37 4.54 6.81l-1.15 4.24c-.13.48.43.83.84.58l4.98-3.32c.26.02.52.03.79.03 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/></svg>
              카카오로 시작하기
            </button>
            <button @click="loginWithKakao(true)" class="text-center text-[11px] text-muted-foreground transition-colors hover:text-foreground focus:outline-none">
              다른 카카오 계정으로 로그인
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </template>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut, User } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { user, isLoggedIn, isLoading, fetchUser, logout, loginWithGoogle, loginWithKakao } = useAuth()

onMounted(() => {
  // 컴포넌트 마운트 시 (새로고침 등) 토큰이 있으면 유저 정보 패치
  if (isLoggedIn.value && !user.value) {
    fetchUser()
  }
})
</script>

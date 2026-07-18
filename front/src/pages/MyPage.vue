<template>
  <div class="mx-auto max-w-2xl px-6 py-12">
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight text-foreground">마이페이지</h1>
      <p class="mt-2 text-muted-foreground">내 계정 정보와 활동 내역을 관리합니다.</p>
    </div>

    <Card v-if="user" class="border shadow-sm">
      <CardHeader>
        <CardTitle class="text-xl">프로필</CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div class="flex-1 space-y-1">
            <div class="text-sm font-medium text-muted-foreground">닉네임</div>
            
            <div v-if="isEditingNickname" class="flex items-center gap-2">
              <Input 
                v-model="editNickname" 
                class="max-w-[200px]" 
                @keyup.enter="saveNickname"
                @keyup.escape="cancelEdit"
                minlength="2"
                maxlength="20"
                autofocus
              />
              <Button size="icon" variant="ghost" @click="saveNickname">
                <Check class="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" @click="cancelEdit">
                <X class="h-4 w-4" />
              </Button>
            </div>
            
            <div v-else class="flex items-center gap-2 text-lg font-semibold">
              {{ user.nickname }}
              <Button size="icon" variant="ghost" class="h-6 w-6 text-muted-foreground hover:text-foreground" @click="startEdit">
                <Edit2 class="h-3 w-3" />
              </Button>
              <Badge v-if="user.provider === 'GOOGLE'" variant="secondary" class="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">Google</Badge>
              <Badge v-if="user.provider === 'KAKAO'" variant="secondary" class="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300">Kakao</Badge>
            </div>
          </div>
        </div>

        <div v-if="user.email" class="space-y-1">
          <div class="text-sm font-medium text-muted-foreground">이메일</div>
          <div class="text-base">{{ user.email }}</div>
        </div>

        <div class="space-y-1">
          <div class="text-sm font-medium text-muted-foreground">가입일</div>
          <div class="text-base">{{ formatDate(user.createdAt) }}</div>
        </div>
      </CardContent>
      <CardFooter class="flex justify-between rounded-b-xl border-t bg-muted/50 p-4">
        <Button variant="ghost" class="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" @click="showWithdrawModal = true">
          <Trash2 class="h-4 w-4" />
          회원 탈퇴
        </Button>
        <Button variant="outline" class="gap-2" @click="logout">
          <LogOut class="h-4 w-4" />
          로그아웃
        </Button>
      </CardFooter>
    </Card>
    
    <!-- 작업 이력 섹션 (050) -->
    <JobHistorySection v-if="user" />

    <div v-else-if="isLoading" class="py-12 text-center text-muted-foreground">
      로딩 중...
    </div>

    <!-- 회원 탈퇴 확인 모달 -->
    <Dialog v-model:open="showWithdrawModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>정말 탈퇴하시겠습니까?</DialogTitle>
          <DialogDescription class="pt-4 space-y-2">
            <p>탈퇴 시 계정 정보 및 즐겨찾기, 좋아요 등 <strong>모든 개인 데이터가 즉시 삭제되며 절대 복구할 수 없습니다.</strong></p>
            <p>작성하신 댓글과 작업 이력은 삭제되지 않지만 익명으로 전환됩니다.</p>
            <p class="text-destructive font-semibold mt-2">※ 동일한 계정으로 다시 가입하더라도 기존 데이터는 복구되지 않습니다.</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="mt-4 sm:justify-end gap-2 sm:gap-0">
          <Button variant="outline" @click="showWithdrawModal = false">취소</Button>
          <Button variant="destructive" @click="confirmWithdraw" :disabled="isWithdrawing">
            {{ isWithdrawing ? '처리 중...' : '영구 탈퇴' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { toast } from 'vue-sonner'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog'
import JobHistorySection from '../components/JobHistorySection.vue'
import { Edit2, Check, X, LogOut, Trash2 } from 'lucide-vue-next'
import { apiClient } from '../api/client'

const router = useRouter()
const { user, isLoggedIn, isLoading, fetchUser, logout, updateNickname } = useAuth()

const isEditingNickname = ref(false)
const editNickname = ref('')
const showWithdrawModal = ref(false)
const isWithdrawing = ref(false)

onMounted(async () => {
  if (!isLoggedIn.value) {
    toast.error('로그인이 필요합니다.')
    router.replace('/')
    return
  }
  if (!user.value) {
    await fetchUser()
  }
})

watch(isLoggedIn, (newVal) => {
  if (!newVal) {
    router.replace('/')
  }
})

function startEdit() {
  if (user.value) {
    editNickname.value = user.value.nickname
    isEditingNickname.value = true
  }
}

function cancelEdit() {
  isEditingNickname.value = false
}

async function saveNickname() {
  const trimmed = editNickname.value.trim()
  if (!trimmed || trimmed.length < 2 || trimmed.length > 20) {
    toast.error('닉네임은 2~20자로 입력해주세요.')
    return
  }
  
  if (trimmed === user.value?.nickname) {
    cancelEdit()
    return
  }

  try {
    await updateNickname(trimmed)
    cancelEdit()
  } catch (e) {
    // 에러 처리는 useAuth에서 토스트로 띄움
  }
}

async function confirmWithdraw() {
  isWithdrawing.value = true
  try {
    await apiClient.delete('/api/v1/users/me')
    showWithdrawModal.value = false
    toast.success('회원 탈퇴가 완료되었습니다.')
    
    // 로그아웃 로직 수행(로컬스토리지 정리 및 리다이렉트)
    await logout()
  } catch (e) {
    console.error('Withdrawal failed:', e)
    toast.error('회원 탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해주세요.')
  } finally {
    isWithdrawing.value = false
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
</script>

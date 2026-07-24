<template>
  <div class="pt-4">
    <!-- 인라인 알림 배너 (신고/삭제 결과 등) -->
    <div v-if="feedback"
         :class="feedback.type === 'error'
           ? 'border-destructive/30 bg-destructive/10 text-destructive'
           : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
         class="mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs shadow-sm">
      <AlertCircle v-if="feedback.type === 'error'" class="mt-0.5 size-3.5 shrink-0"/>
      <CheckCircle2 v-else class="mt-0.5 size-3.5 shrink-0"/>
      <p class="flex-1 font-medium">{{ feedback.message }}</p>
      <button aria-label="알림 닫기" class="shrink-0 text-current/70 transition-colors hover:text-current" @click="feedback = null">
        <X class="size-3.5"/>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="mb-4 py-4 text-center text-sm text-muted-foreground">불러오는 중...</div>

    <!-- Empty -->
    <div v-else-if="comments.length === 0" class="mb-4 py-6 text-center">
      <p class="text-sm text-muted-foreground">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>
    </div>

    <!-- Comments list -->
    <ul v-else class="mb-4 space-y-3">
      <li v-for="c in comments" :key="c.id" class="rounded-md border border-border bg-muted/40 px-4 py-3 relative group">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold" :class="c.nickname ? 'text-foreground' : 'text-muted-foreground'">
            {{ c.nickname || '익명' }}
          </span>
          <div class="flex items-center gap-1.5">
            <span class="font-mono text-xs text-muted-foreground">{{ formatDate(c.createdAt) }}</span>
            <button
              v-if="isLoggedIn"
              @click="openReport(c.id)"
              class="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
              title="댓글 신고"
            >
              <ShieldAlert class="size-3"/>
              신고
            </button>
            <button
              v-if="isLoggedIn && user?.nickname === c.nickname && c.nickname !== null"
              @click="openDeleteConfirm(c.id)"
              class="flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/20"
              title="댓글 삭제"
            >
              <Trash2 class="size-3"/>
              삭제
            </button>
          </div>
        </div>
        <p class="text-sm text-foreground whitespace-pre-wrap">{{ c.content }}</p>

        <!-- 삭제 확인 -->
        <div v-if="deletingId === c.id" class="mt-3 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p class="text-xs text-destructive">정말 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
          <div class="flex shrink-0 items-center gap-2">
            <button class="text-xs text-muted-foreground hover:underline" @click="closeDeleteConfirm">취소</button>
            <Button class="h-6 text-xs" size="sm" variant="destructive" @click="confirmDeleteComment(c.id)">삭제</Button>
          </div>
        </div>

        <!-- 신고 폼 -->
        <div v-if="reportingId === c.id" class="mt-3 rounded-lg border border-border bg-muted/30 p-3 shadow-sm">
          <p class="mb-2 text-xs font-medium text-foreground">신고 사유를 선택해 주세요</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="opt in reportReasons" :key="opt.value"
              type="button"
              class="rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
              :class="reportReason === opt.value
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'"
              @click="reportReason = opt.value"
            >{{ opt.label }}</button>
          </div>
          <Textarea
              v-if="reportReason === 'OTHER'"
              v-model="reportDetail"
              aria-label="신고 상세 사유"
              class="mt-2 min-h-[56px] resize-none text-xs"
              placeholder="구체적인 사유를 입력해 주세요 (필수)"
          />
          <div class="mt-2 flex items-center justify-end gap-2">
            <button class="text-xs text-muted-foreground hover:underline" @click="closeReport">취소</button>
            <Button
                :disabled="reportSubmitting || (reportReason === 'OTHER' && !reportDetail.trim())"
                class="text-xs"
                size="sm"
                variant="outline"
                @click="submitReport(c.id)"
            >{{ reportSubmitting ? '접수 중...' : '신고 접수' }}</Button>
          </div>
        </div>
      </li>
    </ul>

    <!-- New comment form -->
    <div class="space-y-2">
      <Textarea
          v-model="newContent"
          aria-label="댓글 내용"
          class="min-h-[72px] resize-none text-sm"
          placeholder="댓글을 남겨주세요..."
          @keydown.ctrl.enter.prevent="handleShortcut"
          @keydown.meta.enter.prevent="handleShortcut"
      />
      <div class="flex items-center justify-between">
        <p class="text-[11px]" :class="isLoggedIn ? 'text-foreground font-medium' : 'text-muted-foreground'">
          <template v-if="isLoggedIn">{{ user?.nickname }} (으)로 댓글 작성</template>
          <template v-else>익명 · 로그인 없이 작성</template>
          <span class="hidden text-muted-foreground/60 sm:inline"> · Ctrl + Enter로 등록</span>
        </p>
        <Button
            :disabled="submitting || !newContent.trim()"
            class="text-xs"
            size="sm"
            variant="outline"
            @click="submitComment"
        >{{ submitting ? '등록 중...' : '댓글 등록' }}</Button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {onMounted, onUnmounted, ref} from 'vue'
import {AlertCircle, CheckCircle2, ShieldAlert, Trash2, X} from 'lucide-vue-next'
import {Button} from '@/components/ui/button'
import {Textarea} from '@/components/ui/textarea'
import {apiClient} from '@/api/client'
import {useAuth} from '@/composables/useAuth'
import {COMMENT_REPORT_REASONS} from '@/constants/commentReportReasons'

interface Comment {
  id: number
  content: string
  createdAt: string
  nickname?: string | null
}

const props = defineProps<{ moduleId: string }>()
const emit = defineEmits<{ count: [count: number] }>()

const { isLoggedIn, user } = useAuth()

const comments = ref<Comment[]>([])
const loading = ref(false)
const submitting = ref(false)
const newContent = ref('')

// --- 인라인 알림 배너 — 신고/삭제 등 이 컴포넌트 내 모든 결과 알림은 alert() 대신 이걸 쓴다 ---
const feedback = ref<{ type: 'error' | 'success', message: string } | null>(null)
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

function showFeedback(type: 'error' | 'success', message: string) {
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedback.value = {type, message}
  // 성공 메시지는 잠시 후 저절로 사라진다. 에러는 사용자가 직접 닫을 때까지 남겨서 놓치지 않게 한다.
  if (type === 'success') {
    feedbackTimer = setTimeout(() => { feedback.value = null }, 4000)
  }
}

// --- 댓글 삭제 확인(인라인) ---
const deletingId = ref<number | null>(null)

function openDeleteConfirm(id: number) {
  reportingId.value = null
  deletingId.value = id
}

function closeDeleteConfirm() {
  deletingId.value = null
}

// --- 댓글 신고(099) ---
const reportReasons = COMMENT_REPORT_REASONS
const reportingId = ref<number | null>(null)
const reportReason = ref('SPAM')
const reportDetail = ref('')
const reportSubmitting = ref(false)

async function loadComments() {
  loading.value = true
  try {
    const {data} = await apiClient.get<Comment[]>(`/api/v1/tools/${props.moduleId}/comments`)
    comments.value = data
  } catch {
    comments.value = []
  } finally {
    loading.value = false
    emit('count', comments.value.length)
  }
}

function handleShortcut(e: KeyboardEvent) {
  // 한글 입력 중(IME 조합 중) 단축키를 누르면 Vue v-model이 마지막 글자를 미처 동기화하지 못함.
  // 이 때 DOM의 실제 value를 강제로 끌어와서 동기화한 뒤 제출합니다.
  const target = e.target as HTMLTextAreaElement
  if (target) {
    newContent.value = target.value
  }
  submitComment()
}

async function submitComment() {
  if (!newContent.value.trim()) return
  submitting.value = true
  try {
    await apiClient.post(`/api/v1/tools/${props.moduleId}/comments`, {content: newContent.value})
    newContent.value = ''
    await loadComments()
  } catch {
    // 제출 실패 시 조용히 무시
  } finally {
    submitting.value = false
  }
}

async function confirmDeleteComment(id: number) {
  try {
    await apiClient.delete(`/api/v1/comments/${id}`)
    deletingId.value = null
    await loadComments()
  } catch (e) {
    console.error('Failed to delete comment', e)
    showFeedback('error', '댓글 삭제에 실패했습니다.')
  }
}

function openReport(id: number) {
  deletingId.value = null
  reportingId.value = id
  reportReason.value = 'SPAM'
  reportDetail.value = ''
}

function closeReport() {
  reportingId.value = null
}

async function submitReport(id: number) {
  if (reportReason.value === 'OTHER' && !reportDetail.value.trim()) return
  reportSubmitting.value = true
  try {
    await apiClient.post(`/api/v1/comments/${id}/report`, {
      reason: reportReason.value,
      detail: reportReason.value === 'OTHER' ? reportDetail.value : null,
    })
    showFeedback('success', '신고가 접수되었습니다.')
    closeReport()
  } catch (e: any) {
    if (e?.response?.status === 409) {
      showFeedback('error', '이미 신고한 댓글입니다.')
    } else {
      showFeedback('error', '신고 접수에 실패했습니다.')
    }
    console.error('Failed to report comment', e)
  } finally {
    reportSubmitting.value = false
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

onMounted(loadComments)
// 성공 배너의 자동 닫힘 타이머가 컴포넌트 언마운트 후(라우트 이동 등)에도 남아있지 않도록 정리한다.
onUnmounted(() => {
  if (feedbackTimer) clearTimeout(feedbackTimer)
})
</script>

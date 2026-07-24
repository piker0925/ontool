<template>
  <div class="mx-auto max-w-5xl px-6 py-8">
    <h1 class="mb-6 text-xl font-semibold text-foreground">관리자 페이지</h1>

    <!-- 로그인 폼 -->
    <div v-if="!authed" class="mx-auto max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 class="mb-4 text-sm font-medium text-foreground">관리자 로그인</h2>
      <form class="flex flex-col gap-3" @submit.prevent="login">
        <input
            v-model="username"
            class="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-ring"
            placeholder="사용자명"
            type="text"
            autocomplete="username"
        />
        <input
            v-model="password"
            class="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-ring"
            placeholder="비밀번호"
            type="password"
            autocomplete="current-password"
        />
        <p v-if="loginError" class="text-xs text-destructive">{{ loginError }}</p>
        <button
            type="submit"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          로그인
        </button>
      </form>
    </div>

    <!-- 대시보드 -->
    <div v-else>
      <!-- 탭 네비게이션 -->
      <div class="mb-6 border-b border-border">
        <nav class="-mb-px flex gap-6">
          <button
              v-for="tab in tabs"
              :key="tab.id"
              :class="currentTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'"
              class="border-b-2 px-1 pb-4 text-sm font-medium transition-colors"
              @click="switchTab(tab.id as TabId)"
          >
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <!-- 탭 내용 -->
      <div class="flex flex-col gap-6">
        
        <!-- 1. 통계 탭 -->
        <div v-if="currentTab === 'stats'">
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 class="text-sm font-medium text-foreground">모듈 통계</h2>
              <button class="text-xs text-muted-foreground hover:text-foreground" @click="loadStats">새로고침</button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                <tr class="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th class="px-5 py-3 font-medium">모듈 ID</th>
                  <th class="px-5 py-3 font-medium text-right">사용 횟수</th>
                  <th class="px-5 py-3 font-medium text-right">좋아요</th>
                  <th class="px-5 py-3 font-medium text-right">실패</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="stats.length === 0">
                  <td class="px-5 py-6 text-center text-muted-foreground" colspan="4">데이터 없음</td>
                </tr>
                <tr v-for="s in stats" :key="s.moduleId" class="border-b border-border last:border-0 hover:bg-muted/20">
                  <td class="px-5 py-3 font-mono text-xs text-foreground/80">{{ s.moduleId }}</td>
                  <td class="px-5 py-3 text-right text-foreground">{{ s.useCount.toLocaleString() }}</td>
                  <td class="px-5 py-3 text-right text-foreground">{{ s.likeCount.toLocaleString() }}</td>
                  <td class="px-5 py-3 text-right text-destructive">{{ s.failCount.toLocaleString() }}</td>
                </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <!-- 2. 유저 관리 탭 -->
        <div v-if="currentTab === 'users'">
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-4">
                  <h2 class="text-sm font-medium text-foreground">유저 목록</h2>
                  <span class="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{{ totalUsers }}명</span>
                </div>
                <p class="text-xs text-muted-foreground">
                  '재사용 감지 발동' 횟수는 참고용 빈도 지표입니다 — 멀티탭 동시 재발급 등 오탐이 섞일 수 있어 이 수치만으로 계정 탈취를 단정할 수 없습니다.
                </p>
              </div>
              <form class="flex w-full max-w-xs items-center gap-2 sm:w-auto" @submit.prevent="onSearch">
                <input
                  v-model="searchInput"
                  type="text"
                  placeholder="닉네임, 제공자 검색..."
                  class="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                />
                <button type="submit" class="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80">
                  검색
                </button>
              </form>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                <tr class="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th class="px-5 py-3 font-medium">ID</th>
                  <th class="px-5 py-3 font-medium">제공자</th>
                  <th class="px-5 py-3 font-medium">닉네임</th>
                  <th class="px-5 py-3 font-medium">이메일</th>
                  <th class="px-5 py-3 font-medium">가입일</th>
                  <th class="px-5 py-3 font-medium text-right" title="참고용 빈도 지표 — 오탐(멀티탭 동시 재발급)이 섞일 수 있어 탈취 확정으로 단정할 수 없습니다.">
                    재사용 감지 발동
                  </th>
                  <th class="px-5 py-3 font-medium text-right">액션</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="users.length === 0">
                  <td class="px-5 py-8 text-center text-muted-foreground" colspan="7">조회된 유저가 없습니다.</td>
                </tr>
                <tr v-for="u in users" :key="u.id" class="border-b border-border last:border-0 hover:bg-muted/20">
                  <td class="px-5 py-3 text-xs text-muted-foreground">{{ u.id }}</td>
                  <td class="px-5 py-3">
                    <span class="rounded-md bg-secondary/50 px-2 py-1 text-xs font-medium text-secondary-foreground">{{ u.provider }}</span>
                  </td>
                  <td class="px-5 py-3 text-foreground">{{ u.nickname }}</td>
                  <td class="px-5 py-3 text-muted-foreground">{{ u.email || '-' }}</td>
                  <td class="px-5 py-3 text-muted-foreground">{{ formatDate(u.createdAt) }}</td>
                  <td class="px-5 py-3 text-right">
                    <span
                      :class="u.theftEventCount > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-secondary/50 text-secondary-foreground'"
                      class="rounded-md px-2 py-1 text-xs font-medium"
                      title="참고용 빈도 지표 — 오탐(멀티탭 동시 재발급)이 섞일 수 있어 탈취 확정으로 단정할 수 없습니다."
                    >
                      {{ u.theftEventCount }}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-right">
                    <button
                      @click="forceLogoutUser(u.id, u.nickname)"
                      class="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      강제 로그아웃
                    </button>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
            
            <!-- 페이지네이션 -->
            <div class="flex items-center justify-between border-t border-border px-5 py-3" v-if="totalPages > 0">
              <button 
                :disabled="usersPage === 0" 
                @click="changePage(usersPage - 1)"
                class="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
              >
                이전
              </button>
              <span class="text-sm text-muted-foreground">{{ usersPage + 1 }} / {{ totalPages }}</span>
              <button 
                :disabled="usersPage >= totalPages - 1" 
                @click="changePage(usersPage + 1)"
                class="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </section>
        </div>

        <!-- 3. 운영 탭 -->
        <div v-if="currentTab === 'ops'" class="flex flex-col gap-6">
          
          <!-- 작업 큐(Jobs) 모니터링 -->
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 class="text-sm font-medium text-foreground">진행 중인 작업 (Jobs)</h2>
              <button class="text-xs text-muted-foreground hover:text-foreground" @click="loadOps">새로고침</button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                <tr class="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th class="px-5 py-3 font-medium">Job ID</th>
                  <th class="px-5 py-3 font-medium">모듈</th>
                  <th class="px-5 py-3 font-medium">레인(Lane)</th>
                  <th class="px-5 py-3 font-medium">상태</th>
                  <th class="px-5 py-3 font-medium">요청 시간</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="jobs.length === 0">
                  <td class="px-5 py-6 text-center text-muted-foreground" colspan="5">현재 대기/실행 중인 작업이 없습니다.</td>
                </tr>
                <tr v-for="j in jobs" :key="j.id" class="border-b border-border last:border-0 hover:bg-muted/20">
                  <td class="px-5 py-3 font-mono text-xs text-foreground/80">{{ j.id.split('-')[0] }}...</td>
                  <td class="px-5 py-3 text-foreground">{{ j.moduleId }}</td>
                  <td class="px-5 py-3">
                    <span :class="j.lane === 'VIDEO' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'" class="rounded px-2 py-1 text-xs font-medium">
                      {{ j.lane }}
                    </span>
                  </td>
                  <td class="px-5 py-3">
                    <span :class="j.status === 'RUNNING' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-600'" class="rounded px-2 py-1 text-xs font-medium">
                      {{ j.status }}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-muted-foreground">{{ formatDate(j.createdAt) }}</td>
                </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- 건의사항 -->
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="border-b border-border px-5 py-3">
              <h2 class="text-sm font-medium text-foreground">건의사항</h2>
            </div>
            <ul class="divide-y divide-border">
              <li v-if="suggestions.length === 0" class="px-5 py-6 text-center text-sm text-muted-foreground">건의사항 없음</li>
              <li v-for="s in suggestions" :key="s.id" class="px-5 py-4">
                <p class="text-sm text-foreground">{{ s.content }}</p>
                <p class="mt-1.5 text-xs text-muted-foreground">{{ formatDate(s.createdAt) }}</p>
              </li>
            </ul>
          </section>

          <!-- 최근 댓글 -->
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="border-b border-border px-5 py-3">
              <h2 class="text-sm font-medium text-foreground">댓글 관리</h2>
            </div>
            <ul class="divide-y divide-border">
              <li v-if="comments.length === 0" class="px-5 py-6 text-center text-sm text-muted-foreground">댓글 없음</li>
              <li v-for="c in comments" :key="c.id" class="flex items-start justify-between px-5 py-4 hover:bg-muted/10">
                <div>
                  <span class="mb-1 inline-block rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{{ c.moduleId }}</span>
                  <p class="text-sm text-foreground mt-1">{{ c.content }}</p>
                  <p class="mt-1.5 text-xs text-muted-foreground">{{ formatDate(c.createdAt) }}</p>
                </div>
                <button
                    class="ml-4 shrink-0 rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    @click="deleteComment(c.id)"
                >
                  삭제
                </button>
              </li>
            </ul>
          </section>

          <!-- 댓글 신고 - 유저별 누적 집계 (056 정지 판단용) -->
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 class="text-sm font-medium text-foreground">댓글 신고 - 유저별 누적</h2>
              <button class="text-xs text-muted-foreground hover:text-foreground" @click="loadReportUserAggregates">새로고침</button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                <tr class="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th class="px-5 py-3 font-medium">닉네임</th>
                  <th class="px-5 py-3 font-medium text-right">누적 신고</th>
                  <th class="px-5 py-3 font-medium">사유별 분포</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="reportUserAggregates.length === 0">
                  <td class="px-5 py-6 text-center text-muted-foreground" colspan="3">신고 누적 유저가 없습니다.</td>
                </tr>
                <tr v-for="agg in reportUserAggregates" :key="agg.userId" class="border-b border-border last:border-0 hover:bg-muted/20">
                  <td class="px-5 py-3 text-foreground">{{ agg.nickname }} <span class="text-xs text-muted-foreground">(ID:{{ agg.userId }})</span></td>
                  <td class="px-5 py-3 text-right font-medium text-destructive">{{ agg.totalCount }}</td>
                  <td class="px-5 py-3 text-xs text-muted-foreground">
                    <span v-for="(cnt, reason) in agg.reasonCounts" :key="reason" class="mr-2">{{ reason }}: {{ cnt }}</span>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- 댓글 신고 - 개별 목록 -->
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="flex flex-col gap-3 border-b border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 class="text-sm font-medium text-foreground">댓글 신고 목록</h2>
              <div class="flex items-center gap-2">
                <select v-model="reportStatusFilter" class="rounded-md border border-border bg-background px-2 py-1 text-xs" @change="loadCommentReports">
                  <option value="">전체 상태</option>
                  <option value="PENDING">대기중</option>
                  <option value="RESOLVED">확인완료</option>
                  <option value="DISMISSED">기각</option>
                </select>
                <select v-model="reportReasonFilter" class="rounded-md border border-border bg-background px-2 py-1 text-xs" @change="loadCommentReports">
                  <option value="">전체 사유</option>
                  <option v-for="opt in COMMENT_REPORT_REASONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <button class="text-xs text-muted-foreground hover:text-foreground" @click="loadCommentReports">새로고침</button>
              </div>
            </div>
            <ul class="divide-y divide-border">
              <li v-if="commentReports.length === 0" class="px-5 py-6 text-center text-sm text-muted-foreground">신고 내역 없음</li>
              <li v-for="r in commentReports" :key="r.id" class="px-5 py-4 hover:bg-muted/10">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="mb-1 flex items-center gap-2">
                      <span class="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{{ r.reason }}</span>
                      <span
                          :class="r.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-600' : r.status === 'RESOLVED' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'"
                          class="rounded px-2 py-0.5 text-xs font-medium"
                      >{{ r.status }}</span>
                    </div>
                    <p class="text-sm text-foreground">{{ r.commentContent }}</p>
                    <p class="mt-1 text-xs text-muted-foreground">
                      신고자: {{ r.reporterNickname || '알수없음' }} (ID:{{ r.reporterId }}) · {{ formatDate(r.createdAt) }}
                      <template v-if="r.detail"> · 상세: {{ r.detail }}</template>
                    </p>
                  </div>
                  <div class="flex shrink-0 gap-1">
                    <button
                        :disabled="r.status === 'RESOLVED'"
                        class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"
                        @click="updateReportStatus(r.id, 'RESOLVED')"
                    >확인완료</button>
                    <button
                        :disabled="r.status === 'DISMISSED'"
                        class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"
                        @click="updateReportStatus(r.id, 'DISMISSED')"
                    >기각</button>
                    <button
                        :disabled="r.status === 'RESOLVED'"
                        class="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-40"
                        title="이 댓글을 삭제하고 신고를 확인완료 처리합니다"
                        @click="deleteComment(r.commentId, r.id)"
                    >댓글 삭제</button>
                  </div>
                </div>
              </li>
            </ul>
          </section>

          <!-- 관리자 액션 감사로그 -->
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 class="text-sm font-medium text-foreground">관리자 액션 로그</h2>
              <button class="text-xs text-muted-foreground hover:text-foreground" @click="loadActionLogs">새로고침</button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                <tr class="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th class="px-5 py-3 font-medium">시각</th>
                  <th class="px-5 py-3 font-medium">액션</th>
                  <th class="px-5 py-3 font-medium">대상 ID</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="actionLogs.length === 0">
                  <td class="px-5 py-6 text-center text-muted-foreground" colspan="3">기록 없음</td>
                </tr>
                <tr v-for="log in actionLogs" :key="log.id" class="border-b border-border last:border-0 hover:bg-muted/20">
                  <td class="px-5 py-3 text-muted-foreground">{{ formatDate(log.performedAt) }}</td>
                  <td class="px-5 py-3">
                    <span class="rounded bg-secondary/50 px-2 py-1 text-xs font-medium text-secondary-foreground">{{ log.actionType }}</span>
                  </td>
                  <td class="px-5 py-3 font-mono text-xs text-foreground/80">{{ log.targetId }}</td>
                </tr>
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {apiClient} from '../api/client'
import {COMMENT_REPORT_REASONS} from '../constants/commentReportReasons'

const username = ref('')
const password = ref('')
const loginError = ref('')
const authed = ref(false)
let authHeader = sessionStorage.getItem('admin_auth') || ''

// --- 탭 상태 ---
type TabId = 'stats' | 'users' | 'ops'
const tabs = [
  {id: 'stats', name: '통계'},
  {id: 'users', name: '유저 관리'},
  {id: 'ops', name: '운영 (큐·피드백)'},
]

const route = useRoute()
const router = useRouter()

const initialTab = typeof route.query.tab === 'string' && tabs.some(t => t.id === route.query.tab)
    ? route.query.tab as TabId
    : 'stats'

const currentTab = ref<TabId>(initialTab)

// URL query 양방향 동기화(replace라 뒤로가기 이력을 쌓지 않음) — 새로고침해도 탭이 유지된다.
watch(currentTab, id => {
  if (route.query.tab === id) return
  router.replace({query: {...route.query, tab: id}})
})

watch(() => route.query.tab, q => {
  if (typeof q === 'string' && q !== currentTab.value && tabs.some(t => t.id === q)) currentTab.value = q as TabId
})

// --- 타입 정의 ---
interface StatItem {
  moduleId: string
  useCount: number
  likeCount: number
  failCount: number
}

interface UserItem {
  id: number
  provider: string
  nickname: string
  email: string
  createdAt: string
  theftEventCount: number
}

interface JobItem {
  id: string
  moduleId: string
  lane: string
  status: string
  createdAt: string
}

interface SuggestionItem {
  id: number
  content: string
  createdAt: string
}

interface CommentItem {
  id: number
  moduleId: string
  content: string
  createdAt: string
}

interface ActionLogItem {
  id: number
  actionType: string
  targetId: number
  performedAt: string
}

interface CommentReportItem {
  id: number
  commentId: number
  commentContent: string
  reason: string
  detail: string | null
  status: string
  reporterId: number
  reporterNickname: string | null
  createdAt: string
}

interface CommentReportUserAggregateItem {
  userId: number
  nickname: string
  totalCount: number
  reasonCounts: Record<string, number>
}

// --- 상태 변수 ---
const stats = ref<StatItem[]>([])

const users = ref<UserItem[]>([])
const searchQuery = ref('')
const searchInput = ref('')
const usersPage = ref(0)
const totalPages = ref(0)
const totalUsers = ref(0)

const jobs = ref<JobItem[]>([])
const suggestions = ref<SuggestionItem[]>([])
const comments = ref<CommentItem[]>([])
const actionLogs = ref<ActionLogItem[]>([])

const commentReports = ref<CommentReportItem[]>([])
const reportStatusFilter = ref('')
const reportReasonFilter = ref('')
const reportUserAggregates = ref<CommentReportUserAggregateItem[]>([])

// --- 인증 ---
async function login() {
  loginError.value = ''
  authHeader = 'Basic ' + btoa(`${username.value}:${password.value}`)
  try {
    await apiClient.get('/admin/stats', {headers: {Authorization: authHeader}})
    sessionStorage.setItem('admin_auth', authHeader)
    authed.value = true
    switchTab(currentTab.value)
  } catch {
    loginError.value = '인증 실패. 사용자명과 비밀번호를 확인하세요.'
  }
}

// --- 탭 전환 및 데이터 로드 ---
function switchTab(tab: TabId) {
  currentTab.value = tab
  if (tab === 'stats' && stats.value.length === 0) loadStats()
  if (tab === 'users' && users.value.length === 0) loadUsers()
  if (tab === 'ops' && jobs.value.length === 0) loadOps()
}

async function loadStats() {
  try {
    const res = await apiClient.get<StatItem[]>('/admin/stats', {headers: {Authorization: authHeader}})
    stats.value = res.data
  } catch (e) {
    console.error('Failed to load stats', e)
  }
}

async function loadUsers() {
  try {
    const q = encodeURIComponent(searchQuery.value)
    const p = usersPage.value
    const res = await apiClient.get(`/admin/users?search=${q}&page=${p}&size=20`, {headers: {Authorization: authHeader}})
    users.value = res.data.content
    totalPages.value = res.data.totalPages
    totalUsers.value = res.data.totalElements
  } catch (e) {
    console.error('Failed to load users', e)
  }
}

function onSearch() {
  searchQuery.value = searchInput.value
  usersPage.value = 0
  loadUsers()
}

function changePage(newPage: number) {
  usersPage.value = newPage
  loadUsers()
}

async function forceLogoutUser(id: number, nickname: string) {
  if (!confirm(`'${nickname}'(ID:${id}) 유저를 정말 강제 로그아웃 하시겠습니까?\n이 작업은 즉시 모든 기기에서 토큰을 만료시킵니다.`)) return
  
  try {
    await apiClient.post(`/admin/users/${id}/force-logout`, {}, {headers: {Authorization: authHeader}})
    alert('성공적으로 강제 로그아웃 되었습니다.')
  } catch (e) {
    alert('로그아웃 처리에 실패했습니다.')
    console.error(e)
  }
}

async function loadOps() {
  const headers = {Authorization: authHeader}
  try {
    const [jobsRes, sugRes, comRes, logRes] = await Promise.allSettled([
      apiClient.get<JobItem[]>('/admin/jobs?status=PENDING,RUNNING', {headers}),
      apiClient.get<SuggestionItem[]>('/admin/suggestions', {headers}),
      apiClient.get<CommentItem[]>('/admin/comments', {headers}),
      apiClient.get('/admin/action-logs', {headers}),
    ])
    if (jobsRes.status === 'fulfilled') jobs.value = jobsRes.value.data
    if (sugRes.status === 'fulfilled') suggestions.value = sugRes.value.data
    if (comRes.status === 'fulfilled') comments.value = comRes.value.data
    if (logRes.status === 'fulfilled') actionLogs.value = logRes.value.data.content
  } catch (e) {
    console.error('Failed to load ops data', e)
  }
  await Promise.allSettled([loadCommentReports(), loadReportUserAggregates()])
}

// --- 댓글 신고(099) ---
async function loadCommentReports() {
  try {
    const params = new URLSearchParams()
    if (reportStatusFilter.value) params.set('status', reportStatusFilter.value)
    if (reportReasonFilter.value) params.set('reason', reportReasonFilter.value)
    const res = await apiClient.get(`/admin/comment-reports?${params.toString()}`, {headers: {Authorization: authHeader}})
    commentReports.value = res.data.content
  } catch (e) {
    console.error('Failed to load comment reports', e)
  }
}

async function loadReportUserAggregates() {
  try {
    const res = await apiClient.get<CommentReportUserAggregateItem[]>('/admin/comment-reports/users', {headers: {Authorization: authHeader}})
    reportUserAggregates.value = res.data
  } catch (e) {
    console.error('Failed to load comment report user aggregates', e)
  }
}

async function updateReportStatus(id: number, status: string) {
  try {
    await apiClient.patch(`/admin/comment-reports/${id}/status`, {status}, {headers: {Authorization: authHeader}})
    await Promise.allSettled([loadCommentReports(), loadReportUserAggregates()])
  } catch (e) {
    alert('상태 변경에 실패했습니다.')
    console.error('Failed to update comment report status', e)
  }
}

async function loadActionLogs() {
  try {
    const res = await apiClient.get('/admin/action-logs', {headers: {Authorization: authHeader}})
    actionLogs.value = res.data.content
  } catch (e) {
    console.error('Failed to load action logs', e)
  }
}

// resolveReportId를 넘기면(댓글 신고 목록에서 호출), 삭제 성공 시 그 신고를 RESOLVED로 자동 전환한다 —
// 관리자가 삭제 후 별도로 확인완료를 또 누를 필요가 없다. 삭제 실패 시에는 상태를 건드리지 않는다.
async function deleteComment(id: number, resolveReportId?: number) {
  if (!confirm('정말 삭제하시겠습니까?')) return
  try {
    await apiClient.delete(`/admin/comments/${id}`, {headers: {Authorization: authHeader}})
    comments.value = comments.value.filter(c => c.id !== id)
  } catch {
    alert('삭제 실패')
    return
  }

  if (resolveReportId != null) {
    try {
      await apiClient.patch(`/admin/comment-reports/${resolveReportId}/status`, {status: 'RESOLVED'}, {headers: {Authorization: authHeader}})
    } catch (e) {
      console.error('Failed to auto-resolve report status after comment delete', e)
      // 댓글 삭제 자체는 이미 성공했으니 "삭제 실패"로 오인하지 않도록 별도 메시지로 알린다.
      alert('댓글은 삭제됐으나 신고 상태 자동 처리에 실패했습니다 — 목록에서 직접 확인완료 처리해 주세요.')
    }
    await Promise.allSettled([loadCommentReports(), loadReportUserAggregates()])
  }
}

function formatDate(dt: string): string {
  if (!dt) return ''
  const date = new Date(dt)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 컴포넌트 마운트 시 세션 스토리지에 인증 정보가 있으면 자동 로그인 시도
if (authHeader) {
  apiClient.get('/admin/stats', {headers: {Authorization: authHeader}})
      .then(() => {
        authed.value = true
        switchTab(currentTab.value)
      })
      .catch(() => {
        // 토큰이 유효하지 않으면 삭제
        sessionStorage.removeItem('admin_auth')
        authHeader = ''
      })
}
</script>

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
              <div class="flex items-center gap-4">
                <h2 class="text-sm font-medium text-foreground">유저 목록</h2>
                <span class="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{{ totalUsers }}명</span>
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
                  <th class="px-5 py-3 font-medium text-right">액션</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="users.length === 0">
                  <td class="px-5 py-8 text-center text-muted-foreground" colspan="6">조회된 유저가 없습니다.</td>
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
import {ref} from 'vue'
import {apiClient} from '../api/client'

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
const currentTab = ref<TabId>('stats')

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

// --- 인증 ---
async function login() {
  loginError.value = ''
  authHeader = 'Basic ' + btoa(`${username.value}:${password.value}`)
  try {
    await apiClient.get('/admin/stats', {headers: {Authorization: authHeader}})
    sessionStorage.setItem('admin_auth', authHeader)
    authed.value = true
    loadStats()
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
}

async function loadActionLogs() {
  try {
    const res = await apiClient.get('/admin/action-logs', {headers: {Authorization: authHeader}})
    actionLogs.value = res.data.content
  } catch (e) {
    console.error('Failed to load action logs', e)
  }
}

async function deleteComment(id: number) {
  if (!confirm('정말 삭제하시겠습니까?')) return
  try {
    await apiClient.delete(`/admin/comments/${id}`, {headers: {Authorization: authHeader}})
    comments.value = comments.value.filter(c => c.id !== id)
  } catch {
    alert('삭제 실패')
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
        loadStats()
      })
      .catch(() => {
        // 토큰이 유효하지 않으면 삭제
        sessionStorage.removeItem('admin_auth')
        authHeader = ''
      })
}
</script>

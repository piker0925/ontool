<template>
  <div class="mx-auto max-w-4xl px-6 py-8">
    <h1 class="mb-6 text-xl font-semibold text-slate-800">관리자 페이지</h1>

    <!-- 로그인 폼 -->
    <div v-if="!authed" class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="mb-4 text-sm font-medium text-slate-700">관리자 로그인</h2>
      <form class="flex flex-col gap-3" @submit.prevent="login">
        <input
            v-model="username"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            placeholder="사용자명"
            type="text"
            autocomplete="username"
        />
        <input
            v-model="password"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            placeholder="비밀번호"
            type="password"
            autocomplete="current-password"
        />
        <p v-if="loginError" class="text-xs text-red-500">{{ loginError }}</p>
        <button
            type="submit"
            class="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          로그인
        </button>
      </form>
    </div>

    <!-- 대시보드 -->
    <div v-else class="flex flex-col gap-6">

      <!-- 모듈 통계 -->
      <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 class="text-sm font-medium text-slate-700">모듈 통계</h2>
          <button class="text-xs text-slate-400 hover:text-slate-600" @click="loadAll">새로고침</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
            <tr class="border-b border-slate-100 text-left text-xs text-slate-400">
              <th class="px-5 py-2 font-medium">모듈 ID</th>
              <th class="px-5 py-2 font-medium">사용 횟수</th>
              <th class="px-5 py-2 font-medium">좋아요</th>
            </tr>
            </thead>
            <tbody>
            <tr v-if="stats.length === 0">
              <td class="px-5 py-4 text-slate-400" colspan="3">데이터 없음</td>
            </tr>
            <tr v-for="s in stats" :key="s.moduleId" class="border-b border-slate-50 last:border-0">
              <td class="px-5 py-2.5 font-mono text-xs text-slate-600">{{ s.moduleId }}</td>
              <td class="px-5 py-2.5 text-slate-800">{{ s.useCount }}</td>
              <td class="px-5 py-2.5 text-slate-800">{{ s.likeCount }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 건의사항 -->
      <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-5 py-3">
          <h2 class="text-sm font-medium text-slate-700">건의사항</h2>
        </div>
        <ul class="divide-y divide-slate-50">
          <li v-if="suggestions.length === 0" class="px-5 py-4 text-sm text-slate-400">건의사항 없음</li>
          <li v-for="s in suggestions" :key="s.id" class="px-5 py-3">
            <p class="text-sm text-slate-700">{{ s.content }}</p>
            <p class="mt-0.5 text-xs text-slate-400">{{ formatDate(s.createdAt) }}</p>
          </li>
        </ul>
      </section>

      <!-- 최근 댓글 -->
      <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-100 px-5 py-3">
          <h2 class="text-sm font-medium text-slate-700">댓글 관리</h2>
        </div>
        <ul class="divide-y divide-slate-50">
          <li v-if="comments.length === 0" class="px-5 py-4 text-sm text-slate-400">댓글 없음</li>
          <li v-for="c in comments" :key="c.id" class="flex items-start justify-between px-5 py-3">
            <div>
              <p class="text-xs text-slate-400">{{ c.moduleId }}</p>
              <p class="text-sm text-slate-700">{{ c.content }}</p>
            </div>
            <button
                class="ml-4 shrink-0 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                @click="deleteComment(c.id)"
            >
              삭제
            </button>
          </li>
        </ul>
      </section>
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
let authHeader = ''

interface StatItem {
  moduleId: string
  useCount: number
  likeCount: number
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

const stats = ref<StatItem[]>([])
const suggestions = ref<SuggestionItem[]>([])
const comments = ref<CommentItem[]>([])

async function login() {
  loginError.value = ''
  authHeader = 'Basic ' + btoa(`${username.value}:${password.value}`)
  try {
    await apiClient.get('/admin/stats', {headers: {Authorization: authHeader}})
    authed.value = true
    loadAll()
  } catch {
    loginError.value = '인증 실패. 사용자명과 비밀번호를 확인하세요.'
  }
}

async function loadAll() {
  const headers = {Authorization: authHeader}
  const [statsRes, suggestionsRes] = await Promise.allSettled([
    apiClient.get<StatItem[]>('/admin/stats', {headers}),
    apiClient.get<SuggestionItem[]>('/admin/suggestions', {headers}),
  ])
  if (statsRes.status === 'fulfilled') stats.value = statsRes.value.data
  if (suggestionsRes.status === 'fulfilled') suggestions.value = suggestionsRes.value.data
}

async function deleteComment(id: number) {
  try {
    await apiClient.delete(`/admin/comments/${id}`, {headers: {Authorization: authHeader}})
    comments.value = comments.value.filter(c => c.id !== id)
  } catch {
    // 무시
  }
}

function formatDate(dt: string): string {
  if (!dt) return ''
  return new Date(dt).toLocaleString('ko-KR')
}
</script>

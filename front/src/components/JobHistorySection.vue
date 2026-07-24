<template>
  <Card class="mt-8 border shadow-sm">
    <CardHeader>
      <CardTitle class="text-xl">작업 이력</CardTitle>
    </CardHeader>
    <CardContent>
      <div v-if="loading" class="py-6 text-center text-sm text-muted-foreground">
        불러오는 중…
      </div>
      <div v-else-if="jobs.length === 0" class="py-6 text-center text-sm text-muted-foreground">
        최근 작업 이력이 없습니다.
      </div>
      <div v-else class="space-y-4">
        <div v-for="job in jobs" :key="job.id" class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card">
          <div class="space-y-1 mb-3 sm:mb-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-foreground">{{ getModuleName(job.moduleId) }}</span>
              <Badge :variant="getStatusVariant(job.status)" class="text-[10px] h-5 px-1.5">
                {{ job.status }}
              </Badge>
            </div>
            <div class="text-xs text-muted-foreground">
              {{ formatDate(job.createdAt) }} · ID: {{ job.id.split('-')[0] }}...
            </div>
          </div>
          <div>
            <div v-if="job.status === 'DONE'">
              <Button v-if="!job.expired && job.downloadUrl" size="sm" variant="outline" as-child>
                <a :href="job.downloadUrl" target="_blank" rel="noopener noreferrer">결과 다운로드</a>
              </Button>
              <span v-else-if="job.expired" class="text-xs text-muted-foreground italic">
                결과 보관 기간 만료
              </span>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
          <Button 
            variant="outline" 
            size="sm" 
            :disabled="currentPage === 0"
            @click="loadPage(currentPage - 1)"
          >
            이전
          </Button>
          <span class="text-sm text-muted-foreground">{{ currentPage + 1 }} / {{ totalPages }}</span>
          <Button 
            variant="outline" 
            size="sm" 
            :disabled="currentPage >= totalPages - 1"
            @click="loadPage(currentPage + 1)"
          >
            다음
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { apiClient } from '../api/client'
import { normalizeApiModules } from '../api/modules'
import { MOCK_MODULES } from '../api/mock'

interface JobHistory {
  id: string
  moduleId: string
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'
  createdAt: string
  expired: boolean
  downloadUrl: string | null
}

interface PageResponse {
  content: JobHistory[]
  totalElements: number
  totalPages: number
  page: number
}

const jobs = ref<JobHistory[]>([])
const loading = ref(true)
const currentPage = ref(0)
const totalPages = ref(0)

const modules = normalizeApiModules(MOCK_MODULES)

function getModuleName(id: string) {
  return modules.find(m => m.id === id)?.name || id
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'DONE': return 'default'
    case 'FAILED': return 'destructive'
    case 'RUNNING': return 'secondary'
    default: return 'outline'
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

async function loadPage(page: number) {
  loading.value = true
  try {
    const { data } = await apiClient.get<PageResponse>(`/api/v1/users/me/jobs?page=${page}&size=5`)
    jobs.value = data.content
    currentPage.value = data.page
    totalPages.value = data.totalPages
  } catch (e) {
    console.error('Failed to load job history', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadPage(0))
</script>

<template>
  <div class="border-t border-white/60 dark:border-white/10 px-2 pb-2 pt-3" data-testid="active-jobs-panel">
    <div class="flex items-center justify-between px-2 pb-1.5">
      <span class="text-[10px] font-bold tracking-wider text-muted-foreground">내 작업</span>
      <span v-if="jobs.length > 0" class="font-mono text-[10px] text-muted-foreground">{{ jobs.length }}</span>
    </div>

    <div v-if="jobs.length === 0" class="mx-2 rounded-md border border-dashed border-sidebar-border bg-sidebar-accent/30 px-3 py-2.5">
      <p class="text-[11px] leading-tight text-muted-foreground">진행 중인 백그라운드 작업이 없습니다.</p>
    </div>

    <template v-else>
      <!-- 164: 다른 페이지로 이동해도 추적이 끊기지 않는다는 사실이 유일한 발견 지점이라, 토스트 같은
           일시적 알림이 아니라 작업이 있는 동안 항상 보이는 안내 문구로 둔다. -->
      <p class="px-2 pb-1.5 text-[10px] leading-tight text-muted-foreground/80">
        다른 페이지로 이동해도 진행 상황이 유지됩니다.
      </p>

      <ul class="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
        <li
            v-for="job in jobs"
            :key="job.jobId"
            class="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent"
            data-testid="active-job-item"
        >
          <component :is="statusIcon(job.status)" :class="statusIconClass(job.status)" class="size-3.5 shrink-0"/>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[12px] font-medium text-sidebar-foreground">{{ job.moduleName }}</p>
            <p class="truncate text-[10px] text-muted-foreground">
              {{ statusLabel(job) }}
              <span v-if="expiryHint(job)"> · {{ expiryHint(job) }}</span>
            </p>
          </div>
          <a
              v-if="canDownload(job)"
              :href="job.downloadUrl!"
              aria-label="결과 다운로드"
              class="shrink-0 touch-manipulation text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              data-testid="active-job-download"
              download
              title="결과 다운로드"
          >
            <Download class="size-3.5"/>
          </a>
          <button
              v-if="job.status === 'DONE' || job.status === 'FAILED'"
              aria-label="목록에서 지우기"
              class="shrink-0 touch-manipulation text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              data-testid="active-job-dismiss"
              title="목록에서 지우기"
              @click="dismiss(job.jobId)"
          >
            <X class="size-3.5"/>
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {CheckCircle2, Clock, Download, Loader2, X, XCircle} from 'lucide-vue-next'
import {useActiveJobs, type ActiveJob} from '../composables/useActiveJobs'

const {jobs, dismiss} = useActiveJobs()

/** 만료 정보는 DONE 시점에 한 번 스냅샷된 expiresAt과 현재 시각을 비교해 판단한다 —
 * 실시간 카운트다운은 요구되지 않으므로 타이머 없이 렌더링 시점 기준으로만 계산한다. */
function remainingMs(job: ActiveJob): number | null {
  if (!job.expiresAt) return null
  return new Date(job.expiresAt).getTime() - Date.now()
}

function isExpired(job: ActiveJob): boolean {
  const remaining = remainingMs(job)
  return remaining !== null && remaining <= 0
}

function canDownload(job: ActiveJob): boolean {
  return job.status === 'DONE' && !!job.downloadUrl && !isExpired(job)
}

function expiryHint(job: ActiveJob): string | null {
  if (!canDownload(job)) return null
  const remaining = remainingMs(job)
  if (remaining === null) return null
  const minutes = Math.max(1, Math.round(remaining / 60000))
  return `만료까지 ${minutes}분`
}

function statusIcon(status: ActiveJob['status']) {
  if (status === 'DONE') return CheckCircle2
  if (status === 'FAILED') return XCircle
  if (status === 'PENDING') return Clock
  return Loader2
}

function statusIconClass(status: ActiveJob['status']) {
  if (status === 'DONE') return 'text-emerald-500'
  if (status === 'FAILED') return 'text-destructive'
  if (status === 'RUNNING') return 'animate-spin text-primary/70'
  return 'text-muted-foreground/50'
}

function statusLabel(job: ActiveJob) {
  if (job.status === 'DONE') return '완료'
  if (job.status === 'FAILED') return '실패'
  if (job.status === 'PENDING') return '대기 중'
  if (job.queuePosition > 0) return `대기열 ${job.queuePosition}번째`
  if (job.progress > 0) return `처리 중 · ${job.progress}%`
  return '처리 중'
}
</script>

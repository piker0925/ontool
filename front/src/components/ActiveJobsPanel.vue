<template>
  <div class="border-t border-white/60 dark:border-white/10 px-2 pb-2 pt-3" data-testid="active-jobs-panel">
    <div class="flex items-center justify-between px-2 pb-1.5">
      <span class="text-[10px] font-bold tracking-wider text-muted-foreground/60">내 작업</span>
      <span v-if="jobs.length > 0" class="font-mono text-[10px] text-muted-foreground/60">{{ jobs.length }}</span>
    </div>

    <div v-if="jobs.length === 0" class="mx-2 rounded-md border border-dashed border-sidebar-border bg-sidebar-accent/30 px-3 py-2.5">
      <p class="text-[11px] leading-tight text-muted-foreground/60">진행 중인 백그라운드 작업이 없습니다.</p>
    </div>

    <ul v-else class="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
      <li
          v-for="job in jobs"
          :key="job.jobId"
          class="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent"
          data-testid="active-job-item"
      >
        <component :is="statusIcon(job.status)" :class="statusIconClass(job.status)" class="size-3.5 shrink-0"/>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[12px] font-medium text-sidebar-foreground">{{ job.moduleName }}</p>
          <p class="truncate text-[10px] text-muted-foreground/70">{{ statusLabel(job) }}</p>
        </div>
        <button
            v-if="job.status === 'DONE' || job.status === 'FAILED'"
            class="shrink-0 text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            data-testid="active-job-dismiss"
            title="목록에서 지우기"
            @click="dismiss(job.jobId)"
        >
          <X class="size-3.5"/>
        </button>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import {CheckCircle2, Clock, Loader2, X, XCircle} from 'lucide-vue-next'
import {useActiveJobs, type ActiveJob} from '../composables/useActiveJobs'

const {jobs, dismiss} = useActiveJobs()

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

<template>
  <slot/>
</template>

<script lang="ts" setup>
import {onMounted, onUnmounted} from 'vue'
import {apiClient} from '../api/client'
import type {BatchProgress} from '../types'

const props = defineProps<{ batchId: string; intervalMs?: number }>()
const emit = defineEmits<{
  progress: [progress: BatchProgress]
  done: [progress: BatchProgress]
}>()

let timerId: ReturnType<typeof setTimeout> | null = null
// 언마운트 시점에 이미 요청이 in-flight면 setTimeout 취소만으론 막을 수 없다 —
// 응답이 돌아왔을 때 이 플래그로 이어지는 처리를 끊는다.
let cancelled = false

function isComplete(p: BatchProgress): boolean {
  // total이 0이면 아직 job이 잡히지 않은 상태 — 완료로 오판하지 않는다.
  return p.totalCount > 0 && p.doneCount + p.failCount >= p.totalCount
}

async function poll() {
  let data: BatchProgress
  try {
    ;({data} = await apiClient.get<BatchProgress>(`/api/v1/batches/${props.batchId}`))
  } catch (e) {
    if (cancelled) return
    throw e
  }
  if (cancelled) return
  if (isComplete(data)) {
    emit('done', data)
    return
  }
  emit('progress', data)
  timerId = setTimeout(poll, props.intervalMs ?? 2000)
}

onMounted(poll)
onUnmounted(() => {
  cancelled = true
  if (timerId) clearTimeout(timerId)
})
</script>

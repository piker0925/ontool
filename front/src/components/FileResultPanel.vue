<template>
  <div class="flex h-full flex-col">
    <!-- 미리보기 영역: 패널을 채우고, 커도 넘치면 스크롤. 액션 바 위치와 독립. -->
    <div class="flex flex-1 items-center justify-center overflow-auto p-6">
      <img
          v-if="kind === 'image'"
          :src="url!"
          alt="처리 결과 미리보기"
          class="max-h-full max-w-full rounded-md border border-border object-contain"
      />
      <PdfThumbnail v-else-if="kind === 'pdf'" :url="url!" @pages="pages = $event"/>
      <p v-else class="text-[13px] text-muted-foreground">미리보기가 없는 형식입니다</p>
    </div>

    <!-- 파일 결과에 동반되는 advisory(예: 업스케일 경고) -->
    <p v-if="advisory" class="px-4 pb-1 text-[12px] text-amber-600 dark:text-amber-400">{{ advisory }}</p>

    <!-- 하단 고정 액션 바: 미리보기 크기와 무관하게 항상 같은 위치. 초기화는 좌측 업로드 패널의 ✕. -->
    <div class="flex items-center gap-3 border-t border-border px-4 py-3">
      <span v-if="pages > 1" class="text-[12px] text-muted-foreground">총 {{ pages }}페이지</span>
      <Button v-if="url && kind === 'pdf'" as-child variant="outline">
        <a :href="url" rel="noopener noreferrer" target="_blank">↗ 새 탭에서 열기</a>
      </Button>
      <Button v-if="url" as-child>
        <a :href="url" download>⬇ 다운로드</a>
      </Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {Button} from '@/components/ui/button'
import PdfThumbnail from './PdfThumbnail.vue'
import {previewKind} from '../utils/previewKind'

const props = defineProps<{ url: string | null; advisory: string | null }>()

const kind = computed(() => previewKind(props.url))
// PDF 페이지 수는 PdfThumbnail이 로드 후 emit → 액션 바에서 표시.
// 결과(url)가 바뀌면 초기화한다 — 인스턴스가 재사용될 때 이전 PDF의 페이지 수가
// 비-PDF 결과에 잔존해 "총 N페이지"가 잘못 뜨지 않도록.
const pages = ref(0)
watch(() => props.url, () => { pages.value = 0 })
</script>

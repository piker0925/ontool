<template>
  <div class="flex flex-col gap-4">
    <!-- 탭 -->
    <div class="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
      <button
          v-for="t in TABS"
          :key="t.id"
          :class="tab === t.id
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
          class="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors sm:flex-1"
          @click="tab = t.id"
      >{{ t.label }}
      </button>
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-[11px] font-medium text-muted-foreground">텍스트</label>
      <textarea
          v-model="input"
          class="min-h-32 resize-y rounded-xl border border-border bg-card p-4 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-ring"
          placeholder="분석할 텍스트를 입력하세요..."
      />
    </div>

    <div v-if="frequencies.length === 0" class="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p class="text-[12px] text-muted-foreground">텍스트를 입력하면 빈도 분석 결과가 나타납니다</p>
    </div>

    <template v-else-if="tab === 'table'">
      <div class="overflow-hidden rounded-xl border border-border">
        <table class="w-full text-[13px]">
          <thead class="bg-muted/40 text-[11px] text-muted-foreground">
          <tr>
            <th class="px-4 py-2 text-left font-medium">순위</th>
            <th class="px-4 py-2 text-left font-medium">단어</th>
            <th class="px-4 py-2 text-right font-medium">빈도</th>
          </tr>
          </thead>
          <tbody class="divide-y divide-border">
          <tr v-for="(f, i) in frequencies" :key="f.word">
            <td class="px-4 py-2 text-muted-foreground">{{ i + 1 }}</td>
            <td class="px-4 py-2 text-foreground">{{ f.word }}</td>
            <td class="px-4 py-2 text-right font-mono text-foreground">{{ f.count }}</td>
          </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else>
      <svg :viewBox="`0 0 ${cloudWidth} ${cloudHeight}`" class="w-full rounded-xl border border-border bg-card"
           :style="{ height: `${cloudHeight}px` }">
        <text v-for="item in wordcloudItems" :key="item.word"
              :x="item.x" :y="item.y" :font-size="item.fontSize"
              :class="COLOR_TIER_CLASS[item.colorTier]"
              class="font-semibold" text-anchor="middle" dominant-baseline="middle">
          {{ item.word }}
        </text>
      </svg>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {computeWordFrequency} from '../utils/textFrequency'
import {layoutWordcloud, type WordcloudColorTier} from '../utils/wordcloudLayout'

// 빈도 등급별 색상 — 겹치는 단어끼리도 등급 차이로 구분되도록 진하기를 달리한다 (테마 토큰만 사용).
const COLOR_TIER_CLASS: Record<WordcloudColorTier, string> = {
  high: 'fill-primary',
  mid: 'fill-foreground',
  low: 'fill-muted-foreground',
}

type TabId = 'cloud' | 'table'

const TABS: Array<{ id: TabId; label: string }> = [
  {id: 'cloud', label: '워드클라우드'},
  {id: 'table', label: '텍스트 빈도표'},
]

const route = useRoute()
const router = useRouter()

const initialTab = typeof route.query.tab === 'string' && TABS.some(t => t.id === route.query.tab)
    ? route.query.tab as TabId
    : 'cloud'

const tab = ref<TabId>(initialTab)
const input = ref('')

// URL query 양방향 동기화 (replace라 뒤로가기 이력을 오염시키지 않음)
watch(tab, id => {
  if (route.query.tab === id) return
  router.replace({query: {...route.query, tab: id}})
})

watch(() => route.query.tab, q => {
  if (typeof q === 'string' && q !== tab.value && TABS.some(t => t.id === q)) tab.value = q as TabId
})

// 두 탭이 같은 계산 결과를 공유한다 — 빈도 계산은 여기서 한 번만 실행된다.
const frequencies = computed(() => input.value ? computeWordFrequency(input.value) : [])

const cloudWidth = 700
const cloudHeight = 420
const wordcloudItems = computed(() => layoutWordcloud(frequencies.value, cloudWidth, cloudHeight))
</script>

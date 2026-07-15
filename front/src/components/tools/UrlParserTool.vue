<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <div class="flex flex-col gap-1.5">
      <label class="text-[11px] font-medium text-muted-foreground">URL</label>
      <input v-model="urlInput"
             class="rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-ring"
             placeholder="https://user@example.com:8080/path?q=1#frag"
             spellcheck="false"
             type="text"/>
    </div>

    <div v-if="parts" class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div v-for="row in rows" :key="row.label" class="flex items-center justify-between gap-3">
        <span class="text-[11px] text-muted-foreground shrink-0">{{ row.label }}</span>
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-mono text-[13px] text-foreground truncate">{{ row.value }}</span>
          <button class="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground shrink-0"
                  @click="copyText(row.value)">
            <Copy class="size-3"/>
          </button>
        </div>
      </div>
    </div>

    <div v-if="parts && parts.query.length" class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <span class="text-[11px] font-medium text-muted-foreground">쿼리 파라미터</span>
      <div v-for="(q, i) in parts.query" :key="i" class="flex items-center justify-between gap-3">
        <span class="font-mono text-[12px] text-muted-foreground shrink-0 truncate">{{ q.key }}</span>
        <span class="font-mono text-[13px] text-foreground truncate">{{ q.value }}</span>
      </div>
    </div>

    <p v-if="error" class="text-[11px] text-destructive/70">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {Copy} from 'lucide-vue-next'
import {parseUrl, type UrlParts} from '../../utils/urlParser'

const urlInput = ref('https://user:pw@example.com:8080/docs/api?page=1&q=검색#section')

const parts = computed<UrlParts | null>(() => {
  if (!urlInput.value.trim()) return null
  try {
    return parseUrl(urlInput.value)
  } catch {
    return null
  }
})

const error = computed(() => {
  if (!urlInput.value.trim()) return ''
  try {
    parseUrl(urlInput.value)
    return ''
  } catch (e) {
    return e instanceof Error ? e.message : '올바른 URL을 입력하세요.'
  }
})

const rows = computed(() => {
  const p = parts.value
  if (!p) return []
  const r: Array<{ label: string; value: string }> = [{label: '스킴', value: p.scheme}]
  if (p.username) r.push({label: '사용자명', value: p.username})
  if (p.password) r.push({label: '비밀번호', value: p.password})
  r.push({label: '호스트', value: p.host})
  r.push({label: '포트', value: p.port})
  r.push({label: '경로', value: p.path})
  r.push({label: '프래그먼트', value: p.fragment})
  return r
})

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
}
</script>

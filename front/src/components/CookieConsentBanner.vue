<template>
  <div
      v-if="visible"
      class="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-3 border-t border-white/60 dark:border-white/10 bg-white/90 dark:bg-[#0a0a0a]/95 backdrop-blur-[30px] px-4 py-3 shadow-[0_-4px_24px_rgb(0,0,0,0.06)] sm:flex-row sm:items-center sm:justify-between"
  >
    <p class="text-[13px] text-muted-foreground">
      OnTool은 서비스 개선을 위해 Google Analytics 쿠키를 사용하고 있습니다. 원치 않으면 거부해도 이용엔 지장 없어요.
      (<router-link to="/privacy" class="underline underline-offset-2 hover:text-foreground">자세히 보기</router-link>)
    </p>
    <div class="flex shrink-0 gap-2">
      <button
          data-testid="consent-decline"
          class="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
          @click="decline"
      >거부</button>
      <button
          data-testid="consent-accept"
          class="rounded-lg bg-zone-accent px-3 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 dark:text-background"
          @click="accept"
      >확인</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {getConsent, setConsent} from '../config/consent'
import {disableAnalytics, initAnalytics, isAnalyticsConfigured} from '../config/analytics'

const visible = ref(isAnalyticsConfigured() && getConsent() === null)

function accept() {
  setConsent('granted')
  initAnalytics()
  visible.value = false
}

function decline() {
  setConsent('denied')
  disableAnalytics()
  visible.value = false
}
</script>

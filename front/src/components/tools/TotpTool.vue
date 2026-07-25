<template>
  <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <label class="text-[11px] font-medium text-muted-foreground">시크릿 키 (Base32)</label>
        <span class="text-[10px] text-muted-foreground">서버로 전송되지 않고 브라우저에서만 계산됩니다</span>
      </div>
      <input
          v-model="secret"
          class="rounded-xl border border-border bg-card px-3 py-2 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-ring"
          placeholder="JBSWY3DPEHPK3PXP"
          spellcheck="false"
          type="text"
      />
      <p v-if="secret && !validation.valid" class="text-[11px] text-destructive">{{ validation.message }}</p>
      <p v-else-if="computeError" class="text-[11px] text-destructive">{{ computeError }}</p>
    </div>

    <div class="flex gap-4">
      <div class="flex flex-1 flex-col gap-1.5">
        <label class="text-[11px] font-medium text-muted-foreground">자릿수</label>
        <select
            v-model="digits"
            class="rounded-xl border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none focus:border-ring"
        >
          <option value="6">6자리</option>
          <option value="8">8자리</option>
        </select>
      </div>
      <div class="flex flex-1 flex-col gap-1.5">
        <label class="text-[11px] font-medium text-muted-foreground">주기</label>
        <select
            v-model="period"
            class="rounded-xl border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none focus:border-ring"
        >
          <option value="30">30초</option>
          <option value="60">60초</option>
        </select>
      </div>
    </div>

    <!-- 현재 코드 + 카운트다운 -->
    <div class="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-4 py-6">
      <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">현재 코드</span>
      <div class="flex items-center gap-3">
        <p class="font-mono text-3xl font-semibold tracking-[0.3em] text-foreground">
          {{ codes.current || placeholder }}
        </p>
        <button
            v-if="codes.current"
            class="rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            type="button"
            @click="copy(codes.current, 'current')"
        >
          {{ copied === 'current' ? '복사됨' : '복사' }}
        </button>
      </div>

      <template v-if="codes.current">
        <div aria-hidden="true" class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
              :class="secondsLeft <= 5 ? 'bg-destructive' : 'bg-primary'"
              :style="{width: progressPercent + '%'}"
              class="h-full rounded-full transition-[width] duration-1000 ease-linear"
          />
        </div>
        <p class="text-[11px] tabular-nums text-muted-foreground">{{ secondsLeft }}초 후 갱신</p>
      </template>
      <p v-else class="text-[11px] text-muted-foreground">
        {{ secret ? '올바른 Base32 시크릿을 입력하면 코드가 표시됩니다' : '시크릿 키를 입력하세요' }}
      </p>
    </div>

    <!-- 이전/다음 코드 (시간 오차 대비) -->
    <div v-if="codes.current" class="grid grid-cols-2 gap-3">
      <div
          v-for="slot in adjacentSlots"
          :key="slot.key"
          class="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3"
      >
        <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{{ slot.label }}</span>
        <div class="flex items-center gap-2">
          <p class="font-mono text-base font-medium tracking-[0.2em] text-muted-foreground">{{ slot.code }}</p>
          <button
              class="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              type="button"
              @click="copy(slot.code, slot.key)"
          >
            {{ copied === slot.key ? '✓' : '복사' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {remainingSeconds, totpAt, validateSecret} from '../../utils/totp'

const secret = ref('')
const digits = ref('6')
const period = ref('30')

const now = ref(Date.now())
const codes = ref<{ current: string; previous: string; next: string }>({current: '', previous: '', next: ''})
const computeError = ref('')
const copied = ref('')

const validation = computed(() => validateSecret(secret.value))
const periodMs = computed(() => Number(period.value) * 1000)
const placeholder = computed(() => '—'.repeat(Number(digits.value)))
const secondsLeft = computed(() => remainingSeconds(now.value, Number(period.value)))
const progressPercent = computed(() => (secondsLeft.value / Number(period.value)) * 100)

/** 현재 30/60초 창 번호 — 바뀔 때만 코드를 다시 계산한다 */
const windowIndex = computed(() => Math.floor(now.value / periodMs.value))

const adjacentSlots = computed(() => [
  {key: 'previous', label: '이전 코드', code: codes.value.previous},
  {key: 'next', label: '다음 코드', code: codes.value.next},
])

let timer: ReturnType<typeof setInterval> | undefined
let computeSeq = 0

async function recompute() {
  const seq = ++computeSeq
  if (!validation.value.valid) {
    codes.value = {current: '', previous: '', next: ''}
    computeError.value = ''
    return
  }
  try {
    const d = Number(digits.value)
    const p = Number(period.value)
    const t = now.value
    const [previous, current, next] = await Promise.all([
      totpAt(secret.value, t - periodMs.value, d, p),
      totpAt(secret.value, t, d, p),
      totpAt(secret.value, t + periodMs.value, d, p),
    ])
    if (seq !== computeSeq) return // 입력이 바뀐 뒤 도착한 낡은 결과는 버린다
    codes.value = {current, previous, next}
    computeError.value = ''
  } catch (e) {
    if (seq !== computeSeq) return
    codes.value = {current: '', previous: '', next: ''}
    computeError.value = e instanceof Error ? e.message : '코드 생성에 실패했습니다'
  }
}

async function copy(code: string, key: string) {
  try {
    await navigator.clipboard.writeText(code)
    copied.value = key
    setTimeout(() => {
      if (copied.value === key) copied.value = ''
    }, 1500)
  } catch {
    /* 클립보드 권한 거부 시 무시 */
  }
}

watch([secret, digits, period, windowIndex], () => void recompute())

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

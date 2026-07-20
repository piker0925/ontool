<template>
  <div class="flex flex-col gap-3 max-w-5xl mx-auto w-full">
    <div class="flex w-fit gap-0.5 rounded-lg bg-muted p-0.5">
      <button v-for="m in JWT_MODES" :key="m.id"
              :class="jwtMode === m.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              class="rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors"
              @click="jwtMode = m.id">
        {{ m.label }}
      </button>
    </div>

  <div v-if="jwtMode === 'decode'" class="grid grid-cols-2 gap-4">
    <!-- 왼쪽: 입력 + 옵션 -->
    <div class="flex flex-col gap-3">
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">JWT 토큰</span>
          <button v-if="jwtInput"
                  class="ml-auto rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground"
                  @click="jwtInput = ''; jwtResult = null; jwtError = ''">
            <X class="size-3.5"/>
          </button>
        </div>
        <textarea v-model="jwtInput"
                  class="h-44 w-full resize-none bg-muted/40 p-3 font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground/40 break-all"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  @input="decodeJwtInput"/>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <p class="mb-3 text-[11px] font-medium text-muted-foreground">표시 옵션</p>
        <div class="flex flex-col gap-2.5">
          <label v-for="opt in JWT_OPTIONS" :key="opt.key" class="flex items-start gap-2 cursor-pointer">
            <input v-model="(jwtOptions as any)[opt.key]" class="mt-0.5 accent-primary" type="checkbox"/>
            <div>
              <span class="text-[12px] text-foreground">{{ opt.label }}</span>
              <span class="ml-1.5 text-[10px] text-muted-foreground">{{ opt.desc }}</span>
            </div>
          </label>
        </div>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <p class="mb-2 text-[11px] font-medium text-muted-foreground">서명 검증 (선택)</p>
        <input v-model="decodeSecret"
               class="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-[12px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
               placeholder="HS256 서명 키(secret)" type="text"/>
        <p v-if="signatureVerify !== null"
           :class="signatureVerify ? 'text-emerald-600' : 'text-destructive'"
           class="mt-2 text-[11px] font-medium">
          {{ signatureVerify ? '✓ 서명 일치' : '✗ 서명 불일치' }}
        </p>
        <p v-else-if="decodeSecret && jwtResult && summary && summary.alg.label !== 'HS256'"
           class="mt-2 text-[11px] text-muted-foreground">
          HS256 토큰만 이 화면에서 검증할 수 있습니다.
        </p>
      </div>
    </div>

    <!-- 오른쪽: 결과 -->
    <div class="flex flex-col gap-3">
      <div v-if="jwtError" class="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
        <p class="text-[12px] text-destructive">{{ jwtError }}</p>
      </div>

      <template v-else-if="jwtResult && summary">
        <!-- 토큰 검증 요약 카드 -->
        <div class="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">형식 OK</span>
            <span :class="algBadgeClass" class="rounded-full px-2 py-0.5 text-[10px] font-bold">{{
                summary.alg.label
              }}</span>
            <span v-if="summary.alg.risk === 'critical'"
                  class="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">위험</span>
            <span v-else-if="summary.alg.risk === 'warn'"
                  class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600">주의</span>
            <span v-if="expiryDisplay"
                  :class="expiryDisplay.expired ? 'bg-destructive/10 text-destructive' : 'bg-emerald-100 text-emerald-600'"
                  class="rounded-full px-2 py-0.5 text-[10px] font-semibold">{{
                expiryDisplay.expired ? '만료됨' : '유효'
              }}</span>
            <span v-else
                  class="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">exp 없음</span>
            <span v-if="summary.notYetValid"
                  class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600">nbf 이전</span>
            <span class="ml-auto text-[10px] text-muted-foreground">
              표준 {{ summary.standardClaims }}/7 · 클레임 {{ summary.totalClaims }}개
            </span>
          </div>

          <!-- 실시간 만료 카운트다운 (1초 갱신) -->
          <div v-if="expiryDisplay" class="flex flex-col gap-1">
            <p :class="EXPIRY_TONE_TEXT[expiryDisplay.tone]" class="font-mono text-[12px] font-medium">
              {{ expiryDisplay.text }}
            </p>
            <div v-if="expiryProgress !== null" class="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div :class="EXPIRY_TONE_BAR[expiryDisplay.tone]" :style="{ width: `${expiryProgress * 100}%` }"
                   class="h-full transition-all duration-1000"/>
            </div>
          </div>

          <p class="text-[10px] leading-relaxed text-muted-foreground">{{ summary.alg.note }}</p>

          <!-- 원본 JSON / 토큰 복사 -->
          <div class="flex flex-wrap gap-1.5">
            <button v-for="btn in COPY_BUTTONS" :key="btn.key"
                    class="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    @click="copyPart(btn.key)">
              <Check v-if="copiedPart === btn.key" class="size-3 text-emerald-500"/>
              <Copy v-else class="size-3"/>
              {{ btn.label }}
            </button>
          </div>
        </div>

        <!-- 탭 분리 -->
        <template v-if="jwtOptions.separateTabs">
          <div class="flex gap-0.5 rounded-lg bg-muted p-0.5">
            <button v-for="tab in ['payload', 'header']" :key="tab"
                    :class="jwtActiveTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                    class="flex-1 rounded-md py-1 text-[12px] font-medium transition-colors"
                    @click="jwtActiveTab = tab">
              {{ tab === 'header' ? '헤더' : '페이로드' }}
            </button>
          </div>
          <JwtPanel
              :data="(jwtActiveTab === 'header' ? jwtResult.header : jwtResult.payload) as Record<string,unknown>"
              :is-payload="jwtActiveTab === 'payload'" :show-claims="jwtOptions.showClaims"
              :show-expiry="jwtOptions.showExpiry" :show-raw="jwtOptions.showRaw"/>
        </template>

        <!-- 합쳐진 모드 -->
        <template v-else>
          <div>
            <p class="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Header</p>
            <JwtPanel :data="jwtResult.header as Record<string,unknown>" :is-payload="false" :show-claims="false"
                      :show-expiry="false" :show-raw="true"/>
          </div>
          <div>
            <p class="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Payload</p>
            <JwtPanel :data="jwtResult.payload as Record<string,unknown>" :is-payload="true"
                      :show-claims="jwtOptions.showClaims" :show-expiry="jwtOptions.showExpiry"
                      :show-raw="jwtOptions.showRaw"/>
          </div>
        </template>
      </template>

      <div v-else class="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <ArrowRight class="size-4 text-muted-foreground/40"/>
        <p class="text-[11px] text-muted-foreground/50">JWT 토큰을 입력하세요</p>
      </div>
    </div>
  </div>

  <!-- 생성 모드 -->
  <div v-else class="grid grid-cols-2 gap-4">
    <div class="flex flex-col gap-3">
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center justify-between border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">페이로드 (JSON)</span>
          <button class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground/70 transition-colors hover:text-primary"
                  @click="applyGenSample">
            <Wand2 class="size-3"/>
            예시
          </button>
        </div>
        <textarea v-model="genPayload"
                  class="h-44 w-full resize-none bg-muted/40 p-3 font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground/40"
                  placeholder='{"sub": "1234567890"}'/>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <label class="mb-2 block text-[11px] font-medium text-muted-foreground">서명 키 (secret, HS256)</label>
        <input v-model="genSecret"
               class="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-[12px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
               placeholder="secret" type="text"/>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <div v-if="genError" class="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
        <p class="text-[12px] text-destructive">{{ genError }}</p>
      </div>

      <template v-else-if="genToken">
        <div class="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-medium text-muted-foreground">생성된 토큰</span>
            <button class="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground"
                    @click="copyGenToken">
              <Check v-if="genCopied" class="size-3 text-emerald-500"/>
              <Copy v-else class="size-3"/>
            </button>
          </div>
          <p class="break-all font-mono text-[11px] text-foreground">{{ genToken }}</p>
        </div>
        <button class="self-start rounded-md border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                @click="tryInDecodeTab">
          디코드 탭에서 검증 →
        </button>
      </template>

      <div v-else class="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <ArrowRight class="size-4 text-muted-foreground/40"/>
        <p class="text-[11px] text-muted-foreground/50">페이로드와 서명 키를 입력하세요</p>
      </div>
    </div>
  </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, defineComponent, h, onUnmounted, reactive, ref, watch} from 'vue'
import {ArrowRight, Check, Copy, Wand2, X} from 'lucide-vue-next'
import {decodeJwt} from '../../utils/jwtDecode'
import {signJwt, verifyJwtSignature} from '../../utils/jwtSign'
import {
  claimCopyText,
  formatDuration,
  isLikelyUnixTimestamp,
  summarizeJwt,
  timestampToIso,
} from '../../utils/jwtAnalysis'

// ── JWT 클레임 패널 (인라인 컴포넌트) ────────────────────────────────────────
const TIMESTAMP_CLAIMS = new Set(['exp', 'iat', 'nbf'])
const CLAIM_LABELS: Record<string, string> = {
  sub: 'Subject', iss: 'Issuer', aud: 'Audience',
  exp: 'Expiration', iat: 'Issued At', nbf: 'Not Before', jti: 'JWT ID',
  name: 'Name', email: 'Email', email_verified: 'Email Verified',
  given_name: 'Given Name', family_name: 'Family Name',
  preferred_username: 'Username', picture: 'Picture URL',
  locale: 'Locale', role: 'Role', roles: 'Roles',
  scope: 'Scope', azp: 'Authorized Party', nonce: 'Nonce', sid: 'Session ID',
}

function formatClaimValue(key: string, value: unknown, showExpiry: boolean): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? '✓ true' : '✗ false'
  // exp/iat/nbf 뿐 아니라 timestamp로 보이는 모든 숫자 클레임에 사람 시간 병기
  if (showExpiry && typeof value === 'number' && (TIMESTAMP_CLAIMS.has(key) || isLikelyUnixTimestamp(value)))
    return `${value}  (${timestampToIso(value)})`
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const JwtPanel = defineComponent({
  props: {
    data: {type: Object as () => Record<string, unknown>, required: true},
    isPayload: Boolean,
    showClaims: Boolean,
    showRaw: Boolean,
    showExpiry: Boolean,
  },
  setup(props) {
    const entries = computed(() => Object.entries(props.data))
    const knownEntries = computed(() => entries.value.filter(([k]) => CLAIM_LABELS[k]))
    const unknownEntries = computed(() => entries.value.filter(([k]) => !CLAIM_LABELS[k]))
    const rawJson = computed(() => JSON.stringify(props.data, null, 2))
    const copiedKey = ref<string | null>(null)

    async function copy(key: string, text: string) {
      await navigator.clipboard.writeText(text)
      copiedKey.value = key
      setTimeout(() => {
        if (copiedKey.value === key) copiedKey.value = null
      }, 1500)
    }

    const copyBtn = (key: string, text: string) =>
        h('button', {
              class: 'rounded p-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors',
              title: '이 클레임 값 복사',
              onClick: () => copy(key, text),
            },
            copiedKey.value === key
                ? h(Check, {class: 'size-3 text-emerald-500'})
                : h(Copy, {class: 'size-3'}),
        )

    return () => {
      const children = []

      // 구조화 클레임 테이블
      if (props.showClaims && props.isPayload) {
        const rows = [
          ...knownEntries.value.map(([k, v]) =>
              h('div', {class: 'flex items-start gap-3 px-3 py-2 border-b border-border last:border-0'}, [
                h('div', {class: 'w-28 shrink-0'}, [
                  h('p', {class: 'text-[10px] font-medium text-muted-foreground'}, CLAIM_LABELS[k]),
                  h('p', {class: 'font-mono text-[9px] text-muted-foreground/50'}, k),
                ]),
                h('span', {class: 'flex-1 font-mono text-[11px] text-foreground break-all'}, formatClaimValue(k, v, props.showExpiry)),
                copyBtn(k, claimCopyText(v)),
              ])
          ),
          ...(unknownEntries.value.length ? [
            h('div', {class: 'border-t border-dashed border-border'}),
            ...unknownEntries.value.map(([k, v]) =>
                h('div', {class: 'flex items-start gap-3 px-3 py-2 border-b border-border last:border-0'}, [
                  h('div', {class: 'w-28 shrink-0'}, h('p', {class: 'font-mono text-[10px] text-muted-foreground'}, k)),
                  h('span', {class: 'flex-1 font-mono text-[11px] text-foreground break-all'}, formatClaimValue(k, v, props.showExpiry)),
                  copyBtn(k, claimCopyText(v)),
                ])
            ),
          ] : []),
        ]
        children.push(h('div', {class: 'rounded-xl border border-border bg-card overflow-hidden'}, rows))
      }

      // Raw JSON
      if (props.showRaw || !props.isPayload || !props.showClaims) {
        children.push(
            h('div', {class: 'relative rounded-xl border border-border bg-muted/40 overflow-hidden'}, [
              h('button', {
                    class: 'absolute right-2 top-2 rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors',
                    title: '원본 JSON 복사',
                    onClick: () => copy('__raw', rawJson.value),
                  },
                  copiedKey.value === '__raw'
                      ? h(Check, {class: 'size-3 text-emerald-500'})
                      : h(Copy, {class: 'size-3'}),
              ),
              h('pre', {class: 'p-3 font-mono text-[11px] text-foreground whitespace-pre-wrap break-all'}, rawJson.value),
            ])
        )
      }

      return h('div', {class: 'flex flex-col gap-2'}, children)
    }
  },
})

// ── JWT ───────────────────────────────────────────────────────────────────────
const jwtInput = ref('')
const jwtResult = ref<{ header: unknown; payload: unknown } | null>(null)
const jwtError = ref('')
const jwtActiveTab = ref('payload')

const jwtOptions = reactive({
  showExpiry: true,
  showClaims: true,
  showRaw: false,
  separateTabs: false,
})

const JWT_OPTIONS = [
  {key: 'showExpiry', label: '타임스탬프 변환', desc: 'exp/iat 등 숫자 → 날짜 병기'},
  {key: 'showClaims', label: '클레임 구조화', desc: '표준 클레임 라벨 + 테이블'},
  {key: 'showRaw', label: 'Raw JSON', desc: '포맷된 JSON 원문'},
  {key: 'separateTabs', label: '헤더/페이로드 탭 분리', desc: '탭으로 전환'},
]

function decodeJwtInput() {
  jwtError.value = ''
  jwtResult.value = null
  if (!jwtInput.value.trim()) return
  try {
    jwtResult.value = decodeJwt(jwtInput.value.trim())
  } catch (e: unknown) {
    jwtError.value = e instanceof Error ? e.message : '유효하지 않은 JWT입니다.'
  }
}

// ── 모드 (디코드/생성) ────────────────────────────────────────────────────────
const JWT_MODES = [
  {id: 'decode', label: '디코드'},
  {id: 'generate', label: '생성'},
] as const
const jwtMode = ref<'decode' | 'generate'>('decode')

// ── 서명 검증 (디코드 탭, HS256 전용) ──────────────────────────────────────────
const decodeSecret = ref('')
const signatureVerify = ref<boolean | null>(null)

// 빠른 연속 입력 시 먼저 시작된 검증이 나중에 끝나 최신 결과를 덮어쓰지 않도록 요청 순번으로 가드.
let verifyRequestId = 0
watch([decodeSecret, jwtResult], async () => {
  const requestId = ++verifyRequestId
  if (!decodeSecret.value || !jwtResult.value || !jwtInput.value.trim()) {
    signatureVerify.value = null
    return
  }
  const result = await verifyJwtSignature(jwtInput.value.trim(), decodeSecret.value)
  if (requestId === verifyRequestId) signatureVerify.value = result
})

// ── 생성 ─────────────────────────────────────────────────────────────────────
const genPayload = ref('')
const genSecret = ref('')
const genToken = ref('')
const genError = ref('')
const genCopied = ref(false)

const GEN_EXAMPLE_PAYLOAD = '{\n  "sub": "1234567890",\n  "name": "Hong Gildong",\n  "role": "admin"\n}'
const GEN_EXAMPLE_SECRET = 'my-secret-key'

function applyGenSample() {
  genPayload.value = GEN_EXAMPLE_PAYLOAD
  genSecret.value = GEN_EXAMPLE_SECRET
}

// 빠른 연속 입력 시 먼저 시작된 생성이 나중에 끝나 최신 결과를 덮어쓰지 않도록 요청 순번으로 가드.
let genRequestId = 0
watch([genPayload, genSecret], async () => {
  const requestId = ++genRequestId
  genError.value = ''
  genToken.value = ''
  if (!genPayload.value.trim() || !genSecret.value) return
  try {
    const token = await signJwt(genPayload.value, genSecret.value)
    if (requestId === genRequestId) genToken.value = token
  } catch (e: unknown) {
    if (requestId === genRequestId) genError.value = e instanceof Error ? e.message : '토큰을 생성할 수 없습니다.'
  }
})

async function copyGenToken() {
  if (!genToken.value) return
  await navigator.clipboard.writeText(genToken.value)
  genCopied.value = true
  setTimeout(() => {
    genCopied.value = false
  }, 1500)
}

/** 생성한 토큰 + secret을 디코드 탭에 그대로 옮겨 라운드트립을 즉시 확인할 수 있게 한다. */
function tryInDecodeTab() {
  if (!genToken.value) return
  jwtInput.value = genToken.value
  decodeSecret.value = genSecret.value
  jwtMode.value = 'decode'
  decodeJwtInput()
}

// ── 실시간 시계 (만료 카운트다운용, 1초 갱신) ─────────────────────────────────
const nowSec = ref(Math.floor(Date.now() / 1000))
const clockTimer = setInterval(() => {
  nowSec.value = Math.floor(Date.now() / 1000)
}, 1000)
onUnmounted(() => clearInterval(clockTimer))

// ── 검증 요약 ─────────────────────────────────────────────────────────────────
const summary = computed(() => {
  if (!jwtResult.value) return null
  return summarizeJwt(
      jwtResult.value.header as Record<string, unknown>,
      jwtResult.value.payload as Record<string, unknown>,
      nowSec.value,
  )
})

type ExpiryTone = 'expired' | 'danger' | 'warn' | 'ok'

const EXPIRY_TONE_TEXT: Record<ExpiryTone, string> = {
  expired: 'text-destructive',
  danger: 'text-destructive',
  warn: 'text-amber-600',
  ok: 'text-emerald-600',
}
const EXPIRY_TONE_BAR: Record<ExpiryTone, string> = {
  expired: 'bg-destructive',
  danger: 'bg-destructive',
  warn: 'bg-amber-500',
  ok: 'bg-emerald-500',
}

const expiryDisplay = computed(() => {
  const s = summary.value
  if (!s || s.expDelta === null) return null
  const expired = s.expDelta < 0
  const tone: ExpiryTone = expired ? 'expired' : s.expDelta < 300 ? 'danger' : s.expDelta < 3600 ? 'warn' : 'ok'
  return {
    expired,
    tone,
    text: expired ? `${formatDuration(-s.expDelta)} 전 만료됨` : `만료까지 ${formatDuration(s.expDelta)}`,
  }
})

/** iat가 있을 때만: 토큰 수명 중 남은 비율 (0~1). */
const expiryProgress = computed(() => {
  const s = summary.value
  if (!s || s.exp === null) return null
  const iat = (jwtResult.value?.payload as Record<string, unknown> | undefined)?.iat
  if (typeof iat !== 'number' || s.exp <= iat) return null
  return Math.max(0, Math.min(1, (s.exp - nowSec.value) / (s.exp - iat)))
})

const algBadgeClass = computed(() => {
  const s = summary.value
  if (!s || s.alg.risk === 'critical') return 'bg-destructive/10 text-destructive'
  if (s.alg.risk === 'warn') return 'bg-amber-100 text-amber-700'
  const alg = s.alg.label
  if (alg.startsWith('HS')) return 'bg-blue-100 text-blue-700'
  if (alg.startsWith('RS')) return 'bg-purple-100 text-purple-700'
  if (alg.startsWith('ES')) return 'bg-emerald-100 text-emerald-700'
  if (alg.startsWith('PS')) return 'bg-orange-100 text-orange-700'
  return 'bg-muted text-foreground'
})

// ── 헤더/페이로드 원본 JSON + 전체 토큰 복사 ──────────────────────────────────
const COPY_BUTTONS = [
  {key: 'header', label: '헤더 JSON'},
  {key: 'payload', label: '페이로드 JSON'},
  {key: 'token', label: '전체 토큰'},
] as const

const copiedPart = ref<string | null>(null)

async function copyPart(part: 'header' | 'payload' | 'token') {
  if (!jwtResult.value) return
  const text = part === 'token'
      ? jwtInput.value.trim()
      : JSON.stringify(part === 'header' ? jwtResult.value.header : jwtResult.value.payload, null, 2)
  await navigator.clipboard.writeText(text)
  copiedPart.value = part
  setTimeout(() => {
    if (copiedPart.value === part) copiedPart.value = null
  }, 1500)
}

const JWT_EXAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

jwtInput.value = JWT_EXAMPLE
decodeJwtInput()
</script>

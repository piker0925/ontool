<template>
  <div
      class="grid min-h-[420px] grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-2 lg:divide-x lg:divide-y-0"
  >
    <!-- Input -->
    <div class="flex flex-col">
      <div class="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">입력</span>
        <button
            class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground/70 transition-colors hover:text-primary"
            @click="applySample"
        >
          <Wand2 class="size-3"/>
          예시
        </button>
      </div>

      <div class="flex flex-col gap-1.5 border-b border-border p-4">
        <label class="text-[11px] font-medium text-muted-foreground">변환 방식</label>
        <select
            v-model="modeId"
            class="rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
        >
          <option v-for="m in MODES" :key="m.id" :value="m.id">{{ m.label }}</option>
        </select>
      </div>

      <textarea
          v-model="input"
          :placeholder="mode.sample"
          class="min-h-[32vh] flex-1 resize-y bg-muted/40 p-4 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
      />

      <div class="flex h-9 shrink-0 items-center border-t border-border px-4">
        <p class="text-[11px] text-muted-foreground/70">입력하면 자동으로 변환됩니다</p>
      </div>
    </div>

    <!-- Output -->
    <div class="flex flex-col">
      <div class="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <span
            class="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          결과
        </span>
        <button
            v-if="output"
            :class="copied ? 'text-emerald-500' : 'text-muted-foreground/60 hover:text-foreground'"
            class="rounded p-0.5 transition-colors"
            @click="copyOutput"
        >
          <Check v-if="copied" class="size-3.5"/>
          <Copy v-else class="size-3.5"/>
        </button>
      </div>

      <div class="flex-1 overflow-auto">
        <div v-if="error" class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <AlertCircle class="size-5 text-destructive/70"/>
          <p class="text-[13px] text-foreground">{{ error }}</p>
          <p class="text-[11px] text-muted-foreground">입력 형식을 확인해 주세요</p>
        </div>
        <pre
            v-else-if="output"
            class="h-full whitespace-pre-wrap break-all p-4 font-mono text-[13px] text-foreground"
        >{{ output }}</pre>
        <div v-else class="flex h-full flex-col items-center justify-center gap-2.5 px-6 text-center">
          <div class="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-border">
            <ArrowRight class="size-5 text-muted-foreground/50"/>
          </div>
          <p class="text-[12px] text-muted-foreground">입력과 동시에 결과가 나타납니다</p>
          <Button class="text-[12px]" size="sm" variant="outline" @click="applySample">
            <Wand2 class="size-3.5"/>
            예시로 실행해 보기
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {AlertCircle, ArrowRight, Check, Copy, Wand2} from 'lucide-vue-next'
import {decodeHtmlEntities, encodeHtmlEntities} from '../utils/htmlEntity'
import {
  decodeBase64,
  decodeBase64Url,
  decodeUrl,
  encodeBase64,
  encodeBase64Url,
  encodeUrl,
} from '../utils/frontendTools'
import {
  decodeCharCodes,
  decodeHex,
  decodeUnicode,
  encodeCharCodes,
  encodeHex,
  encodeUnicode,
  rot13,
} from './encoderUtils'
import {Button} from '@/components/ui/button'

interface EncoderMode {
  id: string
  label: string
  sample: string
  /** 로컬 변환 함수 */
  fn: (input: string) => string
}

const MODES: EncoderMode[] = [
  {id: 'base64-encode', label: 'Base64 인코드', fn: encodeBase64, sample: 'hello world 안녕하세요'},
  {id: 'base64-decode', label: 'Base64 디코드', fn: decodeBase64, sample: 'aGVsbG8gd29ybGQ='},
  {
    id: 'base64url-encode',
    label: 'Base64 인코드 (URL-safe)',
    fn: encodeBase64Url,
    sample: '개발 도구? a+b/c',
  },
  {
    id: 'base64url-decode',
    label: 'Base64 디코드 (URL-safe)',
    fn: decodeBase64Url,
    sample: '6rCc67CcIOuPhOq1rD8gYStiL2M',
  },
  {id: 'url-encode', label: 'URL 인코드', fn: encodeUrl, sample: 'https://example.com/검색?q=개발 도구'},
  {id: 'url-decode', label: 'URL 디코드', fn: decodeUrl, sample: 'https%3A%2F%2Fexample.com%2F%EA%B2%80%EC%83%89'},
  {id: 'hex-encode', label: 'Hex 인코드', fn: encodeHex, sample: 'hello 안녕'},
  {id: 'hex-decode', label: 'Hex 디코드', fn: decodeHex, sample: '68656c6c6f20ec9588eb8595'},
  {id: 'unicode-encode', label: 'Unicode 이스케이프 (\\uXXXX)', fn: encodeUnicode, sample: '안녕하세요 hello'},
  {id: 'unicode-decode', label: 'Unicode 언이스케이프', fn: decodeUnicode, sample: '\\uc548\\ub155\\ud558\\uc138\\uc694 hello'},
  {id: 'charcode-encode', label: '텍스트 → 문자 코드 (10진)', fn: encodeCharCodes, sample: 'Hello!'},
  {id: 'charcode-decode', label: '문자 코드 → 텍스트', fn: decodeCharCodes, sample: '72 101 108 108 111 33'},
  {id: 'rot13', label: 'ROT13 (적용/해제 동일)', fn: rot13, sample: 'Hello, World!'},
  {
    id: 'html-encode',
    label: 'HTML Entity 인코드',
    fn: encodeHtmlEntities,
    sample: '<div class="greeting">hello & world</div>'
  },
  {
    id: 'html-decode',
    label: 'HTML Entity 디코드',
    fn: decodeHtmlEntities,
    sample: '&lt;div&gt;hello &amp; world&lt;/div&gt;'
  },
]

const route = useRoute()
const router = useRouter()

const initialMode = typeof route.query.mode === 'string' && MODES.some(m => m.id === route.query.mode)
    ? route.query.mode
    : 'base64-encode'

const modeId = ref(initialMode)

// URL query 양방향 동기화 (replace라 뒤로가기 이력을 오염시키지 않음)
watch(modeId, id => {
  if (route.query.mode === id) return
  router.replace({query: {...route.query, mode: id}})
})

watch(() => route.query.mode, q => {
  if (typeof q === 'string' && q !== modeId.value && MODES.some(m => m.id === q)) modeId.value = q
})
const input = ref('')
const output = ref('')
const error = ref('')
const copied = ref(false)

const mode = computed(() => MODES.find(m => m.id === modeId.value) ?? MODES[0])

watch([input, modeId], () => {
  if (!input.value) {
    output.value = ''
    error.value = ''
    return
  }
  try {
    output.value = mode.value.fn(input.value)
    error.value = ''
  } catch (e) {
    output.value = ''
    error.value = e instanceof Error && e.message ? e.message : '변환할 수 없는 입력입니다'
  }
})

function applySample() {
  input.value = mode.value.sample
}

async function copyOutput() {
  if (!output.value) return
  await navigator.clipboard.writeText(output.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

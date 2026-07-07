<template>
  <div v-if="loading" class="flex items-center gap-2 p-6 text-sm text-slate-400">
    <Loader2 class="size-4 animate-spin"/>
    불러오는 중...
  </div>

  <div v-else-if="!mod" class="p-6 text-sm text-slate-500">모듈을 찾을 수 없습니다.</div>

  <template v-else>
    <!-- Header -->
    <div class="sticky top-0 z-10 flex h-12 items-center border-b border-slate-100 bg-white px-6 gap-3">
      <nav class="flex items-center gap-1.5 text-[13px] text-slate-400">
        <router-link class="transition-colors hover:text-slate-600" to="/">홈</router-link>
        <ChevronRight class="size-3.5"/>
        <span class="text-slate-500">{{ mod.category }}</span>
        <ChevronRight class="size-3.5"/>
        <span class="font-medium text-slate-800">{{ mod.name }}</span>
      </nav>
      <span
          :class="mod.isHeavy ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'"
          class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
      >{{ mod.isHeavy ? 'Heavy' : 'Light' }}</span>
      <p v-if="mod.description" class="ml-auto text-[12px] text-slate-400 hidden lg:block">{{ mod.description }}</p>
    </div>

    <!-- Frontend-only -->
    <FrontendToolPage v-if="mod.isFrontendOnly" :moduleId="mod.id"/>

    <!-- Heavy -->
    <div v-else-if="mod.isHeavy" class="grid h-[calc(100vh-3rem)] grid-cols-2 divide-x divide-slate-200">
      <!-- Left: Params + Upload -->
      <div class="flex flex-col overflow-hidden">
        <div class="flex h-10 shrink-0 items-center border-b border-slate-100 px-4">
          <span class="text-[11px] font-medium text-slate-400">파일 업로드</span>
          <button v-if="jobId || result" class="ml-auto rounded p-0.5 text-slate-300 transition-colors hover:text-slate-500" @click="resetAll">
            <X class="size-3.5"/>
          </button>
        </div>

        <!-- Heavy params (있을 때만) -->
        <div v-if="heavyConfig" class="shrink-0 border-b border-slate-100 p-4 flex flex-col gap-3">
          <span class="text-[11px] font-medium text-slate-400">파라미터</span>
          <div v-for="p in heavyConfig.params" :key="p.key" class="flex flex-col gap-1">
            <label class="text-[11px] text-slate-500">{{ p.label }}</label>
            <input
                v-if="p.type === 'text'"
                v-model="heavyFormValues[p.key]"
                :placeholder="p.placeholder ?? ''"
                class="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-800 outline-none focus:border-indigo-300"
                type="text"
            />
            <select
                v-else-if="p.type === 'select'"
                v-model="heavyFormValues[p.key]"
                class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700 outline-none focus:border-indigo-300"
            >
              <option v-for="opt in p.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
        </div>

        <!-- 텍스트 직접 입력 (json-schema-to-dto, openapi-to-code) -->
        <div v-if="heavyConfig?.textInput" class="flex flex-col border-b border-slate-100">
          <div class="flex h-9 shrink-0 items-center justify-between border-b border-slate-100 px-4">
            <span class="text-[11px] font-medium text-slate-400">{{ heavyConfig.textInput.label }}</span>
          </div>
          <textarea
              v-model="heavyTextContent"
              :placeholder="heavyConfig.textInput.placeholder"
              class="h-48 resize-none bg-slate-50 p-3 font-mono text-[12px] text-slate-800 outline-none placeholder:text-slate-300"
          />
          <div class="flex items-center gap-2 px-4 py-2">
            <Button :disabled="!heavyTextContent.trim()" class="h-7 text-[12px]" @click="uploadTextAsFile">
              텍스트로 생성
            </Button>
            <span class="text-[11px] text-slate-400">또는 아래에서 파일 업로드</span>
          </div>
        </div>

        <div class="flex flex-1 flex-col p-6 overflow-auto">
          <FileUploader :moduleId="mod.id" :params="heavyFormValues" @uploaded="onUploaded"/>
        </div>
      </div>

      <!-- Right: Result -->
      <div class="flex flex-col">
        <div class="flex h-10 shrink-0 items-center border-b border-slate-100 px-4">
          <span class="text-[11px] font-medium text-slate-400">결과</span>
        </div>
        <div class="flex flex-1 items-center justify-center p-6">
          <div v-if="!jobId && !result" class="flex flex-col items-center gap-3 text-center">
            <div class="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-slate-200">
              <ArrowRight class="size-5 text-slate-300"/>
            </div>
            <p class="text-[12px] text-slate-400">파일을 업로드하면 처리가 시작됩니다</p>
          </div>
          <div v-else-if="!result" class="flex flex-col items-center gap-4">
            <Loader2 class="size-8 animate-spin text-indigo-400"/>
            <p class="text-[13px] text-slate-500">처리 중입니다...</p>
            <JobPoller :jobId="jobId!" @done="onDone" @failed="onFailed"/>
          </div>
          <div v-else class="flex w-full flex-col gap-4">
            <ResultViewer :text="result.text" :url="result.url"/>
            <Button class="w-fit" variant="outline" @click="resetAll">다시 실행</Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Light -->
    <div v-else class="grid grid-cols-2 h-[calc(100vh-3rem)]">
      <!-- Input -->
      <div class="flex flex-col border-r border-slate-200">
        <div class="flex h-10 shrink-0 items-center justify-between border-b border-slate-100 px-4">
          <span class="text-[11px] font-medium text-slate-400">입력</span>
          <button v-if="hasInput" class="rounded p-0.5 text-slate-300 transition-colors hover:text-slate-500" @click="resetLight">
            <X class="size-3.5"/>
          </button>
        </div>

        <!-- CONFIGS 기반 입력 -->
        <div v-if="moduleConfig" class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div v-for="p in moduleConfig.params" :key="p.key" class="flex flex-col gap-1.5">
            <label class="text-[11px] font-medium text-slate-500">{{ p.label }}</label>
            <textarea
                v-if="p.type === 'textarea'"
                v-model="formValues[p.key]"
                :placeholder="p.placeholder ?? ''"
                class="min-h-[120px] resize-y rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-[13px] text-slate-800 outline-none focus:border-indigo-300 placeholder:text-slate-300"
                @keydown="handleTextareaKeydown"
            />
            <input
                v-else-if="p.type === 'text'"
                v-model="formValues[p.key]"
                :placeholder="p.placeholder ?? ''"
                class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800 outline-none focus:border-indigo-300 placeholder:text-slate-300"
                type="text"
                @keydown="handleTextareaKeydown"
            />
            <select
                v-else-if="p.type === 'select'"
                v-model="formValues[p.key]"
                class="rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-indigo-300"
            >
              <option v-for="opt in p.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
        </div>

        <!-- 단일 textarea (CONFIGS 없는 모듈) -->
        <textarea
            v-else
            v-model="runInput"
            class="flex-1 resize-none bg-slate-50 p-4 font-mono text-[13px] text-slate-800 outline-none placeholder:text-slate-300"
            placeholder="입력값을 입력하세요"
            @keydown="handleTextareaKeydown"
        />

        <div class="flex shrink-0 h-12 items-center gap-3 border-t border-slate-100 px-4">
          <Button :disabled="running" class="flex-1 h-8 text-[13px]" @click="runLight">
            <Loader2 v-if="running" class="size-3.5 animate-spin"/>
            <span>{{ running ? '실행 중...' : '실행' }}</span>
          </Button>
          <span class="text-[10px] text-slate-400 font-mono">⌘↵</span>
        </div>
      </div>

      <!-- Output -->
      <div class="flex flex-col">
        <div class="flex h-10 shrink-0 items-center justify-between border-b border-slate-100 px-4">
          <span class="text-[11px] font-medium text-slate-400">결과</span>
          <button
              v-if="result?.text && moduleConfig?.resultType !== 'image'"
              :class="copied ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-500'"
              class="rounded p-0.5 transition-colors"
              @click="copyResult"
          >
            <Check v-if="copied" class="size-3.5"/>
            <Copy v-else class="size-3.5"/>
          </button>
        </div>

        <div class="flex-1 overflow-auto">
          <div v-if="runError" class="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div class="flex size-10 items-center justify-center rounded-full bg-red-50">
              <AlertCircle class="size-5 text-red-400"/>
            </div>
            <div>
              <p class="text-[13px] font-medium text-slate-700">서버에 연결할 수 없습니다</p>
              <p class="mt-0.5 text-[11px] text-slate-400">잠시 후 다시 시도해 주세요</p>
            </div>
            <Button class="text-[12px]" size="sm" variant="outline" @click="runLight">다시 시도</Button>
          </div>

          <div v-else-if="moduleConfig?.resultType === 'image' && result?.text" class="flex flex-col items-center gap-4 p-6">
            <img :src="`data:image/png;base64,${result.text}`" alt="생성된 이미지" class="max-w-full rounded border border-slate-200 shadow-sm"/>
            <Button class="text-[12px]" size="sm" variant="outline" @click="downloadImage">다운로드</Button>
          </div>

          <div v-else-if="result" class="p-4">
            <ResultViewer :text="result.text" :url="result.url"/>
          </div>

          <div v-else class="flex h-full flex-col items-center justify-center gap-2.5 px-6 text-center">
            <div class="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-slate-200">
              <ArrowRight class="size-5 text-slate-300"/>
            </div>
            <p class="text-[12px] text-slate-400">
              입력 후 <kbd class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px]">⌘↵</kbd> 또는 실행 버튼을 누르세요
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Comments -->
    <div class="border-t border-slate-100 px-6 py-8">
      <CommentSection :module-id="(route.params.moduleId as string)"/>
    </div>
  </template>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {useRoute} from 'vue-router'
import {AlertCircle, ArrowRight, Check, ChevronRight, Copy, Loader2, X} from 'lucide-vue-next'
import {apiClient} from '../api/client'
import {MOCK_MODULES} from '../api/mock'
import {normalizeApiModules} from '../api/modules'
import type {Job, Module, UploadResult} from '../types'
import {Button} from '@/components/ui/button'
import FrontendToolPage from '../components/FrontendToolPage.vue'
import FileUploader from '../components/FileUploader.vue'
import JobPoller from '../components/JobPoller.vue'
import ResultViewer from '../components/ResultViewer.vue'
import CommentSection from '../components/CommentSection.vue'

// ── 파라미터 타입 ─────────────────────────────────────────────────────────

interface ParamDef {
  key: string
  label: string
  type: 'textarea' | 'text' | 'select'
  placeholder?: string
  options?: string[]
  default?: string
}

interface ModuleConfig {
  params: ParamDef[]
  resultType?: 'image'
  textInput?: { label: string; placeholder: string; filename: string }
}

// ── Light 모듈 CONFIGS ────────────────────────────────────────────────────

const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  // 이미지 생성기
  'qr-code': {
    params: [{key: 'content', label: 'URL 또는 텍스트', type: 'text', placeholder: 'https://example.com'}],
    resultType: 'image',
  },
  'barcode': {
    params: [{key: 'content', label: '바코드 내용', type: 'text', placeholder: '1234567890'}],
    resultType: 'image',
  },

  // 보안
  'bcrypt': {
    params: [
      {key: 'password', label: '비밀번호', type: 'text', placeholder: '해시할 비밀번호 입력'},
      {key: 'rounds', label: 'Rounds (강도)', type: 'select', options: ['10', '11', '12', '13'], default: '10'},
    ],
  },
  'rsa-key': {
    params: [
      {key: 'preset', label: '키 유형 / 크기', type: 'select', options: ['RSA-2048', 'RSA-4096', 'EC-256', 'EC-384', 'EC-521'], default: 'RSA-2048'},
    ],
  },
  'hmac': {
    params: [
      {key: 'text', label: '메시지', type: 'textarea', placeholder: 'HMAC 서명할 텍스트'},
      {key: 'key', label: '서명 키', type: 'text', placeholder: 'secret-key'},
      {key: 'algorithm', label: '알고리즘', type: 'select', options: ['HmacSHA256', 'HmacSHA512'], default: 'HmacSHA256'},
    ],
  },
  'aes': {
    params: [
      {key: 'text', label: '텍스트', type: 'textarea', placeholder: '암호화/복호화할 텍스트'},
      {key: 'key', label: 'AES 키', type: 'text', placeholder: '16·24·32자 키'},
      {key: 'mode', label: '모드', type: 'select', options: ['encrypt', 'decrypt'], default: 'encrypt'},
    ],
  },

  // 포맷터
  'sql-formatter': {
    params: [{key: 'sql', label: 'SQL', type: 'textarea', placeholder: 'SELECT * FROM users WHERE id = 1;'}],
  },
  'xml-formatter': {
    params: [
      {key: 'xml', label: 'XML', type: 'textarea', placeholder: '<root><item>1</item></root>'},
      {key: 'minify', label: '출력 형식', type: 'select', options: ['false', 'true'], default: 'false'},
    ],
  },
  'html-entity': {
    params: [
      {key: 'text', label: '텍스트', type: 'textarea', placeholder: '<div>hello & world</div>'},
      {key: 'mode', label: '모드', type: 'select', options: ['encode', 'decode'], default: 'encode'},
    ],
  },

  // 변환기
  'json-yaml': {
    params: [
      {key: 'input', label: '입력', type: 'textarea', placeholder: '{"key": "value"}'},
      {key: 'direction', label: '변환 방향', type: 'select', options: ['json-to-yaml', 'yaml-to-json'], default: 'json-to-yaml'},
    ],
  },
  'json-toml': {
    params: [
      {key: 'input', label: '입력', type: 'textarea', placeholder: '{"key": "value"}'},
      {key: 'direction', label: '변환 방향', type: 'select', options: ['json-to-toml', 'toml-to-json'], default: 'json-to-toml'},
    ],
  },
  'json-xml': {
    params: [
      {key: 'input', label: '입력', type: 'textarea', placeholder: '{"key": "value"}'},
      {key: 'direction', label: '변환 방향', type: 'select', options: ['json-to-xml', 'xml-to-json'], default: 'json-to-xml'},
    ],
  },
  'csv-json': {
    params: [
      {key: 'input', label: '입력', type: 'textarea', placeholder: 'name,age\nAlice,30'},
      {key: 'direction', label: '변환 방향', type: 'select', options: ['csv-to-json', 'json-to-csv'], default: 'csv-to-json'},
    ],
  },

  // 텍스트
  'text-diff': {
    params: [
      {key: 'original', label: '원본 텍스트', type: 'textarea', placeholder: '원본 텍스트 입력...'},
      {key: 'revised', label: '수정된 텍스트', type: 'textarea', placeholder: '수정된 텍스트 입력...'},
    ],
  },
  'regex-tester': {
    params: [
      {key: 'pattern', label: '정규식 패턴', type: 'text', placeholder: '[a-z]+'},
      {key: 'text', label: '테스트 텍스트', type: 'textarea', placeholder: '검사할 텍스트 입력...'},
    ],
  },
  'case-converter': {
    params: [
      {key: 'text', label: '텍스트', type: 'text', placeholder: 'myVariableName'},
      {key: 'from', label: 'From', type: 'select', options: ['camel', 'pascal', 'snake', 'kebab'], default: 'camel'},
      {key: 'to', label: 'To', type: 'select', options: ['camel', 'pascal', 'snake', 'kebab'], default: 'snake'},
    ],
  },

  // 네트워크
  'url-parser': {
    params: [{key: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com/path?q=1#hash'}],
  },
  'subnet-calc': {
    params: [{key: 'cidr', label: 'CIDR 표기', type: 'text', placeholder: '192.168.1.0/24'}],
  },
  'html-fetch': {
    params: [{key: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com'}],
  },

  // DevOps
  'cron': {
    params: [{key: 'expression', label: 'Cron 표현식', type: 'text', placeholder: '0 0 * * *'}],
  },
  'docker-compose': {
    params: [{key: 'command', label: 'docker run 명령어', type: 'textarea', placeholder: 'docker run -p 8080:8080 -e ENV=prod nginx'}],
  },

  // 유틸
  'totp': {
    params: [{key: 'secret', label: 'TOTP Secret (Base32)', type: 'text', placeholder: 'JBSWY3DPEHPK3PXP'}],
  },
}

// ── Heavy 모듈 CONFIGS ────────────────────────────────────────────────────

const HEAVY_CONFIGS: Record<string, ModuleConfig> = {
  'image-resize': {
    params: [
      {key: 'width', label: '너비 (px)', type: 'text', placeholder: '800', default: '800'},
      {key: 'height', label: '높이 (px)', type: 'text', placeholder: '600', default: '600'},
    ],
  },
  'image-format': {
    params: [
      {key: 'targetFormat', label: '출력 포맷', type: 'select', options: ['png', 'jpg'], default: 'png'},
    ],
  },
  'json-schema-to-dto': {
    params: [
      {key: 'packageName', label: '패키지명', type: 'text', placeholder: 'com.example', default: 'com.generated'},
    ],
    textInput: {
      label: 'JSON Schema 직접 입력',
      placeholder: '{\n  "type": "object",\n  "properties": {\n    "id": { "type": "integer" },\n    "name": { "type": "string" }\n  }\n}',
      filename: 'schema.json',
    },
  },
  'openapi-to-code': {
    params: [
      {key: 'language', label: '출력 언어', type: 'select', options: ['java', 'kotlin', 'typescript'], default: 'java'},
    ],
    textInput: {
      label: 'OpenAPI 스펙 직접 입력',
      placeholder: 'openapi: "3.0.0"\ninfo:\n  title: My API\n  version: "1.0"',
      filename: 'spec.yaml',
    },
  },
}

// ── 상태 ──────────────────────────────────────────────────────────────────

interface RunResult {
  url: string | null
  text: string | null
}

const route = useRoute()
const mod = ref<Module | null>(null)
const loading = ref(true)
const jobId = ref<string | null>(null)
const result = ref<RunResult | null>(null)
const runInput = ref('')
const formValues = ref<Record<string, string>>({})
const heavyFormValues = ref<Record<string, string>>({})
const heavyTextContent = ref('')
const running = ref(false)
const runError = ref('')
const copied = ref(false)

const moduleConfig = computed(() => mod.value ? MODULE_CONFIGS[mod.value.id] ?? null : null)
const heavyConfig = computed(() => mod.value ? HEAVY_CONFIGS[mod.value.id] ?? null : null)

const hasInput = computed(() => {
  if (moduleConfig.value) return Object.values(formValues.value).some(v => v !== '' && v !== undefined)
  return !!runInput.value
})

// ── 로드 & 초기화 ─────────────────────────────────────────────────────────

async function loadModule(moduleId: string) {
  loading.value = true
  mod.value = null
  resetAll()
  try {
    const {data} = await apiClient.get<Module[]>('/api/v1/modules')
    const allModules = normalizeApiModules(data)
    mod.value = allModules.find(m => m.id === moduleId) ?? null
  } catch {
    mod.value = MOCK_MODULES.find(m => m.id === moduleId) ?? null
  } finally {
    loading.value = false
    initForm()
  }
}

watch(() => route.params.moduleId as string, loadModule, {immediate: true})

function initForm() {
  const lc = mod.value ? MODULE_CONFIGS[mod.value.id] : undefined
  if (lc) {
    const v: Record<string, string> = {}
    for (const p of lc.params) v[p.key] = p.default ?? ''
    formValues.value = v
  }
  const hc = mod.value ? HEAVY_CONFIGS[mod.value.id] : undefined
  if (hc) {
    const v: Record<string, string> = {}
    for (const p of hc.params) v[p.key] = p.default ?? ''
    heavyFormValues.value = v
  }
}

// ── Heavy ─────────────────────────────────────────────────────────────────

function onUploaded(r: UploadResult) {
  jobId.value = r.jobId
}

async function uploadTextAsFile() {
  if (!mod.value || !heavyConfig.value?.textInput || !heavyTextContent.value.trim()) return
  const {filename} = heavyConfig.value.textInput
  const blob = new Blob([heavyTextContent.value], {type: 'text/plain'})
  const form = new FormData()
  form.append('files', new File([blob], filename))
  Object.entries(heavyFormValues.value).forEach(([k, v]) => { if (v) form.append(k, v) })
  const {data} = await apiClient.post<UploadResult>(`/api/v1/tools/${mod.value.id}/upload`, form)
  jobId.value = data.jobId
}

async function onDone(job: Job) {
  try {
    const {data} = await apiClient.get(`/api/v1/jobs/${job.id}/result`)
    result.value = {url: data.url ?? null, text: data.text ?? null}
  } catch {
    result.value = {url: null, text: '결과를 불러오지 못했습니다.'}
  }
}

function onFailed(_job: Job) {
  result.value = {url: null, text: '처리에 실패했습니다.'}
}

// ── Light ─────────────────────────────────────────────────────────────────

async function runLight() {
  if (running.value) return
  running.value = true
  runError.value = ''
  result.value = null
  try {
    let params: Record<string, string>
    if (moduleConfig.value) {
      params = {...formValues.value}
      // rsa-key: split "RSA-2048" → {keyType: "RSA", keySize: "2048"}
      if (mod.value?.id === 'rsa-key' && params.preset) {
        const [keyType, keySize] = params.preset.split('-')
        params = {keyType, keySize}
      }
    } else {
      try {
        params = JSON.parse(runInput.value)
      } catch {
        params = {input: runInput.value, text: runInput.value}
      }
    }
    const {data} = await apiClient.post(`/api/v1/tools/${mod.value?.id}/run`, params)
    result.value = {url: null, text: data.result ?? null}
  } catch {
    runError.value = '서버가 준비 중입니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    running.value = false
  }
}

function handleTextareaKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    runLight()
  }
}

async function copyResult() {
  const text = result.value?.text
  if (!text) return
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function downloadImage() {
  const text = result.value?.text
  if (!text) return
  const a = document.createElement('a')
  a.href = `data:image/png;base64,${text}`
  a.download = `${mod.value?.id ?? 'image'}.png`
  a.click()
}

// ── 리셋 ──────────────────────────────────────────────────────────────────

function resetAll() {
  jobId.value = null
  result.value = null
  runInput.value = ''
  runError.value = ''
  copied.value = false
  heavyTextContent.value = ''
  initForm()
}

function resetLight() {
  result.value = null
  runInput.value = ''
  runError.value = ''
  copied.value = false
  initForm()
}
</script>

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

    <!-- Gradient/Box-shadow 생성기 -->
    <div v-if="tab === 'gradient'" class="flex flex-col gap-3">
      <div class="flex gap-0.5 rounded-lg bg-muted p-0.5 w-fit">
        <button v-for="opt in [{ value: 'gradient', label: '그라디언트' }, { value: 'shadow', label: 'Box-shadow' }]" :key="opt.value"
                :class="cssMode === opt.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                class="rounded-md px-3 py-1 text-[12px] font-medium transition-colors"
                @click="cssMode = opt.value as CssMode">{{ opt.label }}
        </button>
      </div>

      <!-- 프리뷰 -->
      <div class="flex h-40 items-center justify-center overflow-hidden rounded-xl border border-border"
           :style="cssMode === 'gradient' ? {backgroundImage: gradientCss} : {boxShadow: shadowCss}">
        <div v-if="cssMode === 'shadow'" class="size-20 rounded-lg bg-card"/>
      </div>

      <!-- 그라디언트 레이어 -->
      <div v-if="cssMode === 'gradient'" class="flex flex-col gap-3">
        <div v-for="(layer, li) in gradientLayers" :key="li" class="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-medium text-muted-foreground">레이어 {{ li + 1 }}</span>
            <button v-if="gradientLayers.length > 1" class="text-muted-foreground/60 hover:text-destructive" @click="gradientLayers.splice(li, 1)">
              <X class="size-3.5"/>
            </button>
          </div>
          <label class="flex items-center gap-2 text-[11px] text-muted-foreground">
            각도
            <input v-model.number="layer.angleDeg" class="w-16 rounded-md border border-input bg-background px-2 py-1 text-[13px] text-foreground outline-none" max="360" min="0" type="number"/>
            deg
          </label>
          <div class="flex flex-wrap items-center gap-2">
            <div v-for="(_, ci) in layer.colors" :key="ci" class="flex items-center gap-1">
              <input v-model="layer.colors[ci]" class="size-7 cursor-pointer rounded border border-input bg-background" type="color"/>
              <input v-model="layer.colors[ci]" class="w-20 rounded-md border border-input bg-background px-1.5 py-1 font-mono text-[12px] text-foreground outline-none"/>
              <button v-if="layer.colors.length > 2" class="text-muted-foreground/60 hover:text-destructive" @click="layer.colors.splice(ci, 1)">
                <X class="size-3"/>
              </button>
            </div>
            <button class="rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground" @click="layer.colors.push('#000000')">
              + 색상
            </button>
          </div>
        </div>
        <button class="w-fit rounded-md border border-dashed border-border px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground"
                @click="gradientLayers.push({angleDeg: 90, colors: ['#ffffff', '#000000']})">
          + 레이어 추가
        </button>
      </div>

      <!-- Box-shadow 레이어 -->
      <div v-else class="flex flex-col gap-3">
        <div v-for="(layer, li) in shadowLayers" :key="li" class="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-medium text-muted-foreground">레이어 {{ li + 1 }}</span>
            <button v-if="shadowLayers.length > 1" class="text-muted-foreground/60 hover:text-destructive" @click="shadowLayers.splice(li, 1)">
              <X class="size-3.5"/>
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <label class="flex items-center gap-1.5">X <input v-model.number="layer.x" class="w-14 rounded-md border border-input bg-background px-1.5 py-1 text-[13px] text-foreground outline-none" type="number"/></label>
            <label class="flex items-center gap-1.5">Y <input v-model.number="layer.y" class="w-14 rounded-md border border-input bg-background px-1.5 py-1 text-[13px] text-foreground outline-none" type="number"/></label>
            <label class="flex items-center gap-1.5">Blur <input v-model.number="layer.blur" class="w-14 rounded-md border border-input bg-background px-1.5 py-1 text-[13px] text-foreground outline-none" min="0" type="number"/></label>
            <label class="flex items-center gap-1.5">Spread <input v-model.number="layer.spread" class="w-14 rounded-md border border-input bg-background px-1.5 py-1 text-[13px] text-foreground outline-none" type="number"/></label>
            <input v-model="layer.color" class="size-7 cursor-pointer rounded border border-input bg-background" type="color"/>
            <label class="flex items-center gap-1.5">
              <input v-model="layer.inset" class="accent-primary" type="checkbox"/>
              inset
            </label>
          </div>
        </div>
        <button class="w-fit rounded-md border border-dashed border-border px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground"
                @click="shadowLayers.push({x: 0, y: 0, blur: 0, spread: 0, color: '#000000'})">
          + 레이어 추가
        </button>
      </div>

      <!-- 결과 -->
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center justify-between border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">CSS</span>
          <button :class="cssCopied ? 'text-emerald-500' : 'text-muted-foreground/50 hover:text-foreground'"
                  class="rounded p-0.5 transition-colors" @click="copyCss">
            <Check v-if="cssCopied" class="size-3.5"/>
            <Copy v-else class="size-3.5"/>
          </button>
        </div>
        <pre class="overflow-auto p-3 font-mono text-[13px] text-foreground whitespace-pre-wrap break-all">{{ cssOutput }}</pre>
      </div>
    </div>

    <!-- 타이포그래피 스케일 -->
    <div v-else class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <label class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          기준 크기(px)
          <input v-model.number="baseSizePx" class="w-16 rounded-md border border-input bg-background px-2 py-1 text-[13px] text-foreground outline-none" min="1" type="number"/>
        </label>
        <label class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          배율
          <select class="rounded-md border border-input bg-background px-2 py-1 text-[13px] text-foreground outline-none" @change="onRatioPresetChange">
            <option value="">직접 입력</option>
            <option v-for="r in RATIO_PRESETS" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
          <input v-model.number="ratio" class="w-20 rounded-md border border-input bg-background px-2 py-1 text-[13px] text-foreground outline-none" step="0.001" type="number"/>
        </label>
        <label class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          아래 단계
          <input v-model.number="stepsDown" class="w-14 rounded-md border border-input bg-background px-2 py-1 text-[13px] text-foreground outline-none" max="10" min="0" type="number"/>
        </label>
        <label class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          위 단계
          <input v-model.number="stepsUp" class="w-14 rounded-md border border-input bg-background px-2 py-1 text-[13px] text-foreground outline-none" max="10" min="0" type="number"/>
        </label>
      </div>

      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">미리보기</span>
        </div>
        <div class="flex flex-col divide-y divide-border">
          <div v-for="s in typeScaleSteps" :key="s.step" class="flex items-center gap-3 px-3 py-2">
            <span class="w-24 shrink-0 font-mono text-[11px] text-muted-foreground">--font-size-{{ s.step }}</span>
            <span class="w-16 shrink-0 font-mono text-[11px] text-muted-foreground/70">{{ s.sizePx }}px</span>
            <span class="truncate text-foreground" :style="{fontSize: `${s.sizePx}px`}">가나다 Aa</span>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="flex h-9 items-center justify-between border-b border-border px-3">
          <span class="text-[11px] font-medium text-muted-foreground">CSS 커스텀 프로퍼티</span>
          <button :class="typeScaleCopied ? 'text-emerald-500' : 'text-muted-foreground/50 hover:text-foreground'"
                  class="rounded p-0.5 transition-colors" @click="copyTypeScaleCss">
            <Check v-if="typeScaleCopied" class="size-3.5"/>
            <Copy v-else class="size-3.5"/>
          </button>
        </div>
        <pre class="overflow-auto p-3 font-mono text-[13px] text-foreground whitespace-pre-wrap break-all">{{ typeScaleCssOutput }}</pre>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {Check, Copy, X} from 'lucide-vue-next'
import {buildBoxShadowCss, buildGradientCss, type GradientLayer, type ShadowLayer} from '../utils/cssGradient'
import {buildTypeScaleCss, computeTypeScale} from '../utils/typeScale'
import {clamp} from '../utils/clamp'

type TabId = 'gradient' | 'typescale'
type CssMode = 'gradient' | 'shadow'

const TABS: Array<{ id: TabId; label: string }> = [
  {id: 'gradient', label: 'Gradient/Box-shadow'},
  {id: 'typescale', label: '타이포그래피 스케일'},
]

const route = useRoute()
const router = useRouter()

const initialTab = typeof route.query.tab === 'string' && TABS.some(t => t.id === route.query.tab)
    ? route.query.tab as TabId
    : 'gradient'

const tab = ref<TabId>(initialTab)

watch(tab, id => {
  if (route.query.tab === id) return
  router.replace({query: {...route.query, tab: id}})
})

watch(() => route.query.tab, q => {
  if (typeof q === 'string' && q !== tab.value && TABS.some(t => t.id === q)) tab.value = q as TabId
})

async function copyWith(text: string, copiedFlag: { value: boolean }) {
  if (!text) return
  await navigator.clipboard.writeText(text)
  copiedFlag.value = true
  setTimeout(() => {
    copiedFlag.value = false
  }, 2000)
}

// ── Gradient/Box-shadow 탭 ──────────────────────────────
const cssMode = ref<CssMode>('gradient')

const gradientLayers = ref<GradientLayer[]>([
  {angleDeg: 90, colors: ['#6366f1', '#ec4899']},
])
const shadowLayers = ref<ShadowLayer[]>([
  {x: 0, y: 4, blur: 12, spread: 0, color: '#000000'},
])

const gradientCss = computed(() => buildGradientCss(gradientLayers.value))
const shadowCss = computed(() => buildBoxShadowCss(shadowLayers.value))

const cssOutput = computed(() =>
    cssMode.value === 'gradient'
        ? `background-image: ${gradientCss.value};`
        : `box-shadow: ${shadowCss.value};`,
)
const cssCopied = ref(false)

async function copyCss() {
  await copyWith(cssOutput.value, cssCopied)
}

// ── 타이포그래피 스케일 탭 ────────────────────────────────
const RATIO_PRESETS = [
  {value: 1.067, label: '1.067 (Minor Second)'},
  {value: 1.125, label: '1.125 (Major Second)'},
  {value: 1.2, label: '1.2 (Minor Third)'},
  {value: 1.25, label: '1.25 (Major Third)'},
  {value: 1.333, label: '1.333 (Perfect Fourth)'},
  {value: 1.5, label: '1.5 (Perfect Fifth)'},
  {value: 1.618, label: '1.618 (Golden Ratio)'},
]

const baseSizePxRaw = ref(16)
const baseSizePx = computed({
  get: () => baseSizePxRaw.value,
  set: v => {
    baseSizePxRaw.value = clamp(v, 1, 500)
  },
})
const ratio = ref(1.25)
const stepsDownRaw = ref(2)
const stepsDown = computed({
  get: () => stepsDownRaw.value,
  set: v => {
    stepsDownRaw.value = clamp(v, 0, 10)
  },
})
const stepsUpRaw = ref(4)
const stepsUp = computed({
  get: () => stepsUpRaw.value,
  set: v => {
    stepsUpRaw.value = clamp(v, 0, 10)
  },
})

function onRatioPresetChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value) ratio.value = Number(value)
}

const typeScaleSteps = computed(() => computeTypeScale(baseSizePx.value, ratio.value, stepsDown.value, stepsUp.value))
const typeScaleCssOutput = computed(() => buildTypeScaleCss(typeScaleSteps.value))
const typeScaleCopied = ref(false)

async function copyTypeScaleCss() {
  await copyWith(typeScaleCssOutput.value, typeScaleCopied)
}
</script>

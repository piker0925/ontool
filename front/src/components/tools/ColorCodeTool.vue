<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <div class="flex flex-col gap-1.5">
      <label class="text-[11px] font-medium text-muted-foreground">색상 (HEX / RGB / HSL)</label>
      <div class="flex items-center gap-2">
        <div class="relative size-9 shrink-0 overflow-hidden rounded-lg border border-border checkerboard">
          <div :style="{ backgroundColor: previewCss }" class="absolute inset-0"/>
          <input :value="pickerHex"
                 class="absolute inset-0 size-full cursor-pointer opacity-0"
                 type="color"
                 @input="onPickerInput"/>
        </div>
        <input v-model="colorInput"
               class="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-ring"
               placeholder="#ff0000, #ff000080, rgb(255, 0, 0), hsl(0, 100%, 50%)"
               type="text"
               @input="onTextInput"/>
      </div>
    </div>

    <div v-if="color" class="flex items-center gap-3">
      <label class="text-[11px] font-medium text-muted-foreground shrink-0">
        알파 {{ Math.round(alphaPercent) }}%
      </label>
      <input v-model.number="alphaPercent"
             class="flex-1 accent-primary"
             max="100" min="0" step="1" type="range"
             @input="onAlphaInput"/>
    </div>

    <div v-if="colorResult" class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div v-for="row in colorResult" :key="row.label" class="flex items-center justify-between">
        <span class="text-[11px] text-muted-foreground">{{ row.label }}</span>
        <div class="flex items-center gap-2">
          <span class="font-mono text-[13px] text-foreground">{{ row.value }}</span>
          <button class="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground"
                  @click="copyText(row.value)">
            <Copy class="size-3"/>
          </button>
        </div>
      </div>
    </div>

    <div v-if="contrastRows" class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <span class="text-[11px] font-medium text-muted-foreground">WCAG 대비 (텍스트 색으로 사용 시)</span>
      <div v-for="row in contrastRows" :key="row.label" class="flex items-center gap-3">
        <span :style="{ backgroundColor: row.bg, color: previewCss }"
              class="w-24 shrink-0 rounded-lg border border-border px-2 py-1 text-center text-[12px] font-medium">
          {{ row.label }}
        </span>
        <span class="font-mono text-[13px] text-foreground">{{ row.ratio }}:1</span>
        <div class="flex gap-1 ml-auto">
          <span :class="row.levels.aa ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'"
                class="rounded-full px-2 py-0.5 text-[10px] font-semibold">
            {{ row.levels.aa ? '✓' : '✗' }} AA
          </span>
          <span :class="row.levels.aaa ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'"
                class="rounded-full px-2 py-0.5 text-[10px] font-semibold">
            {{ row.levels.aaa ? '✓' : '✗' }} AAA
          </span>
          <span :class="row.levels.aaLarge ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'"
                class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                title="큰 텍스트(18pt+) AA 기준 3:1">
            {{ row.levels.aaLarge ? '✓' : '✗' }} AA-Large
          </span>
        </div>
      </div>
    </div>

    <p v-if="colorError" class="text-[11px] text-destructive/70">{{ colorError }}</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {Copy} from 'lucide-vue-next'
import {
  compositeOnBackground,
  contrastRatio,
  parseColor,
  type Rgba,
  rgbaToHex,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  wcagLevels,
} from '../../utils/frontendTools'

const colorInput = ref('')
const colorError = ref('')
const color = ref<Rgba | null>(null)
const alphaPercent = ref(100)

const previewCss = computed(() => {
  const c = color.value
  return c ? `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})` : 'transparent'
})

const pickerHex = computed(() => {
  const c = color.value
  return c ? rgbToHex(c.r, c.g, c.b) : '#000000'
})

const colorResult = computed(() => {
  const c = color.value
  if (!c) return null
  const {h, s, l} = rgbToHsl(c.r, c.g, c.b)
  const {h: hv, s: sv, v} = rgbToHsv(c.r, c.g, c.b)
  const opaque = c.a >= 1
  return [
    {label: 'HEX', value: rgbaToHex(c.r, c.g, c.b, c.a)},
    {
      label: opaque ? 'RGB' : 'RGBA',
      value: opaque ? `rgb(${c.r}, ${c.g}, ${c.b})` : `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`,
    },
    {
      label: opaque ? 'HSL' : 'HSLA',
      value: opaque ? `hsl(${h}, ${s}%, ${l}%)` : `hsla(${h}, ${s}%, ${l}%, ${c.a})`,
    },
    {label: 'HSV', value: `hsv(${hv}, ${sv}%, ${v}%)`},
  ]
})

const contrastRows = computed(() => {
  const c = color.value
  if (!c) return null
  const backgrounds = [
    {label: '흰 배경', bg: '#ffffff', rgb: {r: 255, g: 255, b: 255}},
    {label: '검정 배경', bg: '#000000', rgb: {r: 0, g: 0, b: 0}},
  ]
  return backgrounds.map(({label, bg, rgb}) => {
    // 반투명 색은 배경 위에 합성한 실제 표시 색으로 대비를 계산
    const effective = compositeOnBackground(c, rgb)
    const ratio = contrastRatio(effective, rgb)
    return {label, bg, ratio, levels: wcagLevels(ratio)}
  })
})

function applyColor(c: Rgba) {
  color.value = c
  alphaPercent.value = Math.round(c.a * 100)
  colorError.value = ''
}

function onTextInput() {
  colorError.value = ''
  if (!colorInput.value.trim()) {
    color.value = null
    return
  }
  try {
    applyColor(parseColor(colorInput.value))
  } catch (e) {
    color.value = null
    colorError.value = e instanceof Error ? e.message : '올바른 색상을 입력하세요.'
  }
}

function onPickerInput(event: Event) {
  const hex = (event.target as HTMLInputElement).value
  const {r, g, b} = parseColor(hex)
  const a = color.value?.a ?? 1
  applyColor({r, g, b, a})
  colorInput.value = rgbaToHex(r, g, b, a)
}

function onAlphaInput() {
  const c = color.value
  if (!c) return
  const a = Math.round(alphaPercent.value) / 100
  color.value = {...c, a}
  colorInput.value = rgbaToHex(c.r, c.g, c.b, a)
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
}

colorInput.value = '#6366f1'
onTextInput()
</script>

<style scoped>
.checkerboard {
  background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
  linear-gradient(-45deg, #ccc 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, #ccc 75%),
  linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
}
</style>

<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <div class="flex items-center gap-2 flex-wrap">
      <label class="text-[11px] font-medium text-muted-foreground">규칙</label>
      <div class="flex rounded-lg border border-border overflow-hidden">
        <button v-for="r in ruleOptions" :key="r.value"
                :class="rule === r.value ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'"
                class="px-3 py-1 text-[12px] font-medium transition-colors"
                @click="rule = r.value; generate()">{{ r.label }}
        </button>
      </div>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input v-model="useBaseColor" class="rounded accent-primary" type="checkbox" @change="generate"/>
        <span class="text-[12px] text-foreground">기준 색 지정</span>
      </label>
      <div v-if="useBaseColor" class="relative size-7 shrink-0 overflow-hidden rounded-lg border border-border">
        <div :style="{ backgroundColor: baseColor }" class="absolute inset-0"/>
        <input v-model="baseColor" class="absolute inset-0 size-full cursor-pointer opacity-0" type="color"
               @input="generate"/>
      </div>
      <span v-if="useBaseColor" class="font-mono text-[12px] text-muted-foreground">{{ baseColor }}</span>
    </div>
    <div class="flex flex-col gap-2">
      <div v-for="(hex, i) in palette" :key="i"
           class="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
        <span :style="{ backgroundColor: hex }" class="size-9 shrink-0 rounded-lg border border-border/50"/>
        <span class="flex-1 font-mono text-[13px] text-foreground">{{ hex }}</span>
        <button class="rounded p-1 transition-colors text-muted-foreground/50 hover:text-foreground"
                @click="copySwatch(hex, i)">
          <Copy class="size-3.5"/>
        </button>
        <span v-if="copiedIndex === i"
              class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">복사됨</span>
      </div>
      <p v-if="palette.length === 0" class="text-[12px] text-muted-foreground py-2">생성 버튼을 클릭하세요</p>
    </div>
    <button
        class="rounded-xl bg-primary py-2.5 text-[14px] font-semibold text-primary-foreground transition-colors hover:opacity-90"
        @click="generate">
      팔레트 생성
    </button>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {Copy} from 'lucide-vue-next'
import {generatePalette, type PaletteRule} from '../../utils/randomPalette'

const ruleOptions: { value: PaletteRule; label: string }[] = [
  {value: 'complementary', label: '보색'},
  {value: 'analogous', label: '유사색'},
  {value: 'triadic', label: '삼색조'},
  {value: 'monochromatic', label: '모노톤'},
]

const rule = ref<PaletteRule>('complementary')
const palette = ref<string[]>([])
const copiedIndex = ref<number | null>(null)
const useBaseColor = ref(false)
const baseColor = ref('#3366cc')
let copyTimer: ReturnType<typeof setTimeout> | undefined

function generate() {
  palette.value = generatePalette(rule.value, useBaseColor.value ? baseColor.value : undefined)
  copiedIndex.value = null
}

async function copySwatch(hex: string, index: number) {
  await navigator.clipboard.writeText(hex)
  copiedIndex.value = index
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copiedIndex.value = null), 2000)
}

generate()
</script>
